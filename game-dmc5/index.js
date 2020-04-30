const Promise = require('bluebird');
const path = require('path');
const murmur3 = require('./murmur3');
const cache = require('./cache');
const { app, remote } = require('electron');
const uniApp = app || remote.app;

const { actions, fs, log, selectors, util } = require('vortex-api');

// Expected file name for the qbms script.
const BMS_SCRIPT = path.join(__dirname, 'dmc5_pak_unpack.bms');

// Invalidation qbms script - this script relies on a filtered.list
//  file to be generated.
const INVAL_SCRIPT = 'dmc5_pak_invalidate.bms';

// Revalidation qbms script - this script relies on a invalcache.file
//  file to be generated and placed next to the input archive.
const REVAL_SCRIPT = path.join(__dirname, 'dmc5_pak_revalidate.bms');

// DMC5 filenames are encrypted. The list file contains
//  the actual filenames mapped against their murmur3 hash.
const ORIGINAL_FILE_LIST = path.join(__dirname, 'dmc5_pak_names_release.list');

let _FILE_LIST;

let FILE_CACHE = [];

// QBMS temporary folder within Vortex's appdata folder.
const QBMS_TEMP_PATH = path.join(uniApp.getPath('userData'), 'temp', 'qbms');

// DMC5 requires us to invalidate/zero-out file entries within
//  the game's pak file; the filtered.list file is generated
//  using the full file list.
const FILTERED_LIST = path.join(QBMS_TEMP_PATH, 'filtered.list');

// Regex pattern used to identify installed DLCs
const DLC_FOLDER_RGX = /^\d+$/gm;

const NATIVES_DIR = 'natives' + path.sep;
const GAME_PAK_FILE = 're_chunk_000.pak';
const DLC_PAK_FILE = 're_dlc_000.pak';
const GAME_ID = 'devilmaycry5';
const STEAM_ID = 601150;

const ACTIVITY_INVAL = 'invalidations';
const ACTIVITY_REVAL = 'revalidations';

function getFileListCache() {
  return (FILE_CACHE.length > 0)
    ? Promise.resolve(FILE_CACHE)
    : fs.readFileAsync(_FILE_LIST, { encoding: 'utf-8' })
      .then(data => {
        FILE_CACHE = data.split('\n');
        return Promise.resolve(FILE_CACHE);
      });
}

function addToFileList(files) {
  return getFileListCache().then(cache => {
    const fileList = files.filter(file =>
      cache.find(cached => cached.indexOf(file) !== -1) === undefined);

    const lines = fileList.reduce((accumulator, file) => {
      const hashVal = murmur3.getMurmur3Hash(file);
      accumulator.push(hashVal + ' ' + file);
      return accumulator;
    }, []);

    const data = (!!FILE_CACHE[FILE_CACHE.length - 1])
      ? '\n' + lines.join('\n')
      : lines.join('\n');

    return fs.writeFileAsync(_FILE_LIST, data, { encoding: 'utf-8', flag: 'a' })
      .then(() => { FILE_CACHE = FILE_CACHE.concat(lines); })
    })
}

function findGame() {
  return util.steam.findByAppId(STEAM_ID.toString())
    .then(game => game.gamePath);
}

function prepareForModding(discovery, api) {
  const displayInformation = () => api.sendNotification({
    type: 'warn',
    message: 'Important Information regarding DMC 5 Modding',
    noDismiss: true,
    actions: [
      { title: 'More', action: (dismiss) => 
        api.showDialog('info', 'Important Information regarding DMC 5 Modding', {
          bbcode: 'Before you start modding Devil May Cry 5 please note that Vortex will need to '
                + 'modify your game archives directly.<br/><br/>'
                + 'Vortex will be invalidating and revalidating file paths during mod deployment/purge or any time '
                + 'you click the "Invalidate Paths" button in the "Mods" section.<br/><br/>'
                + 'For the best modding experience - and to avoid conflicts - please ensure the following:<br/><br/>'
                + '1. Only use Vortex to install mods on a fresh, legitimate, vanilla (i.e. unmodified) copy of the game.<br/>'
                + '2. DO NOT use any other modding tools alongside Vortex to mod the game as that can lead to your game ' 
                + 'archives becoming corrupted - making a reinstallation necessary.<br/>'
                + '3. It is necessary for you to click the "Invalidate Paths" button in the mods section after every time ' 
                + 'the game is updated to ensure that your mods will work correctly.<br/><br/>'
                + '[url=https://wiki.nexusmods.com/index.php/Modding_Devil_May_Cry_5_with_Vortex]Modding Devil May Cry 5 with Vortex[/url]'
        }, [ { label: 'Close', action: () => dismiss() } ])
      },
    ],
  });

  const state = api.store.getState();
  const installedMods = util.getSafe(state, ['persistent', 'mods', GAME_ID]) || {};
  let downloads = util.getSafe(state, ['persistent', 'downloads', 'files']) || {};
  downloads = Object.keys(downloads).map(key => downloads[key]);
  const hasdmc5downloads = downloads.find(downl => {
    return (!!downl.game)
      ? new Set(downl.game).has(GAME_ID)
      : undefined;
  }) !== undefined;

  if ((Object.keys(installedMods).length == 0) && !hasdmc5downloads) {
    displayInformation();
  }

  return ensureListBackup(state).then(() => fs.ensureDirWritableAsync(
    path.join(discovery.path, 'natives'), () => Promise.resolve()));
}

function ensureListBackup(state) {
  const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  _FILE_LIST = path.join(stagingFolder, path.basename(ORIGINAL_FILE_LIST));
  return fs.statAsync(_FILE_LIST)
    .then(() => Promise.resolve()) // Backup already present.
    .catch(err => fs.copyAsync(ORIGINAL_FILE_LIST, _FILE_LIST));
}

function testArchive(files, discoveryPath, archivePath, api) {
  return new Promise((resolve, reject) => {
    return api.events.emit('quickbms-operation', BMS_SCRIPT,
    archivePath, discoveryPath, 'list', { wildCards: files }, (err, data) => {
      const theFiles = (data !== undefined)
        ? data.map(file => file.filePath)
        : [];
      return (err !== undefined)
        ? reject(err)
        : (theFiles.length > 0)
            ? resolve(theFiles)
            : reject(new util.NotFound('Files not found'))
    })
  })
}

async function findArchiveFile(files, discoveryPath, api) {
  let archivePath = path.join(discoveryPath, GAME_PAK_FILE);
  // We're going to check the main game file first.
  return testArchive(files, discoveryPath, archivePath, api)
    .then(data => Promise.resolve({
      arcPath: GAME_PAK_FILE,
      data
    }))
    .catch(util.NotFound, () => fs.readdirAsync(discoveryPath)
      .then(entries => {
        let found;
        const installedDLC = entries.filter(entry => entry.match(DLC_FOLDER_RGX));
        return Promise.each(installedDLC, dlc => {
          archivePath = path.join(discoveryPath, dlc, DLC_PAK_FILE);
          return (found !== undefined)
          ? Promise.resolve()
          : testArchive(files, discoveryPath, archivePath, api)
            .then(data => {
              found = {
                arcPath: path.join(dlc, DLC_PAK_FILE),
                data
              }
              return Promise.resolve();
            })
            .catch(util.NotFound, () => Promise.resolve());
        })
        .then(() => found)
      }));
}

async function installQBMS(files, destinationPath, gameId, progressDelegate) {
  const rootPath = files.find(file => file.endsWith(NATIVES_DIR));
  const idx = rootPath.length - NATIVES_DIR.length;
  // Remove directories and anything that isn't in the rootPath.
  let filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1)
      && (!file.endsWith(path.sep))));

  filtered = filtered.map(file => {
    return {
      source: file,
      destination: file.substr(idx),
    };
  });

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file.source,
      destination: file.destination,
    }
  });

  // Create the wildcards quickBMS is going to use to filter/find
  //  list matches.
  const wildCards = filtered.map(fileEntry =>
    fileEntry.destination.replace(/\\/g, '/'));
  return addToFileList(wildCards)
    .then(() => Promise.resolve({ instructions }));
}

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID)
    && (files.find(file => file.indexOf(NATIVES_DIR) !== -1) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function getDiscoveryPath(api) {
  const store = api.store;
  const state = store.getState();
  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if ((discovery === undefined) || (discovery.path === undefined)) {
    log('error', 'devilmaycry5 was not discovered');
    return undefined;
  }

  return discovery.path;
}

function generateFilteredList(files) {
  return fs.ensureDirAsync(QBMS_TEMP_PATH)
    .then(() => getFileListCache())
    .then(cache => {
      const filtered = [];
      files.forEach(file => {
        const found = cache.find(entry => entry.indexOf(file) !== -1);
        if (found !== undefined) {
          filtered.push(found);
        }
      });

      return removeFilteredList().then(() =>
        fs.writeFileAsync(FILTERED_LIST, filtered.join('\n')));
    });
}

function walkAsync(dir) {
  let entries = [];
  return fs.readdirAsync(dir).then(files => {
    return Promise.map(files, file => {
      const fullPath = path.join(dir, file);
      return fs.statAsync(fullPath).then(stats => {
        if (stats.isDirectory()) {
          return walkAsync(fullPath)
            .then(nestedFiles => {
              entries = entries.concat(nestedFiles);
              return Promise.resolve();
            })
        } else {
          entries.push(fullPath);
          return Promise.resolve();
        }
      });
    });
  })
  .then(() => Promise.resolve(entries));
}

function removeFilteredList() {
  return fs.removeAsync(FILTERED_LIST)
    .catch(err => (err.code === 'ENOENT') 
      ? Promise.resolve()
      : Promise.reject(err));
}

function filterOutInvalidated(wildCards, stagingFolder) {
  // We expect all wildCards to be invalidated within the same archive.
  const entries = wildCards.map(entry => { return { hash: murmur3.getMurmur3Hash(entry), filePath: entry } });
  return cache.findArcKeys(stagingFolder, entries.map(entry => entry.hash))
    .then(arcMap => {
      if (arcMap === undefined) {
        // None of the entries have been invalidated.
        return Promise.resolve(wildCards);
      }

      // Look up existing invalidations.
      const mapKeys = Object.keys(arcMap).filter(key =>
        entries.find(entry =>
          arcMap[key].indexOf(entry.hash) !== -1) !== undefined);

      let flat = [];
      mapKeys.forEach(key => {
        flat = flat.concat(arcMap[key]);
      });

      const filtered = entries.reduce((accumulator, entry) => {
        if (flat.find(mapEntry => mapEntry === entry.hash) === undefined) {
            accumulator.push(entry.filePath);
          }
          return accumulator;
      }, []);

      return filtered.length > 0
        ? Promise.resolve(filtered)
        : Promise.reject(new Error('All entries invalidated'));
    })
}

function revalidateFilePaths(hashes, api) {
  const discoveryPath = getDiscoveryPath(api);
  const state = api.store.getState();
  const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  return cache.findArcKeys(stagingFolder, hashes)
    .then(arcMap => {
      if (arcMap === undefined) {
        return Promise.reject(new Error('Failed to map hashes to their corresponding archive keys'));
      }

      let error;
      const keys = Object.keys(arcMap);
      return Promise.each(keys, key => {
        if (arcMap[key].length === 0) {
          return Promise.resolve();
        }

        const arcRelPath = (key === '_native')
          ? GAME_PAK_FILE
          : path.join(key.substr(1), DLC_PAK_FILE);
        const archivePath = path.join(discoveryPath, arcRelPath);
        return cache.getInvalEntries(stagingFolder, arcMap[key], key)
          .then(entries => cache.writeInvalEntries(discoveryPath, entries))
          .then(() => new Promise((resolve) => {
            api.events.emit('quickbms-operation', REVAL_SCRIPT,
              archivePath, discoveryPath, 'write', {}, (err) => {
                error = err;
                return resolve();
              });
          }))
          .then(() => (error === undefined)
            ? Promise.resolve()
            : Promise.reject(new Error('Failed to re-validate filepaths')))
          .then(() => cache.removeOffsets(stagingFolder, arcMap[key], key));
      });
    });
}

function copyToTemp(fileName) {
  const originalFile = path.join(__dirname, fileName);
  return fs.statAsync(originalFile)
    .then(() => fs.ensureDirAsync(QBMS_TEMP_PATH))
    .then(() => fs.copyAsync(originalFile, path.join(QBMS_TEMP_PATH, fileName)))
}

function removeFromTemp(fileName) {
  const filePath = path.join(QBMS_TEMP_PATH, fileName);
  return fs.removeAsync(filePath)
    .catch(err => (err.code === 'ENOENT')
      ? Promise.resolve()
      : Promise.reject(err))
}

function invalidateFilePaths(wildCards, api, force = false) {
  const reportIncompleteList = () => {
    api.showErrorNotification('Missing filepaths in game archives',
      'Unfortunately Vortex cannot install this mod correctly as it seems to include one or more '
      + 'unrecognized files.<br/><br/>'
      + 'This can happen when:<br/>'
      + '1. Your game archives do not include the files required for this mod to work (Possibly missing DLC)<br/>'
      + '2. The mod author has packed his mod incorrectly and has included files inside the "natives" folder '
      + 'which were never supposed to be there.<br/><br/>'
      + 'To report this issue, please use the feedback system and make sure you attach Vortex\'s latest log file '
      + 'so we can review the missing files',
      { isBBCode: true, allowReport: false })
  };

  // For the invalidation logic to work correctly all
  //  wildCards MUST belong to the same game archive/mod.
  const discoveryPath = getDiscoveryPath(api);
  const state = api.store.getState();
  const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  const filterPromise = (force)
    ? Promise.resolve(wildCards)
    : filterOutInvalidated(wildCards, stagingFolder);

  return filterPromise.then(filtered => addToFileList(filtered).then(() => findArchiveFile(filtered, discoveryPath, api))
    .then(res => {
      if (res === undefined || res.arcPath === undefined) {
        const invalidationsExist = filtered.length !== wildCards.length;
        // A difference between the filtered and wildcards suggests
        //  that there is a high chance we're installing the same mod
        //  and the mod author may have included a .txt file or some other
        //  unnecessary file inside the mod's natives folder, in which case this is
        //  not a problem - log the missing files and keep going.
        log(invalidationsExist ? 'warn' : 'error', 'Missing filepaths in game archive', filtered.join('\n'));
        return (invalidationsExist)
          ? Promise.resolve()
          : Promise.reject(new util.NotFound('Failed to match mod files to game archives'));
      }
      const arcKey = (res.arcPath === GAME_PAK_FILE)
        ? '_native'
        : '_' + path.dirname(res.arcPath);
      const data = res.data;
      const quickbmsOpts = {
        keepTemporaryFiles: true,
      }
      let error;
      const archivePath = path.join(discoveryPath, res.arcPath);
      return generateFilteredList(data)
        .then(() => copyToTemp(INVAL_SCRIPT))
        .then(() => new Promise((resolve) => {
          api.events.emit('quickbms-operation', path.join(QBMS_TEMP_PATH, INVAL_SCRIPT),
            archivePath, discoveryPath, 'write', quickbmsOpts, err => {
              error = err;
              return resolve();
            })
        }))
        .then(() => (error === undefined)
          ? cache.readNewInvalEntries(path.join(discoveryPath, 'TEMPORARY_FILE'))
              .then(entries => cache.insertOffsets(stagingFolder, entries, arcKey))
          : Promise.reject(error));
    }))
    .catch(util.NotFound, () => reportIncompleteList())
    .catch(util.UserCanceled, () => api.sendNotification({
      type: 'info',
      message: 'Invalidation canceled by user',
      displayMS: 5000,
    }))
    .catch(err => err.message.indexOf('All entries invalidated') !== -1
      ? Promise.resolve()
      : api.showErrorNotification('Invalidation failed', err))
    .finally(() => removeFromTemp(INVAL_SCRIPT)
      .then(() => removeFilteredList()))
}

const FLUFFY_FILES = ['fmodex64.dll', 'Modmanager.exe'];
function fluffyManagerTest(files, gameId) {
  const matcher = (file => FLUFFY_FILES.includes(file));
  const supported = ((gameId === GAME_ID) && (files.filter(matcher).length > 0));

  return Promise.resolve({ supported, requiredFiles: FLUFFY_FILES });
}

function fluffyDummyInstaller(context, files) {
  context.api.showErrorNotification('Invalid Mod', 'It looks like you tried to install '
    + 'Fluffy Manager 5000, which is a standalone mod manager and not a mod for Devil May Cry 5.\n\n'
    + 'Fluffy Manager and Vortex cannot be used together and doing so will break your game. Please '
    + 'use only one of these apps to manage mods for Devil May Cry 5.');
  return Promise.reject(new util.ProcessCanceled('Invalid mod'));
}

function main(context) {
  context.requireExtension('quickbms-support');
  context.registerGame({
    id: GAME_ID,
    name: 'Devil May Cry 5',
    logo: 'gameart.jpg',
    mergeMods: true,
    queryPath: findGame,
    queryModPath: () => '.',
    executable: () => 'DevilMayCry5.exe',
    requiredFiles: ['DevilMayCry5.exe'],
    details: {
      steamAppId: STEAM_ID,
    },
    setup: (discovery) => prepareForModding(discovery, context.api),
  });

  context.registerInstaller('dmc5fluffyquack', 20, fluffyManagerTest, (files) => fluffyDummyInstaller(context, files));
  context.registerInstaller('dmc5qbmsmod', 25, testSupportedContent, installQBMS);

  context.registerAction('mod-icons', 500, 'savegame', {}, 'Invalidate Paths', () => {
    const store = context.api.store;
    const state = store.getState();
    const gameMode = selectors.activeGameId(state);
    if (gameMode !== GAME_ID) {
      return false;
    }

    const stagingFolder = selectors.installPathForGame(state, GAME_ID);
    store.dispatch(actions.startActivity('mods', ACTIVITY_INVAL));
    const installedMods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
    const mods = Object.keys(installedMods);
    return Promise.each(mods, mod => {
      const modFolder = path.join(stagingFolder, mod);
      return walkAsync(modFolder)
        .then(entries => {
          const relFilePaths = entries.map(entry => entry.replace(modFolder + path.sep, ''));
          const wildCards = relFilePaths.map(fileEntry => fileEntry.replace(/\\/g, '/'))
          return invalidateFilePaths(wildCards, context.api, true)
            .then(() => store.dispatch(actions.setDeploymentNecessary(GAME_ID, true)));
        })
    })
    .finally(() => { store.dispatch(actions.stopActivity('mods', ACTIVITY_INVAL)); })
  }, () => {
    const state = context.api.store.getState();
    const gameMode = selectors.activeGameId(state);
    return (gameMode === GAME_ID)
  });

  context.once(() => {
    let previousDeployment;
    context.api.onAsync('will-deploy', (profileId, deployment) => {
      const state = context.api.store.getState();
      const profile = selectors.profileById(state, profileId);
      if (GAME_ID !== profile.gameId) {
        return Promise.resolve();
      }
      previousDeployment = deployment[''].map(iter => iter.relPath);
      return Promise.resolve();
    });

    context.api.onAsync('did-deploy', (profileId, deployment) => {
      const api = context.api;
      const store = context.api.store;
      const state = store.getState();
      const profile = selectors.profileById(state, profileId);

      if (GAME_ID !== profile.gameId) {
        return Promise.resolve();
      }
      const newDeployment = new Set(deployment[''].map(iter => iter.relPath));
      const removed = previousDeployment.filter(iter => !newDeployment.has(iter));
      if (removed.length > 0) {
        store.dispatch(actions.startActivity('mods', ACTIVITY_REVAL));
        const wildCards = removed.map(fileEntry =>
          fileEntry.replace(/\\/g, '/'));

        const hashes = wildCards.map(entry => murmur3.getMurmur3Hash(entry));
        return revalidateFilePaths(hashes, api)
          .finally(() => { store.dispatch(actions.stopActivity('mods', ACTIVITY_REVAL)); });
      }
      return Promise.resolve();
    });

    context.api.onAsync('bake-settings', (gameId, mods) => {
      if (gameId === GAME_ID) {
        const store = context.api.store;
        const state = store.getState();
        const stagingFolder = selectors.installPathForGame(state, GAME_ID);
        store.dispatch(actions.startActivity('mods', ACTIVITY_INVAL));
        return Promise.each(mods, mod => {
          const modFolder = path.join(stagingFolder, mod.installationPath);
          return walkAsync(modFolder)
            .then(entries => {
              const relFilePaths = entries.map(entry => entry.replace(modFolder + path.sep, ''));
              const wildCards = relFilePaths.map(fileEntry => fileEntry.replace(/\\/g, '/'))
              return invalidateFilePaths(wildCards, context.api);
            })
        })
        .finally(() => {
          store.dispatch(actions.stopActivity('mods', ACTIVITY_INVAL));
          return Promise.resolve();
        })
      }
    });

    context.api.events.on('purge-mods', () => {
      const api = context.api;
      const store = api.store;
      const state = store.getState();
      const activeGameId = selectors.activeGameId(state);
      if (activeGameId !== GAME_ID){
        return Promise.resolve();
      }

      const stagingFolder = selectors.installPathForGame(state, GAME_ID);
      store.dispatch(actions.startActivity('mods', ACTIVITY_REVAL));
      const installedMods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
      const mods = Object.keys(installedMods);
      return Promise.each(mods, mod => {
        const modFolder = path.join(stagingFolder, mod);
        return walkAsync(modFolder)
          .then(entries => {
            const relFilePaths = entries.map(entry => entry.replace(modFolder + path.sep, ''));
            const wildCards = relFilePaths.map(fileEntry => fileEntry.replace(/\\/g, '/'))
            return revalidateFilePaths(wildCards.map(entry => murmur3.getMurmur3Hash(entry)), context.api);
          })
          .catch(util.UserCanceled, () => api.sendNotification({
            type: 'info',
            message: 'Re-validation canceled by user',
            displayMS: 5000,
          }))
          .catch(err => null);
      })
      .finally(() => {
        store.dispatch(actions.stopActivity('mods', ACTIVITY_REVAL));
        return Promise.resolve();
      })
    });
  });
}

module.exports = {
  default: main
};