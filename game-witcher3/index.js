"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBlue = void 0;
const bluebird_1 = __importDefault(require("bluebird"));
const libxmljs_1 = require("libxmljs");
const path_1 = __importDefault(require("path"));
const react_1 = __importDefault(require("react"));
const BS = __importStar(require("react-bootstrap"));
const vortex_api_1 = require("vortex-api");
const IniParser = __importStar(require("vortex-parse-ini"));
const winapi_bindings_1 = __importDefault(require("winapi-bindings"));
const collections_1 = require("./collections/collections");
const CollectionsDataView_1 = __importDefault(require("./views/CollectionsDataView"));
const menumod_1 = __importDefault(require("./menumod"));
const scriptmerger_1 = require("./scriptmerger");
const common_1 = require("./common");
const tests_1 = require("./tests");
const modLimitPatch_1 = require("./modLimitPatch");
const iconbarActions_1 = require("./iconbarActions");
const priorityManager_1 = require("./priorityManager");
const installers_1 = require("./installers");
const mergeBackup_1 = require("./mergeBackup");
const mergeInventoryParsing_1 = require("./mergeInventoryParsing");
const actions_1 = require("./actions");
const reducers_1 = require("./reducers");
const GOG_ID = '1207664663';
const GOG_ID_GOTY = '1495134320';
const STEAM_ID = '499450';
const CONFIG_MATRIX_REL_PATH = path_1.default.join('bin', 'config', 'r4game', 'user_config_matrix', 'pc');
let _INI_STRUCT = {};
let _PREVIOUS_LO = {};
const tools = [
    {
        id: common_1.SCRIPT_MERGER_ID,
        name: 'W3 Script Merger',
        logo: 'WitcherScriptMerger.jpg',
        executable: () => 'WitcherScriptMerger.exe',
        requiredFiles: [
            'WitcherScriptMerger.exe',
        ],
    },
];
function writeToModSettings() {
    const filePath = (0, common_1.getLoadOrderFilePath)();
    const parser = new IniParser.default(new IniParser.WinapiFormat());
    return vortex_api_1.fs.removeAsync(filePath)
        .then(() => vortex_api_1.fs.writeFileAsync(filePath, '', { encoding: 'utf8' }))
        .then(() => parser.read(filePath))
        .then(ini => {
        return bluebird_1.default.each(Object.keys(_INI_STRUCT), (key) => {
            var _a;
            if (((_a = _INI_STRUCT === null || _INI_STRUCT === void 0 ? void 0 : _INI_STRUCT[key]) === null || _a === void 0 ? void 0 : _a.Enabled) === undefined) {
                return Promise.resolve();
            }
            ini.data[key] = {
                Enabled: _INI_STRUCT[key].Enabled,
                Priority: _INI_STRUCT[key].Priority,
                VK: _INI_STRUCT[key].VK,
            };
            return Promise.resolve();
        })
            .then(() => parser.write(filePath, ini));
    })
        .catch(err => (err.path !== undefined && ['EPERM', 'EBUSY'].includes(err.code))
        ? Promise.reject(new common_1.ResourceInaccessibleError(err.path))
        : Promise.reject(err));
}
function createModSettings() {
    const filePath = (0, common_1.getLoadOrderFilePath)();
    return vortex_api_1.fs.ensureDirWritableAsync(path_1.default.dirname(filePath))
        .then(() => vortex_api_1.fs.writeFileAsync(filePath, '', { encoding: 'utf8' }));
}
function ensureModSettings() {
    const filePath = (0, common_1.getLoadOrderFilePath)();
    const parser = new IniParser.default(new IniParser.WinapiFormat());
    return vortex_api_1.fs.statAsync(filePath)
        .then(() => parser.read(filePath))
        .catch(err => (err.code === 'ENOENT')
        ? createModSettings().then(() => parser.read(filePath))
        : Promise.reject(err));
}
function getManuallyAddedMods(context) {
    return __awaiter(this, void 0, void 0, function* () {
        return ensureModSettings().then(ini => {
            const state = context.api.store.getState();
            const mods = vortex_api_1.util.getSafe(state, ['persistent', 'mods', common_1.GAME_ID], {});
            const modKeys = Object.keys(mods);
            const iniEntries = Object.keys(ini.data);
            const manualCandidates = [].concat(iniEntries, [common_1.UNI_PATCH]).filter(entry => {
                const hasVortexKey = vortex_api_1.util.getSafe(ini.data[entry], ['VK'], undefined) !== undefined;
                return ((!hasVortexKey) || (ini.data[entry].VK === entry) && !modKeys.includes(entry));
            }) || [common_1.UNI_PATCH];
            return Promise.resolve(new Set(manualCandidates));
        })
            .then(uniqueCandidates => {
            const state = context.api.store.getState();
            const discovery = vortex_api_1.util.getSafe(state, ['settings', 'gameMode', 'discovered', common_1.GAME_ID], undefined);
            if ((discovery === null || discovery === void 0 ? void 0 : discovery.path) === undefined) {
                return Promise.reject(new vortex_api_1.util.ProcessCanceled('Game is not discovered!'));
            }
            const modsPath = path_1.default.join(discovery.path, 'Mods');
            return bluebird_1.default.reduce(Array.from(uniqueCandidates), (accum, mod) => {
                const modFolder = path_1.default.join(modsPath, mod);
                return vortex_api_1.fs.statAsync(path_1.default.join(modFolder))
                    .then(() => new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    let candidates = [];
                    yield require('turbowalk').default(path_1.default.join(modsPath, mod), entries => {
                        candidates = [].concat(candidates, entries.filter(entry => (!entry.isDirectory)
                            && (path_1.default.extname(path_1.default.basename(entry.filePath)) !== '')
                            && ((entry === null || entry === void 0 ? void 0 : entry.linkCount) === undefined || entry.linkCount <= 1)));
                    })
                        .catch(err => (['ENOENT', 'ENOTFOUND'].indexOf(err.code) !== -1)
                        ? null
                        : Promise.reject(err));
                    const mapped = yield bluebird_1.default.map(candidates, cand => vortex_api_1.fs.statAsync(cand.filePath)
                        .then(stats => stats.isSymbolicLink()
                        ? Promise.resolve(undefined)
                        : Promise.resolve(cand.filePath))
                        .catch(err => Promise.resolve(undefined)));
                    return resolve(mapped);
                })))
                    .then((files) => {
                    if (files.filter(file => !!file).length > 0) {
                        accum.push(mod);
                    }
                    return Promise.resolve(accum);
                })
                    .catch(err => ((err.code === 'ENOENT') && (err.path === modFolder))
                    ? Promise.resolve(accum)
                    : Promise.reject(err));
            }, []);
        })
            .catch(err => {
            const userCanceled = (err instanceof vortex_api_1.util.UserCanceled);
            const processCanceled = (err instanceof vortex_api_1.util.ProcessCanceled);
            const allowReport = (!userCanceled && !processCanceled);
            const details = userCanceled
                ? 'Vortex tried to scan your W3 mods folder for manually added mods but '
                    + 'was blocked by your OS/AV - please make sure to fix this before you '
                    + 'proceed to mod W3 as your modding experience will be severely affected.'
                : err;
            context.api.showErrorNotification('Failed to lookup manually added mods', details, { allowReport });
            return Promise.resolve([]);
        });
    });
}
function findGame() {
    try {
        const instPath = winapi_bindings_1.default.RegGetValue('HKEY_LOCAL_MACHINE', 'Software\\CD Project Red\\The Witcher 3', 'InstallFolder');
        if (!instPath) {
            throw new Error('empty registry key');
        }
        return bluebird_1.default.resolve(instPath.value);
    }
    catch (err) {
        return vortex_api_1.util.GameStoreHelper.findByAppId([GOG_ID_GOTY, GOG_ID, STEAM_ID])
            .then(game => game.gamePath);
    }
}
function testSupportedTL(files, gameId) {
    const supported = (gameId === 'witcher3')
        && (files.find(file => file.toLowerCase().split(path_1.default.sep).indexOf('mods') !== -1) !== undefined);
    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}
function installTL(files, destinationPath, gameId, progressDelegate) {
    let prefix = files.reduce((prev, file) => {
        const components = file.toLowerCase().split(path_1.default.sep);
        const idx = components.indexOf('mods');
        if ((idx > 0) && ((prev === undefined) || (idx < prev.length))) {
            return components.slice(0, idx);
        }
        else {
            return prev;
        }
    }, undefined);
    prefix = (prefix === undefined) ? '' : prefix.join(path_1.default.sep) + path_1.default.sep;
    const instructions = files
        .filter(file => !file.endsWith(path_1.default.sep) && file.toLowerCase().startsWith(prefix))
        .map(file => ({
        type: 'copy',
        source: file,
        destination: file.slice(prefix.length),
    }));
    return Promise.resolve({ instructions });
}
function testSupportedContent(files, gameId) {
    const supported = (gameId === common_1.GAME_ID)
        && (files.find(file => file.toLowerCase().startsWith('content' + path_1.default.sep) !== undefined));
    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}
function installContent(files, destinationPath, gameId, progressDelegate) {
    return Promise.resolve(files
        .filter(file => file.toLowerCase().startsWith('content' + path_1.default.sep))
        .map(file => {
        const fileBase = file.split(path_1.default.sep).slice(1).join(path_1.default.sep);
        return {
            type: 'copy',
            source: file,
            destination: path_1.default.join('mod' + destinationPath, fileBase),
        };
    }));
}
function installMenuMod(files, destinationPath, gameId, progressDelegate) {
    const filtered = files.filter(file => path_1.default.extname(path_1.default.basename(file)) !== '');
    const inputFiles = filtered.filter(file => file.indexOf(CONFIG_MATRIX_REL_PATH) !== -1);
    const uniqueInput = inputFiles.reduce((accum, iter) => {
        const fileName = path_1.default.basename(iter);
        if (accum.find(entry => path_1.default.basename(entry) === fileName) !== undefined) {
            return accum;
        }
        const instances = inputFiles.filter(file => path_1.default.basename(file) === fileName);
        if (instances.length > 1) {
            if (iter.toLowerCase().indexOf('backup') === -1) {
                accum.push(iter);
            }
        }
        else {
            accum.push(iter);
        }
        return accum;
    }, []);
    let otherFiles = filtered.filter(file => !inputFiles.includes(file));
    const inputFileDestination = CONFIG_MATRIX_REL_PATH;
    const binIdx = uniqueInput[0].split(path_1.default.sep).indexOf('bin');
    const modFiles = otherFiles.filter(file => file.toLowerCase().split(path_1.default.sep).includes('mods'));
    const modsIdx = (modFiles.length > 0)
        ? modFiles[0].toLowerCase().split(path_1.default.sep).indexOf('mods')
        : -1;
    const modNames = (modsIdx !== -1)
        ? modFiles.reduce((accum, iter) => {
            const modName = iter.split(path_1.default.sep).splice(modsIdx + 1, 1).join();
            if (!accum.includes(modName)) {
                accum.push(modName);
            }
            return accum;
        }, [])
        : [];
    if (modFiles.length > 0) {
        otherFiles = otherFiles.filter(file => !modFiles.includes(file));
    }
    const modName = (binIdx > 0)
        ? inputFiles[0].split(path_1.default.sep)[binIdx - 1]
        : ('mod' + path_1.default.basename(destinationPath, '.installing')).replace(/\s/g, '');
    const trimmedFiles = otherFiles.map(file => {
        const source = file;
        let relPath = file.split(path_1.default.sep)
            .slice(binIdx);
        if (relPath[0] === undefined) {
            relPath = file.split(path_1.default.sep);
        }
        const firstSeg = relPath[0].toLowerCase();
        if (firstSeg === 'content' || firstSeg.endsWith(common_1.PART_SUFFIX)) {
            relPath = [].concat(['Mods', modName], relPath);
        }
        return {
            source,
            relPath: relPath.join(path_1.default.sep),
        };
    });
    const toCopyInstruction = (source, destination) => ({
        type: 'copy',
        source,
        destination,
    });
    const inputInstructions = uniqueInput.map(file => toCopyInstruction(file, path_1.default.join(inputFileDestination, path_1.default.basename(file))));
    const otherInstructions = trimmedFiles.map(file => toCopyInstruction(file.source, file.relPath));
    const modFileInstructions = modFiles.map(file => toCopyInstruction(file, file));
    const instructions = [].concat(inputInstructions, otherInstructions, modFileInstructions);
    if (modNames.length > 0) {
        instructions.push({
            type: 'attribute',
            key: 'modComponents',
            value: modNames,
        });
    }
    return Promise.resolve({ instructions });
}
function testMenuModRoot(instructions, gameId) {
    const predicate = (instr) => (!!gameId)
        ? ((common_1.GAME_ID === gameId) && (instr.indexOf(CONFIG_MATRIX_REL_PATH) !== -1))
        : ((instr.type === 'copy') && (instr.destination.indexOf(CONFIG_MATRIX_REL_PATH) !== -1));
    return (!!gameId)
        ? Promise.resolve({
            supported: instructions.find(predicate) !== undefined,
            requiredFiles: [],
        })
        : Promise.resolve(instructions.find(predicate) !== undefined);
}
function testTL(instructions) {
    const menuModFiles = instructions.filter(instr => !!instr.destination
        && instr.destination.indexOf(CONFIG_MATRIX_REL_PATH) !== -1);
    if (menuModFiles.length > 0) {
        return Promise.resolve(false);
    }
    return Promise.resolve(instructions.find(instruction => !!instruction.destination && instruction.destination.toLowerCase().startsWith('mods' + path_1.default.sep)) !== undefined);
}
function testDLC(instructions) {
    return Promise.resolve(instructions.find(instruction => !!instruction.destination && instruction.destination.toLowerCase().startsWith('dlc' + path_1.default.sep)) !== undefined);
}
function notifyMissingScriptMerger(api) {
    const notifId = 'missing-script-merger';
    api.sendNotification({
        id: notifId,
        type: 'info',
        message: api.translate('Witcher 3 script merger is missing/misconfigured', { ns: common_1.I18N_NAMESPACE }),
        allowSuppress: true,
        actions: [
            {
                title: 'More',
                action: () => {
                    api.showDialog('info', 'Witcher 3 Script Merger', {
                        bbcode: api.translate('Vortex is unable to resolve the Script Merger\'s location. The tool needs to be downloaded and configured manually. '
                            + '[url=https://wiki.nexusmods.com/index.php/Tool_Setup:_Witcher_3_Script_Merger]Find out more about how to configure it as a tool for use in Vortex.[/url][br][/br][br][/br]'
                            + 'Note: While script merging works well with the vast majority of mods, there is no guarantee for a satisfying outcome in every single case.', { ns: common_1.I18N_NAMESPACE }),
                    }, [
                        { label: 'Cancel', action: () => {
                                api.dismissNotification('missing-script-merger');
                            } },
                        { label: 'Download Script Merger', action: () => vortex_api_1.util.opn('https://www.nexusmods.com/witcher3/mods/484')
                                .catch(err => null)
                                .then(() => api.dismissNotification('missing-script-merger')) },
                    ]);
                },
            },
        ],
    });
}
function prepareForModding(context, discovery) {
    const findScriptMerger = (error) => {
        var _a;
        (0, vortex_api_1.log)('error', 'failed to download/install script merger', error);
        const scriptMergerPath = (0, scriptmerger_1.getScriptMergerDir)(context);
        if (scriptMergerPath === undefined) {
            notifyMissingScriptMerger(context.api);
            return Promise.resolve();
        }
        else {
            if (((_a = discovery === null || discovery === void 0 ? void 0 : discovery.tools) === null || _a === void 0 ? void 0 : _a.W3ScriptMerger) === undefined) {
                return (0, scriptmerger_1.setMergerConfig)(discovery.path, scriptMergerPath);
            }
        }
    };
    const ensurePath = (dirpath) => vortex_api_1.fs.ensureDirWritableAsync(dirpath)
        .catch(err => (err.code === 'EEXIST')
        ? Promise.resolve()
        : Promise.reject(err));
    return Promise.all([
        ensurePath(path_1.default.join(discovery.path, 'Mods')),
        ensurePath(path_1.default.join(discovery.path, 'DLC')),
        ensurePath(path_1.default.dirname((0, common_1.getLoadOrderFilePath)()))
    ])
        .then(() => (0, scriptmerger_1.downloadScriptMerger)(context)
        .catch(err => (err instanceof vortex_api_1.util.UserCanceled)
        ? Promise.resolve()
        : findScriptMerger(err)));
}
function getScriptMergerTool(api) {
    const state = api.store.getState();
    const scriptMerger = vortex_api_1.util.getSafe(state, ['settings', 'gameMode', 'discovered', common_1.GAME_ID, 'tools', common_1.SCRIPT_MERGER_ID], undefined);
    if (!!(scriptMerger === null || scriptMerger === void 0 ? void 0 : scriptMerger.path)) {
        return scriptMerger;
    }
    return undefined;
}
function runScriptMerger(api) {
    const tool = getScriptMergerTool(api);
    if ((tool === null || tool === void 0 ? void 0 : tool.path) === undefined) {
        notifyMissingScriptMerger(api);
        return Promise.resolve();
    }
    return api.runExecutable(tool.path, [], { suggestDeploy: true })
        .catch(err => api.showErrorNotification('Failed to run tool', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 }));
}
function getAllMods(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const invalidModTypes = ['witcher3menumoddocuments'];
        const state = context.api.store.getState();
        const profile = vortex_api_1.selectors.activeProfile(state);
        if ((profile === null || profile === void 0 ? void 0 : profile.id) === undefined) {
            return Promise.resolve({
                merged: [],
                manual: [],
                managed: [],
            });
        }
        const modState = vortex_api_1.util.getSafe(state, ['persistent', 'profiles', profile.id, 'modState'], {});
        const mods = vortex_api_1.util.getSafe(state, ['persistent', 'mods', common_1.GAME_ID], {});
        const enabledMods = Object.keys(modState).filter(key => (!!mods[key] && modState[key].enabled && !invalidModTypes.includes(mods[key].type)));
        const mergedModNames = yield (0, mergeInventoryParsing_1.getMergedModNames)(context);
        const manuallyAddedMods = yield getManuallyAddedMods(context);
        const managedMods = yield getManagedModNames(context, enabledMods.map(key => mods[key]));
        return Promise.resolve({
            merged: mergedModNames,
            manual: manuallyAddedMods.filter(mod => !mergedModNames.includes(mod)),
            managed: managedMods,
        });
    });
}
function setINIStruct(context, loadOrder, priorityManager) {
    return __awaiter(this, void 0, void 0, function* () {
        return getAllMods(context).then(modMap => {
            _INI_STRUCT = {};
            const mods = [].concat(modMap.merged, modMap.managed, modMap.manual);
            const filterFunc = (modName) => modName.startsWith(common_1.LOCKED_PREFIX);
            const manualLocked = modMap.manual.filter(filterFunc);
            const managedLocked = modMap.managed
                .filter(entry => filterFunc(entry.name))
                .map(entry => entry.name);
            const totalLocked = [].concat(modMap.merged, manualLocked, managedLocked);
            return bluebird_1.default.each(mods, (mod, idx) => {
                let name;
                let key;
                if (typeof (mod) === 'object' && mod !== null) {
                    name = mod.name;
                    key = mod.id;
                }
                else {
                    name = mod;
                    key = mod;
                }
                const LOEntry = vortex_api_1.util.getSafe(loadOrder, [key], undefined);
                if (idx === 0) {
                    priorityManager.resetMaxPriority();
                }
                _INI_STRUCT[name] = {
                    Enabled: (LOEntry !== undefined) ? LOEntry.enabled ? 1 : 0 : 1,
                    Priority: totalLocked.includes(name)
                        ? totalLocked.indexOf(name)
                        : priorityManager.getPriority({ id: key }),
                    VK: key,
                };
            });
        });
    });
}
let refreshFunc;
function genEntryActions(context, item, minPriority, onSetPriority) {
    const priorityInputDialog = () => {
        return new bluebird_1.default((resolve) => {
            var _a;
            context.api.showDialog('question', 'Set New Priority', {
                text: context.api.translate('Insert new numerical priority for {{itemName}} in the input box:', { replace: { itemName: item.name } }),
                input: [
                    {
                        id: 'w3PriorityInput',
                        label: 'Priority',
                        type: 'number',
                        placeholder: ((_a = _INI_STRUCT[item.id]) === null || _a === void 0 ? void 0 : _a.Priority) || 0,
                    }
                ],
            }, [{ label: 'Cancel' }, { label: 'Set', default: true }])
                .then(result => {
                if (result.action === 'Set') {
                    const itemKey = Object.keys(_INI_STRUCT).find(key => _INI_STRUCT[key].VK === item.id);
                    const wantedPriority = result.input['w3PriorityInput'];
                    if (wantedPriority <= minPriority) {
                        context.api.showErrorNotification('Cannot change to locked entry Priority', wantedPriority);
                        return resolve();
                    }
                    if (itemKey !== undefined) {
                        _INI_STRUCT[itemKey].Priority = parseInt(wantedPriority, 10);
                        onSetPriority(itemKey, wantedPriority);
                    }
                    else {
                        (0, vortex_api_1.log)('error', 'Failed to set priority - mod is not in ini struct', { modId: item.id });
                    }
                }
                return resolve();
            });
        });
    };
    const itemActions = [
        {
            show: item.locked !== true,
            title: 'Set Manual Priority',
            action: () => priorityInputDialog(),
        },
    ];
    return itemActions;
}
function preSort(context, items, direction, updateType, priorityManager) {
    return __awaiter(this, void 0, void 0, function* () {
        const state = context.api.store.getState();
        const activeProfile = vortex_api_1.selectors.activeProfile(state);
        const { getPriority, resetMaxPriority } = priorityManager;
        if ((activeProfile === null || activeProfile === void 0 ? void 0 : activeProfile.id) === undefined) {
            (0, vortex_api_1.log)('warn', '[W3] unable to presort due to no active profile');
            return Promise.resolve([]);
        }
        let loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', activeProfile.id], {});
        const onSetPriority = (itemKey, wantedPriority) => {
            return writeToModSettings()
                .then(() => {
                wantedPriority = +wantedPriority;
                const state = context.api.store.getState();
                const activeProfile = vortex_api_1.selectors.activeProfile(state);
                const modId = _INI_STRUCT[itemKey].VK;
                const loEntry = loadOrder[modId];
                if (priorityManager.priorityType === 'position-based') {
                    context.api.store.dispatch(vortex_api_1.actions.setLoadOrderEntry(activeProfile.id, modId, Object.assign(Object.assign({}, loEntry), { pos: (loEntry.pos < wantedPriority) ? wantedPriority : wantedPriority - 2 })));
                    loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', activeProfile.id], {});
                }
                else {
                    context.api.store.dispatch(vortex_api_1.actions.setLoadOrderEntry(activeProfile.id, modId, Object.assign(Object.assign({}, loEntry), { prefix: parseInt(_INI_STRUCT[itemKey].Priority, 10) })));
                }
                if (refreshFunc !== undefined) {
                    refreshFunc();
                }
            })
                .catch(err => modSettingsErrorHandler(context, err, 'Failed to modify load order file'));
        };
        const allMods = yield getAllMods(context);
        if ((allMods.merged.length === 0) && (allMods.manual.length === 0)) {
            items.map((item, idx) => {
                if (idx === 0) {
                    resetMaxPriority();
                }
                return Object.assign(Object.assign({}, item), { contextMenuActions: genEntryActions(context, item, 0, onSetPriority), prefix: getPriority(item) });
            });
        }
        const filterFunc = (modName) => modName.startsWith(common_1.LOCKED_PREFIX);
        const lockedMods = [].concat(allMods.manual.filter(filterFunc), allMods.managed.filter(entry => filterFunc(entry.name))
            .map(entry => entry.name));
        const readableNames = {
            [common_1.UNI_PATCH]: 'Unification/Community Patch',
        };
        const lockedEntries = [].concat(allMods.merged, lockedMods)
            .reduce((accum, modName, idx) => {
            const obj = {
                id: modName,
                name: !!readableNames[modName] ? readableNames[modName] : modName,
                imgUrl: `${__dirname}/gameart.jpg`,
                locked: true,
                prefix: idx + 1,
            };
            if (!accum.find(acc => obj.id === acc.id)) {
                accum.push(obj);
            }
            return accum;
        }, []);
        items = items.filter(item => !allMods.merged.includes(item.id)
            && !allMods.manual.includes(item.id)
            && !allMods.managed.find(mod => (mod.name === common_1.UNI_PATCH) && (mod.id === item.id)))
            .map((item, idx) => {
            if (idx === 0) {
                resetMaxPriority();
            }
            return Object.assign(Object.assign({}, item), { contextMenuActions: genEntryActions(context, item, lockedEntries.length, onSetPriority), prefix: getPriority(item) });
        });
        const manualEntries = allMods.manual
            .filter(key => lockedEntries.find(entry => entry.id === key) === undefined)
            .map(key => {
            const item = {
                id: key,
                name: key,
                imgUrl: `${__dirname}/gameart.jpg`,
                external: true,
            };
            return Object.assign(Object.assign({}, item), { prefix: getPriority(item), contextMenuActions: genEntryActions(context, item, lockedEntries.length, onSetPriority) });
        });
        const keys = Object.keys(loadOrder);
        const knownManuallyAdded = manualEntries.filter(entry => keys.includes(entry.id)) || [];
        const unknownManuallyAdded = manualEntries.filter(entry => !keys.includes(entry.id)) || [];
        const filteredOrder = keys
            .filter(key => lockedEntries.find(item => item.id === key) === undefined)
            .reduce((accum, key) => {
            accum[key] = loadOrder[key];
            return accum;
        }, []);
        knownManuallyAdded.forEach(known => {
            const diff = keys.length - Object.keys(filteredOrder).length;
            const pos = filteredOrder[known.id].pos - diff;
            items = [].concat(items.slice(0, pos) || [], known, items.slice(pos) || []);
        });
        let preSorted = [].concat(...lockedEntries, items.filter(item => {
            const isLocked = lockedEntries.find(locked => locked.name === item.name) !== undefined;
            const doNotDisplay = common_1.DO_NOT_DISPLAY.includes(item.name.toLowerCase());
            return !isLocked && !doNotDisplay;
        }), ...unknownManuallyAdded);
        preSorted = (updateType !== 'drag-n-drop')
            ? preSorted.sort((lhs, rhs) => lhs.prefix - rhs.prefix)
            : preSorted.reduce((accum, entry, idx) => {
                if (lockedEntries.indexOf(entry) !== -1 || idx === 0) {
                    accum.push(entry);
                }
                else {
                    const prevPrefix = parseInt(accum[idx - 1].prefix, 10);
                    if (prevPrefix >= entry.prefix) {
                        accum.push(Object.assign(Object.assign({}, entry), { prefix: prevPrefix + 1 }));
                    }
                    else {
                        accum.push(entry);
                    }
                }
                return accum;
            }, []);
        return Promise.resolve(preSorted);
    });
}
function findModFolder(installationPath, mod) {
    if (!installationPath || !(mod === null || mod === void 0 ? void 0 : mod.installationPath)) {
        const errMessage = !installationPath
            ? 'Game is not discovered'
            : 'Failed to resolve mod installation path';
        return bluebird_1.default.reject(new Error(errMessage));
    }
    const expectedModNameLocation = ['witcher3menumodroot', 'witcher3tl'].includes(mod.type)
        ? path_1.default.join(installationPath, mod.installationPath, 'Mods')
        : path_1.default.join(installationPath, mod.installationPath);
    return vortex_api_1.fs.readdirAsync(expectedModNameLocation)
        .then(entries => Promise.resolve(entries[0]));
}
function getManagedModNames(context, mods) {
    const installationPath = vortex_api_1.selectors.installPathForGame(context.api.store.getState(), common_1.GAME_ID);
    return bluebird_1.default.reduce(mods, (accum, mod) => findModFolder(installationPath, mod)
        .then(modName => {
        if (!modName || ['collection', 'w3modlimitpatcher'].includes(mod.type)) {
            return Promise.resolve(accum);
        }
        const modComponents = vortex_api_1.util.getSafe(mod, ['attributes', 'modComponents'], []);
        if (modComponents.length === 0) {
            modComponents.push(modName);
        }
        [...modComponents].forEach(key => {
            accum.push({
                id: mod.id,
                name: key,
            });
        });
        return Promise.resolve(accum);
    })
        .catch(err => {
        (0, vortex_api_1.log)('error', 'unable to resolve mod name', err);
        return Promise.resolve(accum);
    }), []);
}
const toggleModsState = (context, props, enabled) => __awaiter(void 0, void 0, void 0, function* () {
    const state = context.api.store.getState();
    const profile = vortex_api_1.selectors.activeProfile(state);
    const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', profile.id], {});
    const modMap = yield getAllMods(context);
    const manualLocked = modMap.manual.filter(modName => modName.startsWith(common_1.LOCKED_PREFIX));
    const totalLocked = [].concat(modMap.merged, manualLocked);
    const newLO = Object.keys(loadOrder).reduce((accum, key) => {
        if (totalLocked.includes(key)) {
            accum[key] = loadOrder[key];
        }
        else {
            accum[key] = Object.assign(Object.assign({}, loadOrder[key]), { enabled });
        }
        return accum;
    }, {});
    context.api.store.dispatch(vortex_api_1.actions.setLoadOrder(profile.id, newLO));
    props.refresh();
});
function infoComponent(context, props) {
    const t = context.api.translate;
    return react_1.default.createElement(BS.Panel, { id: 'loadorderinfo' }, react_1.default.createElement('h2', {}, t('Managing your load order', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement(vortex_api_1.FlexLayout.Flex, { style: { height: '30%' } }, react_1.default.createElement('div', {}, react_1.default.createElement('p', {}, t('You can adjust the load order for The Witcher 3 by dragging and dropping '
        + 'mods up or down on this page.  If you are using several mods that add scripts you may need to use '
        + 'the Witcher 3 Script merger. For more information see: ', { ns: common_1.I18N_NAMESPACE }), react_1.default.createElement('a', { onClick: () => vortex_api_1.util.opn('https://wiki.nexusmods.com/index.php/Modding_The_Witcher_3_with_Vortex') }, t('Modding The Witcher 3 with Vortex.', { ns: common_1.I18N_NAMESPACE }))))), react_1.default.createElement('div', {
        style: { height: '80%' },
    }, react_1.default.createElement('p', {}, t('Please note:', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('ul', {}, react_1.default.createElement('li', {}, t('For Witcher 3, the mod with the lowest index number (by default, the mod sorted at the top) overrides mods with a higher index number.', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('li', {}, t('You are able to modify the priority manually by right clicking any LO entry and set the mod\'s priority', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('li', {}, t('If you cannot see your mod in this load order, you may need to add it manually (see our wiki for details).', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('li', {}, t('When managing menu mods, mod settings changed inside the game will be detected by Vortex as external changes - that is expected, '
        + 'choose to use the newer file and your settings will be made persistent.', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('li', {}, t('You can change the way the priorities are assgined using the "Switch To Position/Prefix based" button. '
        + 'Prefix based is less restrictive and allows you to set any priority value you want "5000, 69999, etc" while position based will '
        + 'restrict the priorities to the number of load order entries that are available.', { ns: common_1.I18N_NAMESPACE })), react_1.default.createElement('li', {}, t('Merges generated by the Witcher 3 Script merger must be loaded first and are locked in the first load order slot.', { ns: common_1.I18N_NAMESPACE }))), react_1.default.createElement(BS.Button, {
        onClick: () => toggleModsState(context, props, false),
        style: {
            marginBottom: '5px',
            width: 'min-content',
        },
    }, t('Disable All')), react_1.default.createElement('br'), react_1.default.createElement(BS.Button, {
        onClick: () => toggleModsState(context, props, true),
        style: {
            marginBottom: '5px',
            width: 'min-content',
        },
    }, t('Enable All ')), []));
}
function queryScriptMerge(context, reason) {
    const state = context.api.store.getState();
    const scriptMergerTool = vortex_api_1.util.getSafe(state, ['settings', 'gameMode', 'discovered', common_1.GAME_ID, 'tools', common_1.SCRIPT_MERGER_ID], undefined);
    if (!!(scriptMergerTool === null || scriptMergerTool === void 0 ? void 0 : scriptMergerTool.path)) {
        context.api.sendNotification({
            id: 'witcher3-merge',
            type: 'warning',
            message: context.api.translate('Witcher Script merger may need to be executed', { ns: common_1.I18N_NAMESPACE }),
            allowSuppress: true,
            actions: [
                {
                    title: 'More',
                    action: () => {
                        context.api.showDialog('info', 'Witcher 3', {
                            text: reason,
                        }, [
                            { label: 'Close' },
                        ]);
                    },
                },
                {
                    title: 'Run tool',
                    action: dismiss => {
                        runScriptMerger(context.api);
                        dismiss();
                    },
                },
            ],
        });
    }
    else {
        notifyMissingScriptMerger(context.api);
    }
}
function canMerge(game, gameDiscovery) {
    if (game.id !== common_1.GAME_ID) {
        return undefined;
    }
    return ({
        baseFiles: () => [
            {
                in: path_1.default.join(gameDiscovery.path, CONFIG_MATRIX_REL_PATH, common_1.INPUT_XML_FILENAME),
                out: path_1.default.join(CONFIG_MATRIX_REL_PATH, common_1.INPUT_XML_FILENAME),
            },
        ],
        filter: filePath => filePath.endsWith(common_1.INPUT_XML_FILENAME),
    });
}
function readInputFile(context, mergeDir) {
    const state = context.api.store.getState();
    const discovery = vortex_api_1.util.getSafe(state, ['settings', 'gameMode', 'discovered', common_1.GAME_ID], undefined);
    const gameInputFilepath = path_1.default.join(discovery.path, CONFIG_MATRIX_REL_PATH, common_1.INPUT_XML_FILENAME);
    return (!!(discovery === null || discovery === void 0 ? void 0 : discovery.path))
        ? vortex_api_1.fs.readFileAsync(path_1.default.join(mergeDir, CONFIG_MATRIX_REL_PATH, common_1.INPUT_XML_FILENAME))
            .catch(err => (err.code === 'ENOENT')
            ? vortex_api_1.fs.readFileAsync(gameInputFilepath)
            : Promise.reject(err))
        : Promise.reject({ code: 'ENOENT', message: 'Game is not discovered' });
}
const emptyXml = '<?xml version="1.0" encoding="UTF-8"?><metadata></metadata>';
function merge(filePath, mergeDir, context) {
    let modData;
    return vortex_api_1.fs.readFileAsync(filePath)
        .then(xmlData => {
        try {
            modData = (0, libxmljs_1.parseXmlString)(xmlData, { ignore_enc: true, noblanks: true });
            return Promise.resolve();
        }
        catch (err) {
            context.api.showErrorNotification('Invalid mod XML data - inform mod author', { path: filePath, error: err.message }, { allowReport: false });
            modData = emptyXml;
            return Promise.resolve();
        }
    })
        .then(() => readInputFile(context, mergeDir))
        .then(mergedData => {
        try {
            const merged = (0, libxmljs_1.parseXmlString)(mergedData, { ignore_enc: true, noblanks: true });
            return Promise.resolve(merged);
        }
        catch (err) {
            const state = context.api.store.getState();
            const activeProfile = vortex_api_1.selectors.activeProfile(state);
            const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', activeProfile.id], {});
            context.api.showErrorNotification('Invalid merged XML data', err, {
                allowReport: true,
                attachments: [
                    { id: '__merged/input.xml', type: 'data', data: mergedData,
                        description: 'Witcher 3 menu mod merged data' },
                    { id: `${activeProfile.id}_loadOrder`, type: 'data', data: loadOrder,
                        description: 'Current load order' },
                ],
            });
            return Promise.reject(new vortex_api_1.util.DataInvalid('Invalid merged XML data'));
        }
    })
        .then(gameIndexFile => {
        const modVars = modData.find('//Var');
        const gameVars = gameIndexFile.find('//Var');
        modVars.forEach(modVar => {
            const matcher = (gameVar) => {
                let gameVarParent;
                let modVarParent;
                try {
                    gameVarParent = gameVar.parent().parent();
                    modVarParent = modVar.parent().parent();
                }
                catch (err) {
                    return false;
                }
                if ((typeof (gameVarParent === null || gameVarParent === void 0 ? void 0 : gameVarParent.attr) !== 'function')
                    || (typeof (modVarParent === null || modVarParent === void 0 ? void 0 : modVarParent.attr) !== 'function')) {
                    (0, vortex_api_1.log)('error', 'failed to find parent group of mod variable', modVar);
                    return false;
                }
                return ((gameVarParent.attr('id').value() === modVarParent.attr('id').value())
                    && (gameVar.attr('id').value() === modVar.attr('id').value()));
            };
            const existingVar = gameVars.find(matcher);
            if (existingVar) {
                existingVar.replace(modVar.clone());
            }
            else {
                const parentGroup = modVar.parent().parent();
                const groupId = parentGroup.attr('id').value();
                const matchingIndexGroup = gameIndexFile.find('//Group')
                    .filter(group => group.attr('id').value() === groupId);
                if (matchingIndexGroup.length > 1) {
                    const err = new vortex_api_1.util.DataInvalid('Duplicate group entries found in game input.xml'
                        + `\n\n${path_1.default.join(mergeDir, common_1.INPUT_XML_FILENAME)}\n\n`
                        + 'file - please fix this manually before attempting to re-install the mod');
                    context.api.showErrorNotification('Duplicate group entries detected', err, { allowReport: false });
                    return Promise.reject(err);
                }
                else if (matchingIndexGroup.length === 0) {
                    const userConfig = gameIndexFile.get('//UserConfig');
                    userConfig.addChild(parentGroup.clone());
                }
                else {
                    matchingIndexGroup[0].child(0).addChild(modVar.clone());
                }
            }
        });
        return vortex_api_1.fs.writeFileAsync(path_1.default.join(mergeDir, CONFIG_MATRIX_REL_PATH, common_1.INPUT_XML_FILENAME), gameIndexFile);
    })
        .catch(err => {
        (0, vortex_api_1.log)('error', 'input.xml merge failed', err);
        return Promise.resolve();
    });
}
const SCRIPT_MERGER_FILES = ['WitcherScriptMerger.exe'];
function scriptMergerTest(files, gameId) {
    const matcher = (file => SCRIPT_MERGER_FILES.includes(file));
    const supported = ((gameId === common_1.GAME_ID) && (files.filter(matcher).length > 0));
    return Promise.resolve({ supported, requiredFiles: SCRIPT_MERGER_FILES });
}
function modSettingsErrorHandler(context, err, errMessage) {
    let allowReport = true;
    const userCanceled = err instanceof vortex_api_1.util.UserCanceled;
    if (userCanceled) {
        allowReport = false;
    }
    const busyResource = err instanceof common_1.ResourceInaccessibleError;
    if (allowReport && busyResource) {
        allowReport = err.allowReport;
        err.message = err.errorMessage;
    }
    context.api.showErrorNotification(errMessage, err, { allowReport });
    return;
}
function scriptMergerDummyInstaller(context, files) {
    context.api.showErrorNotification('Invalid Mod', 'It looks like you tried to install '
        + 'The Witcher 3 Script Merger, which is a tool and not a mod for The Witcher 3.\n\n'
        + 'The script merger should\'ve been installed automatically by Vortex as soon as you activated this extension. '
        + 'If the download or installation has failed for any reason - please let us know why, by reporting the error through '
        + 'our feedback system and make sure to include vortex logs. Please note: if you\'ve installed '
        + 'the script merger in previous versions of Vortex as a mod and STILL have it installed '
        + '(it\'s present in your mod list) - you should consider un-installing it followed by a Vortex restart; '
        + 'the automatic merger installer/updater should then kick off and set up the tool for you.', { allowReport: false });
    return Promise.reject(new vortex_api_1.util.ProcessCanceled('Invalid mod'));
}
function toBlue(func) {
    return (...args) => bluebird_1.default.resolve(func(...args));
}
exports.toBlue = toBlue;
function main(context) {
    context.registerReducer(['settings', 'witcher3'], reducers_1.W3Reducer);
    let priorityManager;
    let modLimitPatcher;
    context.registerGame({
        id: common_1.GAME_ID,
        name: 'The Witcher 3',
        mergeMods: true,
        queryPath: findGame,
        queryModPath: () => 'Mods',
        logo: 'gameart.jpg',
        executable: () => 'bin/x64/witcher3.exe',
        setup: toBlue((discovery) => prepareForModding(context, discovery)),
        supportedTools: tools,
        requiresCleanup: true,
        requiredFiles: [
            'bin/x64/witcher3.exe',
        ],
        environment: {
            SteamAPPId: '292030',
        },
        details: {
            steamAppId: 292030,
            ignoreConflicts: common_1.DO_NOT_DEPLOY,
            ignoreDeploy: common_1.DO_NOT_DEPLOY,
        },
    });
    const getDLCPath = (game) => {
        const state = context.api.store.getState();
        const discovery = state.settings.gameMode.discovered[game.id];
        return path_1.default.join(discovery.path, 'DLC');
    };
    const getTLPath = (game) => {
        const state = context.api.store.getState();
        const discovery = state.settings.gameMode.discovered[game.id];
        return discovery.path;
    };
    const isTW3 = (gameId = undefined) => {
        if (gameId !== undefined) {
            return (gameId === common_1.GAME_ID);
        }
        const state = context.api.getState();
        const gameMode = vortex_api_1.selectors.activeGameId(state);
        return (gameMode === common_1.GAME_ID);
    };
    context.registerInstaller('witcher3tl', 25, toBlue(testSupportedTL), toBlue(installTL));
    context.registerInstaller('witcher3mixed', 30, toBlue(installers_1.testSupportedMixed), toBlue(installers_1.installMixed));
    context.registerInstaller('witcher3content', 50, toBlue(testSupportedContent), toBlue(installContent));
    context.registerInstaller('witcher3menumodroot', 20, toBlue(testMenuModRoot), toBlue(installMenuMod));
    context.registerInstaller('scriptmergerdummy', 15, toBlue(scriptMergerTest), toBlue((files) => scriptMergerDummyInstaller(context, files)));
    context.registerModType('witcher3tl', 25, isTW3, getTLPath, toBlue(testTL));
    context.registerModType('witcher3dlc', 25, isTW3, getDLCPath, toBlue(testDLC));
    context.registerModType('witcher3menumodroot', 20, isTW3, getTLPath, toBlue(testMenuModRoot));
    context.registerModType('witcher3menumoddocuments', 60, isTW3, (game) => path_1.default.join(vortex_api_1.util.getVortexPath('documents'), 'The Witcher 3'), () => bluebird_1.default.resolve(false));
    context.registerModType('w3modlimitpatcher', 25, isTW3, getTLPath, () => bluebird_1.default.resolve(false), { deploymentEssential: false, name: 'Mod Limit Patcher Mod Type' });
    context.registerMerge(canMerge, (filePath, mergeDir) => merge(filePath, mergeDir, context), 'witcher3menumodroot');
    (0, iconbarActions_1.registerActions)({
        context,
        refreshFunc,
        getPriorityManager: () => priorityManager,
        getModLimitPatcher: () => modLimitPatcher,
    });
    context['registerCollectionFeature']('witcher3_collection_data', (gameId, includedMods, collection) => (0, collections_1.genCollectionsData)(context, gameId, includedMods, collection), (gameId, collection) => (0, collections_1.parseCollectionsData)(context, gameId, collection), () => Promise.resolve(), (t) => t('Witcher 3 Data'), (state, gameId) => gameId === common_1.GAME_ID, CollectionsDataView_1.default);
    context.registerProfileFeature('local_merges', 'boolean', 'settings', 'Profile Data', 'This profile will store and restore profile specific data (merged scripts, loadorder, etc) when switching profiles', () => {
        const activeGameId = vortex_api_1.selectors.activeGameId(context.api.getState());
        return activeGameId === common_1.GAME_ID;
    });
    const invalidModTypes = ['witcher3menumoddocuments', 'collection'];
    context.registerLoadOrderPage({
        gameId: common_1.GAME_ID,
        createInfoPanel: (props) => {
            refreshFunc = props.refresh;
            return infoComponent(context, props);
        },
        gameArtURL: `${__dirname}/gameart.jpg`,
        filter: (mods) => mods.filter(mod => !invalidModTypes.includes(mod.type)),
        preSort: (items, direction, updateType) => {
            return preSort(context, items, direction, updateType, priorityManager);
        },
        noCollectionGeneration: true,
        callback: (loadOrder, updateType) => {
            if (loadOrder === _PREVIOUS_LO) {
                return;
            }
            if (_PREVIOUS_LO !== undefined) {
                context.api.store.dispatch(vortex_api_1.actions.setDeploymentNecessary(common_1.GAME_ID, true));
            }
            _PREVIOUS_LO = loadOrder;
            setINIStruct(context, loadOrder, priorityManager)
                .then(() => writeToModSettings())
                .catch(err => modSettingsErrorHandler(context, err, 'Failed to modify load order file'));
        },
    });
    context.registerTest('tw3-mod-limit-breach', 'gamemode-activated', () => bluebird_1.default.resolve((0, tests_1.testModLimitBreach)(context.api, modLimitPatcher)));
    context.registerTest('tw3-mod-limit-breach', 'mod-activated', () => bluebird_1.default.resolve((0, tests_1.testModLimitBreach)(context.api, modLimitPatcher)));
    const revertLOFile = () => {
        const state = context.api.store.getState();
        const profile = vortex_api_1.selectors.activeProfile(state);
        if (!!profile && (profile.gameId === common_1.GAME_ID)) {
            const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', profile.id], undefined);
            return getManuallyAddedMods(context).then((manuallyAdded) => {
                if (manuallyAdded.length > 0) {
                    const newStruct = {};
                    manuallyAdded.forEach((mod, idx) => {
                        newStruct[mod] = {
                            Enabled: 1,
                            Priority: ((loadOrder !== undefined && !!loadOrder[mod])
                                ? parseInt(loadOrder[mod].prefix, 10) : idx) + 1,
                        };
                    });
                    _INI_STRUCT = newStruct;
                    writeToModSettings()
                        .then(() => {
                        refreshFunc === null || refreshFunc === void 0 ? void 0 : refreshFunc();
                        return Promise.resolve();
                    })
                        .catch(err => modSettingsErrorHandler(context, err, 'Failed to cleanup load order file'));
                }
                else {
                    const filePath = (0, common_1.getLoadOrderFilePath)();
                    vortex_api_1.fs.removeAsync(filePath)
                        .catch(err => (err.code === 'ENOENT')
                        ? Promise.resolve()
                        : context.api.showErrorNotification('Failed to cleanup load order file', err));
                }
            });
        }
    };
    const validateProfile = (profileId, state) => {
        const activeProfile = vortex_api_1.selectors.activeProfile(state);
        const deployProfile = vortex_api_1.selectors.profileById(state, profileId);
        if (!!activeProfile && !!deployProfile && (deployProfile.id !== activeProfile.id)) {
            return undefined;
        }
        if ((activeProfile === null || activeProfile === void 0 ? void 0 : activeProfile.gameId) !== common_1.GAME_ID) {
            return undefined;
        }
        return activeProfile;
    };
    let prevDeployment = [];
    context.once(() => {
        modLimitPatcher = new modLimitPatch_1.ModLimitPatcher(context.api);
        priorityManager = new priorityManager_1.PriorityManager(context.api, 'prefix-based');
        context.api.events.on('gamemode-activated', (gameMode) => __awaiter(this, void 0, void 0, function* () {
            if (gameMode !== common_1.GAME_ID) {
                context.api.dismissNotification('witcher3-merge');
            }
            else {
                const state = context.api.getState();
                const lastProfId = vortex_api_1.selectors.lastActiveProfileForGame(state, gameMode);
                const activeProf = vortex_api_1.selectors.activeProfile(state);
                const priorityType = vortex_api_1.util.getSafe(state, (0, common_1.getPriorityTypeBranch)(), 'prefix-based');
                context.api.store.dispatch((0, actions_1.setPriorityType)(priorityType));
                if (lastProfId !== (activeProf === null || activeProf === void 0 ? void 0 : activeProf.id)) {
                    try {
                        yield (0, mergeBackup_1.storeToProfile)(context, lastProfId)
                            .then(() => (0, mergeBackup_1.restoreFromProfile)(context, activeProf === null || activeProf === void 0 ? void 0 : activeProf.id));
                    }
                    catch (err) {
                        context.api.showErrorNotification('Failed to restore profile merged files', err);
                    }
                }
            }
        }));
        context.api.onAsync('will-deploy', (profileId, deployment) => {
            const state = context.api.store.getState();
            const activeProfile = validateProfile(profileId, state);
            if (activeProfile === undefined) {
                return Promise.resolve();
            }
            return menumod_1.default.onWillDeploy(context.api, deployment, activeProfile)
                .catch(err => (err instanceof vortex_api_1.util.UserCanceled)
                ? Promise.resolve()
                : Promise.reject(err));
        });
        context.api.onAsync('did-deploy', (profileId, deployment) => __awaiter(this, void 0, void 0, function* () {
            const state = context.api.store.getState();
            const activeProfile = validateProfile(profileId, state);
            if (activeProfile === undefined) {
                return Promise.resolve();
            }
            if (JSON.stringify(prevDeployment) !== JSON.stringify(deployment)) {
                prevDeployment = deployment;
                queryScriptMerge(context, 'Your mods state/load order has changed since the last time you ran '
                    + 'the script merger. You may want to run the merger tool and check whether any new script conflicts are '
                    + 'present, or if existing merges have become unecessary. Please also note that any load order changes '
                    + 'may affect the order in which your conflicting mods are meant to be merged, and may require you to '
                    + 'remove the existing merge and re-apply it.');
            }
            const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', activeProfile.id], {});
            const docFiles = deployment['witcher3menumodroot']
                .filter(file => file.relPath.endsWith(common_1.PART_SUFFIX)
                && (file.relPath.indexOf(common_1.INPUT_XML_FILENAME) === -1));
            const menuModPromise = () => {
                if (docFiles.length === 0) {
                    return menumod_1.default.removeMod(context.api, activeProfile);
                }
                else {
                    return menumod_1.default.onDidDeploy(context.api, deployment, activeProfile)
                        .then((modId) => __awaiter(this, void 0, void 0, function* () {
                        if (modId === undefined) {
                            return Promise.resolve();
                        }
                        context.api.store.dispatch(vortex_api_1.actions.setModEnabled(activeProfile.id, modId, true));
                        yield context.api.emitAndAwait('deploy-single-mod', common_1.GAME_ID, modId);
                        return Promise.resolve();
                    }));
                }
            };
            return menuModPromise()
                .then(() => setINIStruct(context, loadOrder, priorityManager))
                .then(() => writeToModSettings())
                .then(() => {
                refreshFunc === null || refreshFunc === void 0 ? void 0 : refreshFunc();
                return Promise.resolve();
            })
                .catch(err => modSettingsErrorHandler(context, err, 'Failed to modify load order file'));
        }));
        context.api.events.on('profile-will-change', (newProfileId) => __awaiter(this, void 0, void 0, function* () {
            const state = context.api.getState();
            const profile = vortex_api_1.selectors.profileById(state, newProfileId);
            if ((profile === null || profile === void 0 ? void 0 : profile.gameId) !== common_1.GAME_ID) {
                return;
            }
            const priorityType = vortex_api_1.util.getSafe(state, (0, common_1.getPriorityTypeBranch)(), 'prefix-based');
            context.api.store.dispatch((0, actions_1.setPriorityType)(priorityType));
            const lastProfId = vortex_api_1.selectors.lastActiveProfileForGame(state, profile.gameId);
            try {
                yield (0, mergeBackup_1.storeToProfile)(context, lastProfId)
                    .then(() => (0, mergeBackup_1.restoreFromProfile)(context, profile.id));
            }
            catch (err) {
                context.api.showErrorNotification('Failed to store profile specific merged items', err);
            }
        }));
        context.api.onStateChange(['settings', 'witcher3'], (prev, current) => {
            const state = context.api.getState();
            const activeProfile = vortex_api_1.selectors.activeProfile(state);
            if ((activeProfile === null || activeProfile === void 0 ? void 0 : activeProfile.gameId) !== common_1.GAME_ID || priorityManager === undefined) {
                return;
            }
            const priorityType = vortex_api_1.util.getSafe(state, (0, common_1.getPriorityTypeBranch)(), 'prefix-based');
            priorityManager.priorityType = priorityType;
        });
        context.api.events.on('purge-mods', () => {
            revertLOFile();
        });
    });
    return true;
}
module.exports = {
    default: main,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0RBQWdDO0FBQ2hDLHVDQUFtRDtBQUNuRCxnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLG9EQUFzQztBQUN0QywyQ0FBa0Y7QUFDbEYsNERBQThDO0FBQzlDLHNFQUFxQztBQUVyQywyREFBcUY7QUFFckYsc0ZBQThEO0FBRTlELHdEQUFnQztBQUNoQyxpREFBMkY7QUFFM0YscUNBSWtCO0FBRWxCLG1DQUE2QztBQUU3QyxtREFBa0Q7QUFFbEQscURBQW1EO0FBQ25ELHVEQUFvRDtBQUVwRCw2Q0FBZ0U7QUFDaEUsK0NBQW1FO0FBRW5FLG1FQUE0RDtBQUU1RCx1Q0FBNEM7QUFDNUMseUNBQXVDO0FBRXZDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQztBQUM1QixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUM7QUFDakMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTFCLE1BQU0sc0JBQXNCLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUVoRyxJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFDckIsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO0FBRXRCLE1BQU0sS0FBSyxHQUFHO0lBQ1o7UUFDRSxFQUFFLEVBQUUseUJBQWdCO1FBQ3BCLElBQUksRUFBRSxrQkFBa0I7UUFDeEIsSUFBSSxFQUFFLHlCQUF5QjtRQUMvQixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMseUJBQXlCO1FBQzNDLGFBQWEsRUFBRTtZQUNiLHlCQUF5QjtTQUMxQjtLQUNGO0NBQ0YsQ0FBQztBQUVGLFNBQVMsa0JBQWtCO0lBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUEsNkJBQW9CLEdB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YyxDQUFDLENBQUM7WUFDbEYsZUFBZSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtZQUN2QyxZQUFZLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRztJQUNmLE9BQU8sRUFBRSxJQUFJO0NBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBCbHVlYmlyZCBmcm9tICdibHVlYmlyZCc7XHJcbmltcG9ydCB7IEVsZW1lbnQsIHBhcnNlWG1sU3RyaW5nIH0gZnJvbSAnbGlieG1sanMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0ICogYXMgQlMgZnJvbSAncmVhY3QtYm9vdHN0cmFwJztcclxuaW1wb3J0IHsgYWN0aW9ucywgRmxleExheW91dCwgZnMsIGxvZywgc2VsZWN0b3JzLCB0eXBlcywgdXRpbCB9IGZyb20gJ3ZvcnRleC1hcGknO1xyXG5pbXBvcnQgKiBhcyBJbmlQYXJzZXIgZnJvbSAndm9ydGV4LXBhcnNlLWluaSc7XHJcbmltcG9ydCB3aW5hcGkgZnJvbSAnd2luYXBpLWJpbmRpbmdzJztcclxuXHJcbmltcG9ydCB7IGdlbkNvbGxlY3Rpb25zRGF0YSwgcGFyc2VDb2xsZWN0aW9uc0RhdGEgfSBmcm9tICcuL2NvbGxlY3Rpb25zL2NvbGxlY3Rpb25zJztcclxuaW1wb3J0IHsgSVczQ29sbGVjdGlvbnNEYXRhIH0gZnJvbSAnLi9jb2xsZWN0aW9ucy90eXBlcyc7XHJcbmltcG9ydCBDb2xsZWN0aW9uc0RhdGFWaWV3IGZyb20gJy4vdmlld3MvQ29sbGVjdGlvbnNEYXRhVmlldyc7XHJcblxyXG5pbXBvcnQgbWVudU1vZCBmcm9tICcuL21lbnVtb2QnO1xyXG5pbXBvcnQgeyBkb3dubG9hZFNjcmlwdE1lcmdlciwgZ2V0U2NyaXB0TWVyZ2VyRGlyLCBzZXRNZXJnZXJDb25maWcgfSBmcm9tICcuL3NjcmlwdG1lcmdlcic7XHJcblxyXG5pbXBvcnQgeyBET19OT1RfREVQTE9ZLCBET19OT1RfRElTUExBWSxcclxuICBHQU1FX0lELCBnZXRMb2FkT3JkZXJGaWxlUGF0aCwgZ2V0UHJpb3JpdHlUeXBlQnJhbmNoLCBJMThOX05BTUVTUEFDRSxcclxuICBJTlBVVF9YTUxfRklMRU5BTUUsIExPQ0tFRF9QUkVGSVgsIFBBUlRfU1VGRklYLCBSZXNvdXJjZUluYWNjZXNzaWJsZUVycm9yLFxyXG4gIFNDUklQVF9NRVJHRVJfSUQsIFVOSV9QQVRDSCxcclxufSBmcm9tICcuL2NvbW1vbic7XHJcblxyXG5pbXBvcnQgeyB0ZXN0TW9kTGltaXRCcmVhY2ggfSBmcm9tICcuL3Rlc3RzJztcclxuXHJcbmltcG9ydCB7IE1vZExpbWl0UGF0Y2hlciB9IGZyb20gJy4vbW9kTGltaXRQYXRjaCc7XHJcblxyXG5pbXBvcnQgeyByZWdpc3RlckFjdGlvbnMgfSBmcm9tICcuL2ljb25iYXJBY3Rpb25zJztcclxuaW1wb3J0IHsgUHJpb3JpdHlNYW5hZ2VyIH0gZnJvbSAnLi9wcmlvcml0eU1hbmFnZXInO1xyXG5cclxuaW1wb3J0IHsgaW5zdGFsbE1peGVkLCB0ZXN0U3VwcG9ydGVkTWl4ZWQgfSBmcm9tICcuL2luc3RhbGxlcnMnO1xyXG5pbXBvcnQgeyByZXN0b3JlRnJvbVByb2ZpbGUsIHN0b3JlVG9Qcm9maWxlIH0gZnJvbSAnLi9tZXJnZUJhY2t1cCc7XHJcblxyXG5pbXBvcnQgeyBnZXRNZXJnZWRNb2ROYW1lcyB9IGZyb20gJy4vbWVyZ2VJbnZlbnRvcnlQYXJzaW5nJztcclxuXHJcbmltcG9ydCB7IHNldFByaW9yaXR5VHlwZSB9IGZyb20gJy4vYWN0aW9ucyc7XHJcbmltcG9ydCB7IFczUmVkdWNlciB9IGZyb20gJy4vcmVkdWNlcnMnO1xyXG5cclxuY29uc3QgR09HX0lEID0gJzEyMDc2NjQ2NjMnO1xyXG5jb25zdCBHT0dfSURfR09UWSA9ICcxNDk1MTM0MzIwJztcclxuY29uc3QgU1RFQU1fSUQgPSAnNDk5NDUwJztcclxuXHJcbmNvbnN0IENPTkZJR19NQVRSSVhfUkVMX1BBVEggPSBwYXRoLmpvaW4oJ2JpbicsICdjb25maWcnLCAncjRnYW1lJywgJ3VzZXJfY29uZmlnX21hdHJpeCcsICdwYycpO1xyXG5cclxubGV0IF9JTklfU1RSVUNUID0ge307XHJcbmxldCBfUFJFVklPVVNfTE8gPSB7fTtcclxuXHJcbmNvbnN0IHRvb2xzID0gW1xyXG4gIHtcclxuICAgIGlkOiBTQ1JJUFRfTUVSR0VSX0lELFxyXG4gICAgbmFtZTogJ1czIFNjcmlwdCBNZXJnZXInLFxyXG4gICAgbG9nbzogJ1dpdGNoZXJTY3JpcHRNZXJnZXIuanBnJyxcclxuICAgIGV4ZWN1dGFibGU6ICgpID0+ICdXaXRjaGVyU2NyaXB0TWVyZ2VyLmV4ZScsXHJcbiAgICByZXF1aXJlZEZpbGVzOiBbXHJcbiAgICAgICdXaXRjaGVyU2NyaXB0TWVyZ2VyLmV4ZScsXHJcbiAgICBdLFxyXG4gIH0sXHJcbl07XHJcblxyXG5mdW5jdGlvbiB3cml0ZVRvTW9kU2V0dGluZ3MoKSB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRMb2FkT3JkZXJGaWxlUGF0aCgpO1xyXG4gIGNvbnN0IHBhcnNlciA9IG5ldyBJbmlQYXJzZXIuZGVmYXVsdChuZXcgSW5pUGFyc2VyLldpbmFwaUZvcm1hdCgpKTtcclxuICByZXR1cm4gZnMucmVtb3ZlQXN5bmMoZmlsZVBhdGgpXHJcbiAgICAudGhlbigoKSA9PiBmcy53cml0ZUZpbGVBc3luYyhmaWxlUGF0aCwgJycsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KSlcclxuICAgIC50aGVuKCgpID0+IHBhcnNlci5yZWFkKGZpbGVQYXRoKSlcclxuICAgIC50aGVuKGluaSA9PiB7XHJcbiAgICAgIHJldHVybiBCbHVlYmlyZC5lYWNoKE9iamVjdC5rZXlzKF9JTklfU1RSVUNUKSwgKGtleSkgPT4ge1xyXG4gICAgICAgIGlmIChfSU5JX1NUUlVDVD8uW2tleV0/LkVuYWJsZWQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgLy8gSXQncyBwb3NzaWJsZSBmb3IgdGhlIHVzZXIgdG8gcnVuIG11bHRpcGxlIG9wZXJhdGlvbnMgYXQgb25jZSxcclxuICAgICAgICAgIC8vICBjYXVzaW5nIHRoZSBzdGF0aWMgaW5pIHN0cnVjdHVyZSB0byBiZSBtb2RpZmllZFxyXG4gICAgICAgICAgLy8gIGVsc2V3aGVyZSB3aGlsZSB3ZSdyZSBhdHRlbXB0aW5nIHRvIHdyaXRlIHRvIGZpbGUuIFRoZSB1c2VyIG11c3QndmUgYmVlblxyXG4gICAgICAgICAgLy8gIG1vZGlmeWluZyB0aGUgbG9hZCBvcmRlciB3aGlsZSBkZXBsb3lpbmcuIFRoaXMgc2hvdWxkXHJcbiAgICAgICAgICAvLyAgbWFrZSBzdXJlIHdlIGRvbid0IGF0dGVtcHQgdG8gd3JpdGUgYW55IGludmFsaWQgbW9kIGVudHJpZXMuXHJcbiAgICAgICAgICAvLyAgaHR0cHM6Ly9naXRodWIuY29tL05leHVzLU1vZHMvVm9ydGV4L2lzc3Vlcy84NDM3XHJcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaS5kYXRhW2tleV0gPSB7XHJcbiAgICAgICAgICBFbmFibGVkOiBfSU5JX1NUUlVDVFtrZXldLkVuYWJsZWQsXHJcbiAgICAgICAgICBQcmlvcml0eTogX0lOSV9TVFJVQ1Rba2V5XS5Qcmlvcml0eSxcclxuICAgICAgICAgIFZLOiBfSU5JX1NUUlVDVFtrZXldLlZLLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICB9KVxyXG4gICAgICAudGhlbigoKSA9PiBwYXJzZXIud3JpdGUoZmlsZVBhdGgsIGluaSkpO1xyXG4gICAgfSlcclxuICAgIC5jYXRjaChlcnIgPT4gKGVyci5wYXRoICE9PSB1bmRlZmluZWQgJiYgWydFUEVSTScsICdFQlVTWSddLmluY2x1ZGVzKGVyci5jb2RlKSlcclxuICAgICAgPyBQcm9taXNlLnJlamVjdChuZXcgUmVzb3VyY2VJbmFjY2Vzc2libGVFcnJvcihlcnIucGF0aCkpXHJcbiAgICAgIDogUHJvbWlzZS5yZWplY3QoZXJyKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1vZFNldHRpbmdzKCkge1xyXG4gIGNvbnN0IGZpbGVQYXRoID0gZ2V0TG9hZE9yZGVyRmlsZVBhdGgoKTtcclxuICAvLyBUaGVvcmV0aWNhbGx5IHRoZSBXaXRjaGVyIDMgZG9jdW1lbnRzIHBhdGggc2hvdWxkIGJlXHJcbiAgLy8gIGNyZWF0ZWQgYXQgdGhpcyBwb2ludCAoZWl0aGVyIGJ5IHVzIG9yIHRoZSBnYW1lKSBidXRcclxuICAvLyAganVzdCBpbiBjYXNlIGl0IGdvdCByZW1vdmVkIHNvbWVob3csIHdlIHJlLWluc3RhdGUgaXRcclxuICAvLyAgeWV0IGFnYWluLi4uIGh0dHBzOi8vZ2l0aHViLmNvbS9OZXh1cy1Nb2RzL1ZvcnRleC9pc3N1ZXMvNzA1OFxyXG4gIHJldHVybiBmcy5lbnN1cmVEaXJXcml0YWJsZUFzeW5jKHBhdGguZGlybmFtZShmaWxlUGF0aCkpXHJcbiAgICAudGhlbigoKSA9PiBmcy53cml0ZUZpbGVBc3luYyhmaWxlUGF0aCwgJycsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KSk7XHJcbn1cclxuXHJcbi8vIEF0dGVtcHRzIHRvIHBhcnNlIGFuZCByZXR1cm4gZGF0YSBmb3VuZCBpbnNpZGVcclxuLy8gIHRoZSBtb2RzLnNldHRpbmdzIGZpbGUgaWYgZm91bmQgLSBvdGhlcndpc2UgdGhpc1xyXG4vLyAgd2lsbCBlbnN1cmUgdGhlIGZpbGUgaXMgcHJlc2VudC5cclxuZnVuY3Rpb24gZW5zdXJlTW9kU2V0dGluZ3MoKSB7XHJcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRMb2FkT3JkZXJGaWxlUGF0aCgpO1xyXG4gIGNvbnN0IHBhcnNlciA9IG5ldyBJbmlQYXJzZXIuZGVmYXVsdChuZXcgSW5pUGFyc2VyLldpbmFwaUZvcm1hdCgpKTtcclxuICByZXR1cm4gZnMuc3RhdEFzeW5jKGZpbGVQYXRoKVxyXG4gICAgLnRoZW4oKCkgPT4gcGFyc2VyLnJlYWQoZmlsZVBhdGgpKVxyXG4gICAgLmNhdGNoKGVyciA9PiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKVxyXG4gICAgICA/IGNyZWF0ZU1vZFNldHRpbmdzKCkudGhlbigoKSA9PiBwYXJzZXIucmVhZChmaWxlUGF0aCkpXHJcbiAgICAgIDogUHJvbWlzZS5yZWplY3QoZXJyKSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldE1hbnVhbGx5QWRkZWRNb2RzKGNvbnRleHQpIHtcclxuICByZXR1cm4gZW5zdXJlTW9kU2V0dGluZ3MoKS50aGVuKGluaSA9PiB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBtb2RzID0gdXRpbC5nZXRTYWZlKHN0YXRlLCBbJ3BlcnNpc3RlbnQnLCAnbW9kcycsIEdBTUVfSURdLCB7fSk7XHJcbiAgICBjb25zdCBtb2RLZXlzID0gT2JqZWN0LmtleXMobW9kcyk7XHJcbiAgICBjb25zdCBpbmlFbnRyaWVzID0gT2JqZWN0LmtleXMoaW5pLmRhdGEpO1xyXG4gICAgY29uc3QgbWFudWFsQ2FuZGlkYXRlcyA9IFtdLmNvbmNhdChpbmlFbnRyaWVzLCBbVU5JX1BBVENIXSkuZmlsdGVyKGVudHJ5ID0+IHtcclxuICAgICAgY29uc3QgaGFzVm9ydGV4S2V5ID0gdXRpbC5nZXRTYWZlKGluaS5kYXRhW2VudHJ5XSwgWydWSyddLCB1bmRlZmluZWQpICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgIHJldHVybiAoKCFoYXNWb3J0ZXhLZXkpIHx8IChpbmkuZGF0YVtlbnRyeV0uVksgPT09IGVudHJ5KSAmJiAhbW9kS2V5cy5pbmNsdWRlcyhlbnRyeSkpO1xyXG4gICAgfSkgfHwgW1VOSV9QQVRDSF07XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBTZXQobWFudWFsQ2FuZGlkYXRlcykpO1xyXG4gIH0pXHJcbiAgLnRoZW4odW5pcXVlQ2FuZGlkYXRlcyA9PiB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBkaXNjb3ZlcnkgPSB1dGlsLmdldFNhZmUoc3RhdGUsXHJcbiAgICAgIFsnc2V0dGluZ3MnLCAnZ2FtZU1vZGUnLCAnZGlzY292ZXJlZCcsIEdBTUVfSURdLCB1bmRlZmluZWQpO1xyXG4gICAgaWYgKGRpc2NvdmVyeT8ucGF0aCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIC8vIEhvdy93aHkgYXJlIHdlIGV2ZW4gaGVyZSA/XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgdXRpbC5Qcm9jZXNzQ2FuY2VsZWQoJ0dhbWUgaXMgbm90IGRpc2NvdmVyZWQhJykpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgbW9kc1BhdGggPSBwYXRoLmpvaW4oZGlzY292ZXJ5LnBhdGgsICdNb2RzJyk7XHJcbiAgICByZXR1cm4gQmx1ZWJpcmQucmVkdWNlKEFycmF5LmZyb20odW5pcXVlQ2FuZGlkYXRlcyksIChhY2N1bSwgbW9kKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vZEZvbGRlciA9IHBhdGguam9pbihtb2RzUGF0aCwgbW9kKTtcclxuICAgICAgcmV0dXJuIGZzLnN0YXRBc3luYyhwYXRoLmpvaW4obW9kRm9sZGVyKSlcclxuICAgICAgICAudGhlbigoKSA9PiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgLy8gT2ssIHdlIGtub3cgdGhlIGZvbGRlciBpcyB0aGVyZSAtIGxldHMgZW5zdXJlIHRoYXRcclxuICAgICAgICAgIC8vICBpdCBhY3R1YWxseSBjb250YWlucyBmaWxlcy5cclxuICAgICAgICAgIGxldCBjYW5kaWRhdGVzID0gW107XHJcbiAgICAgICAgICBhd2FpdCByZXF1aXJlKCd0dXJib3dhbGsnKS5kZWZhdWx0KHBhdGguam9pbihtb2RzUGF0aCwgbW9kKSwgZW50cmllcyA9PiB7XHJcbiAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBbXS5jb25jYXQoY2FuZGlkYXRlcywgZW50cmllcy5maWx0ZXIoZW50cnkgPT4gKCFlbnRyeS5pc0RpcmVjdG9yeSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgKHBhdGguZXh0bmFtZShwYXRoLmJhc2VuYW1lKGVudHJ5LmZpbGVQYXRoKSkgIT09ICcnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAoZW50cnk/LmxpbmtDb3VudCA9PT0gdW5kZWZpbmVkIHx8IGVudHJ5LmxpbmtDb3VudCA8PSAxKSkpO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5jYXRjaChlcnIgPT4gKFsnRU5PRU5UJywgJ0VOT1RGT1VORCddLmluZGV4T2YoZXJyLmNvZGUpICE9PSAtMSlcclxuICAgICAgICAgICAgPyBudWxsIC8vIGRvIG5vdGhpbmdcclxuICAgICAgICAgICAgOiBQcm9taXNlLnJlamVjdChlcnIpKTtcclxuXHJcbiAgICAgICAgICBjb25zdCBtYXBwZWQgPSBhd2FpdCBCbHVlYmlyZC5tYXAoY2FuZGlkYXRlcywgY2FuZCA9PlxyXG4gICAgICAgICAgICBmcy5zdGF0QXN5bmMoY2FuZC5maWxlUGF0aClcclxuICAgICAgICAgICAgICAudGhlbihzdGF0cyA9PiBzdGF0cy5pc1N5bWJvbGljTGluaygpXHJcbiAgICAgICAgICAgICAgICA/IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICA6IFByb21pc2UucmVzb2x2ZShjYW5kLmZpbGVQYXRoKSlcclxuICAgICAgICAgICAgICAuY2F0Y2goZXJyID0+IFByb21pc2UucmVzb2x2ZSh1bmRlZmluZWQpKSk7XHJcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZShtYXBwZWQpO1xyXG4gICAgICAgIH0pKVxyXG4gICAgICAgIC50aGVuKChmaWxlczogc3RyaW5nW10pID0+IHtcclxuICAgICAgICAgIGlmIChmaWxlcy5maWx0ZXIoZmlsZSA9PiAhIWZpbGUpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgYWNjdW0ucHVzaChtb2QpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhY2N1bSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goZXJyID0+ICgoZXJyLmNvZGUgPT09ICdFTk9FTlQnKSAmJiAoZXJyLnBhdGggPT09IG1vZEZvbGRlcikpXHJcbiAgICAgICAgICA/IFByb21pc2UucmVzb2x2ZShhY2N1bSlcclxuICAgICAgICAgIDogUHJvbWlzZS5yZWplY3QoZXJyKSk7XHJcbiAgICB9LCBbXSk7XHJcbiAgfSlcclxuICAuY2F0Y2goZXJyID0+IHtcclxuICAgIC8vIFVzZXJDYW5jZWxlZCB3b3VsZCBzdWdnZXN0IHdlIHdlcmUgdW5hYmxlIHRvIHN0YXQgdGhlIFczIG1vZCBmb2xkZXJcclxuICAgIC8vICBwcm9iYWJseSBkdWUgdG8gYSBwZXJtaXNzaW9uaW5nIGlzc3VlIChFTk9FTlQgaXMgaGFuZGxlZCBhYm92ZSlcclxuICAgIGNvbnN0IHVzZXJDYW5jZWxlZCA9IChlcnIgaW5zdGFuY2VvZiB1dGlsLlVzZXJDYW5jZWxlZCk7XHJcbiAgICBjb25zdCBwcm9jZXNzQ2FuY2VsZWQgPSAoZXJyIGluc3RhbmNlb2YgdXRpbC5Qcm9jZXNzQ2FuY2VsZWQpO1xyXG4gICAgY29uc3QgYWxsb3dSZXBvcnQgPSAoIXVzZXJDYW5jZWxlZCAmJiAhcHJvY2Vzc0NhbmNlbGVkKTtcclxuICAgIGNvbnN0IGRldGFpbHMgPSB1c2VyQ2FuY2VsZWRcclxuICAgICAgPyAnVm9ydGV4IHRyaWVkIHRvIHNjYW4geW91ciBXMyBtb2RzIGZvbGRlciBmb3IgbWFudWFsbHkgYWRkZWQgbW9kcyBidXQgJ1xyXG4gICAgICAgICsgJ3dhcyBibG9ja2VkIGJ5IHlvdXIgT1MvQVYgLSBwbGVhc2UgbWFrZSBzdXJlIHRvIGZpeCB0aGlzIGJlZm9yZSB5b3UgJ1xyXG4gICAgICAgICsgJ3Byb2NlZWQgdG8gbW9kIFczIGFzIHlvdXIgbW9kZGluZyBleHBlcmllbmNlIHdpbGwgYmUgc2V2ZXJlbHkgYWZmZWN0ZWQuJ1xyXG4gICAgICA6IGVycjtcclxuICAgIGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignRmFpbGVkIHRvIGxvb2t1cCBtYW51YWxseSBhZGRlZCBtb2RzJyxcclxuICAgICAgZGV0YWlscywgeyBhbGxvd1JlcG9ydCB9KTtcclxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kR2FtZSgpOiBCbHVlYmlyZDxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgaW5zdFBhdGggPSB3aW5hcGkuUmVnR2V0VmFsdWUoXHJcbiAgICAgICdIS0VZX0xPQ0FMX01BQ0hJTkUnLFxyXG4gICAgICAnU29mdHdhcmVcXFxcQ0QgUHJvamVjdCBSZWRcXFxcVGhlIFdpdGNoZXIgMycsXHJcbiAgICAgICdJbnN0YWxsRm9sZGVyJyk7XHJcbiAgICBpZiAoIWluc3RQYXRoKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignZW1wdHkgcmVnaXN0cnkga2V5Jyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gQmx1ZWJpcmQucmVzb2x2ZShpbnN0UGF0aC52YWx1ZSBhcyBzdHJpbmcpO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgcmV0dXJuIHV0aWwuR2FtZVN0b3JlSGVscGVyLmZpbmRCeUFwcElkKFtHT0dfSURfR09UWSwgR09HX0lELCBTVEVBTV9JRF0pXHJcbiAgICAgIC50aGVuKGdhbWUgPT4gZ2FtZS5nYW1lUGF0aCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0ZXN0U3VwcG9ydGVkVEwoZmlsZXMsIGdhbWVJZCkge1xyXG4gIGNvbnN0IHN1cHBvcnRlZCA9IChnYW1lSWQgPT09ICd3aXRjaGVyMycpXHJcbiAgICAmJiAoZmlsZXMuZmluZChmaWxlID0+XHJcbiAgICAgIGZpbGUudG9Mb3dlckNhc2UoKS5zcGxpdChwYXRoLnNlcCkuaW5kZXhPZignbW9kcycpICE9PSAtMSkgIT09IHVuZGVmaW5lZCk7XHJcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICBzdXBwb3J0ZWQsXHJcbiAgICByZXF1aXJlZEZpbGVzOiBbXSxcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5zdGFsbFRMKGZpbGVzLFxyXG4gICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25QYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgZ2FtZUlkLFxyXG4gICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NEZWxlZ2F0ZSkge1xyXG4gIGxldCBwcmVmaXggPSBmaWxlcy5yZWR1Y2UoKHByZXYsIGZpbGUpID0+IHtcclxuICAgIGNvbnN0IGNvbXBvbmVudHMgPSBmaWxlLnRvTG93ZXJDYXNlKCkuc3BsaXQocGF0aC5zZXApO1xyXG4gICAgY29uc3QgaWR4ID0gY29tcG9uZW50cy5pbmRleE9mKCdtb2RzJyk7XHJcbiAgICBpZiAoKGlkeCA+IDApICYmICgocHJldiA9PT0gdW5kZWZpbmVkKSB8fCAoaWR4IDwgcHJldi5sZW5ndGgpKSkge1xyXG4gICAgICByZXR1cm4gY29tcG9uZW50cy5zbGljZSgwLCBpZHgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHByZXY7XHJcbiAgICB9XHJcbiAgfSwgdW5kZWZpbmVkKTtcclxuXHJcbiAgcHJlZml4ID0gKHByZWZpeCA9PT0gdW5kZWZpbmVkKSA/ICcnIDogcHJlZml4LmpvaW4ocGF0aC5zZXApICsgcGF0aC5zZXA7XHJcblxyXG4gIGNvbnN0IGluc3RydWN0aW9ucyA9IGZpbGVzXHJcbiAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgocGF0aC5zZXApICYmIGZpbGUudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKHByZWZpeCkpXHJcbiAgICAubWFwKGZpbGUgPT4gKHtcclxuICAgICAgdHlwZTogJ2NvcHknLFxyXG4gICAgICBzb3VyY2U6IGZpbGUsXHJcbiAgICAgIGRlc3RpbmF0aW9uOiBmaWxlLnNsaWNlKHByZWZpeC5sZW5ndGgpLFxyXG4gICAgfSkpO1xyXG5cclxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHsgaW5zdHJ1Y3Rpb25zIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0ZXN0U3VwcG9ydGVkQ29udGVudChmaWxlcywgZ2FtZUlkKSB7XHJcbiAgY29uc3Qgc3VwcG9ydGVkID0gKGdhbWVJZCA9PT0gR0FNRV9JRClcclxuICAgICYmIChmaWxlcy5maW5kKGZpbGUgPT4gZmlsZS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2NvbnRlbnQnICsgcGF0aC5zZXApICE9PSB1bmRlZmluZWQpKTtcclxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcclxuICAgIHN1cHBvcnRlZCxcclxuICAgIHJlcXVpcmVkRmlsZXM6IFtdLFxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbnN0YWxsQ29udGVudChmaWxlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25QYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnYW1lSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzRGVsZWdhdGUpIHtcclxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZpbGVzXHJcbiAgICAuZmlsdGVyKGZpbGUgPT4gZmlsZS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2NvbnRlbnQnICsgcGF0aC5zZXApKVxyXG4gICAgLm1hcChmaWxlID0+IHtcclxuICAgICAgY29uc3QgZmlsZUJhc2UgPSBmaWxlLnNwbGl0KHBhdGguc2VwKS5zbGljZSgxKS5qb2luKHBhdGguc2VwKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0eXBlOiAnY29weScsXHJcbiAgICAgICAgc291cmNlOiBmaWxlLFxyXG4gICAgICAgIGRlc3RpbmF0aW9uOiBwYXRoLmpvaW4oJ21vZCcgKyBkZXN0aW5hdGlvblBhdGgsIGZpbGVCYXNlKSxcclxuICAgICAgfTtcclxuICB9KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluc3RhbGxNZW51TW9kKGZpbGVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvblBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NEZWxlZ2F0ZSkge1xyXG4gIC8vIElucHV0IHNwZWNpZmljIGZpbGVzIG5lZWQgdG8gYmUgaW5zdGFsbGVkIG91dHNpZGUgdGhlIG1vZHMgZm9sZGVyIHdoaWxlXHJcbiAgLy8gIGFsbCBvdGhlciBtb2QgZmlsZXMgYXJlIHRvIGJlIGluc3RhbGxlZCBhcyB1c3VhbC5cclxuICBjb25zdCBmaWx0ZXJlZCA9IGZpbGVzLmZpbHRlcihmaWxlID0+IHBhdGguZXh0bmFtZShwYXRoLmJhc2VuYW1lKGZpbGUpKSAhPT0gJycpO1xyXG4gIGNvbnN0IGlucHV0RmlsZXMgPSBmaWx0ZXJlZC5maWx0ZXIoZmlsZSA9PiBmaWxlLmluZGV4T2YoQ09ORklHX01BVFJJWF9SRUxfUEFUSCkgIT09IC0xKTtcclxuICBjb25zdCB1bmlxdWVJbnB1dCA9IGlucHV0RmlsZXMucmVkdWNlKChhY2N1bSwgaXRlcikgPT4ge1xyXG4gICAgLy8gU29tZSBtb2RzIHRlbmQgdG8gaW5jbHVkZSBhIGJhY2t1cCBmaWxlIG1lYW50IGZvciB0aGUgdXNlciB0byByZXN0b3JlXHJcbiAgICAvLyAgaGlzIGdhbWUgdG8gdmFuaWxsYSAob2J2cyB3ZSBvbmx5IHdhbnQgdG8gYXBwbHkgdGhlIG5vbi1iYWNrdXApLlxyXG4gICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGl0ZXIpO1xyXG5cclxuICAgIGlmIChhY2N1bS5maW5kKGVudHJ5ID0+IHBhdGguYmFzZW5hbWUoZW50cnkpID09PSBmaWxlTmFtZSkgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAvLyBUaGlzIGNvbmZpZyBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gYWRkZWQgdG8gdGhlIGFjY3VtdWxhdG9yLlxyXG4gICAgICAvLyAgSWdub3JlIHRoaXMgaW5zdGFuY2UuXHJcbiAgICAgIHJldHVybiBhY2N1bTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBpbnN0YW5jZXMgPSBpbnB1dEZpbGVzLmZpbHRlcihmaWxlID0+IHBhdGguYmFzZW5hbWUoZmlsZSkgPT09IGZpbGVOYW1lKTtcclxuICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICAvLyBXZSBoYXZlIG11bHRpcGxlIGluc3RhbmNlcyBvZiB0aGUgc2FtZSBtZW51IGNvbmZpZyBmaWxlIC0gbW9kIGF1dGhvciBwcm9iYWJseSBpbmNsdWRlZFxyXG4gICAgICAvLyAgYSBiYWNrdXAgZmlsZSB0byByZXN0b3JlIHZhbmlsbGEgc3RhdGUsIG9yIHBlcmhhcHMgdGhpcyBpcyBhIHZhcmlhbnQgbW9kIHdoaWNoIHdlXHJcbiAgICAgIC8vICBjYW4ndCBjdXJyZW50bHkgc3VwcG9ydC5cclxuICAgICAgLy8gSXQncyBkaWZmaWN1bHQgZm9yIHVzIHRvIGNvcnJlY3RseSBpZGVudGlmeSB0aGUgY29ycmVjdCBmaWxlIGJ1dCB3ZSdyZSBnb2luZyB0b1xyXG4gICAgICAvLyAgdHJ5IGFuZCBndWVzcyBiYXNlZCBvbiB3aGV0aGVyIHRoZSBjb25maWcgZmlsZSBoYXMgYSBcImJhY2t1cFwiIGZvbGRlciBzZWdtZW50XHJcbiAgICAgIC8vICBvdGhlcndpc2Ugd2UganVzdCBhZGQgdGhlIGZpcnN0IGZpbGUgaW5zdGFuY2UgKEknbSBnb2luZyB0byByZWdyZXQgYWRkaW5nIHRoaXMgYXJlbid0IEkgPylcclxuICAgICAgaWYgKGl0ZXIudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdiYWNrdXAnKSA9PT0gLTEpIHtcclxuICAgICAgICAvLyBXZSdyZSBnb2luZyB0byBhc3N1bWUgdGhhdCB0aGlzIGlzIHRoZSByaWdodCBmaWxlLlxyXG4gICAgICAgIGFjY3VtLnB1c2goaXRlcik7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIFRoaXMgaXMgYSB1bmlxdWUgbWVudSBjb25maWd1cmF0aW9uIGZpbGUgLSBhZGQgaXQuXHJcbiAgICAgIGFjY3VtLnB1c2goaXRlcik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYWNjdW07XHJcbiAgfSwgW10pO1xyXG5cclxuICBsZXQgb3RoZXJGaWxlcyA9IGZpbHRlcmVkLmZpbHRlcihmaWxlID0+ICFpbnB1dEZpbGVzLmluY2x1ZGVzKGZpbGUpKTtcclxuICBjb25zdCBpbnB1dEZpbGVEZXN0aW5hdGlvbiA9IENPTkZJR19NQVRSSVhfUkVMX1BBVEg7XHJcblxyXG4gIC8vIEdldCB0aGUgbW9kJ3Mgcm9vdCBmb2xkZXIuXHJcbiAgY29uc3QgYmluSWR4ID0gdW5pcXVlSW5wdXRbMF0uc3BsaXQocGF0aC5zZXApLmluZGV4T2YoJ2JpbicpO1xyXG5cclxuICAvLyBSZWZlcnMgdG8gZmlsZXMgbG9jYXRlZCBpbnNpZGUgdGhlIGFyY2hpdmUncyAnTW9kcycgZGlyZWN0b3J5LlxyXG4gIC8vICBUaGlzIGFycmF5IGNhbiB2ZXJ5IHdlbGwgYmUgZW1wdHkgaWYgYSBtb2RzIGZvbGRlciBkb2Vzbid0IGV4aXN0XHJcbiAgY29uc3QgbW9kRmlsZXMgPSBvdGhlckZpbGVzLmZpbHRlcihmaWxlID0+XHJcbiAgICBmaWxlLnRvTG93ZXJDYXNlKCkuc3BsaXQocGF0aC5zZXApLmluY2x1ZGVzKCdtb2RzJykpO1xyXG5cclxuICBjb25zdCBtb2RzSWR4ID0gKG1vZEZpbGVzLmxlbmd0aCA+IDApXHJcbiAgICA/IG1vZEZpbGVzWzBdLnRvTG93ZXJDYXNlKCkuc3BsaXQocGF0aC5zZXApLmluZGV4T2YoJ21vZHMnKVxyXG4gICAgOiAtMTtcclxuICBjb25zdCBtb2ROYW1lcyA9IChtb2RzSWR4ICE9PSAtMSlcclxuICAgID8gbW9kRmlsZXMucmVkdWNlKChhY2N1bSwgaXRlcikgPT4ge1xyXG4gICAgICBjb25zdCBtb2ROYW1lID0gaXRlci5zcGxpdChwYXRoLnNlcCkuc3BsaWNlKG1vZHNJZHggKyAxLCAxKS5qb2luKCk7XHJcbiAgICAgIGlmICghYWNjdW0uaW5jbHVkZXMobW9kTmFtZSkpIHtcclxuICAgICAgICBhY2N1bS5wdXNoKG1vZE5hbWUpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBhY2N1bTtcclxuICAgIH0sIFtdKVxyXG4gICAgOiBbXTtcclxuICAvLyBUaGUgcHJlc2VuY2Ugb2YgYSBtb2RzIGZvbGRlciBpbmRpY2F0ZXMgdGhhdCB0aGlzIG1vZCBtYXkgcHJvdmlkZVxyXG4gIC8vICBzZXZlcmFsIG1vZCBlbnRyaWVzLlxyXG4gIGlmIChtb2RGaWxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICBvdGhlckZpbGVzID0gb3RoZXJGaWxlcy5maWx0ZXIoZmlsZSA9PiAhbW9kRmlsZXMuaW5jbHVkZXMoZmlsZSkpO1xyXG4gIH1cclxuXHJcbiAgLy8gV2UncmUgaG9waW5nIHRoYXQgdGhlIG1vZCBhdXRob3IgaGFzIGluY2x1ZGVkIHRoZSBtb2QgbmFtZSBpbiB0aGUgYXJjaGl2ZSdzXHJcbiAgLy8gIHN0cnVjdHVyZSAtIGlmIGhlIGRpZG4ndCAtIHdlJ3JlIGdvaW5nIHRvIHVzZSB0aGUgZGVzdGluYXRpb24gcGF0aCBpbnN0ZWFkLlxyXG4gIGNvbnN0IG1vZE5hbWUgPSAoYmluSWR4ID4gMClcclxuICAgID8gaW5wdXRGaWxlc1swXS5zcGxpdChwYXRoLnNlcClbYmluSWR4IC0gMV1cclxuICAgIDogKCdtb2QnICsgcGF0aC5iYXNlbmFtZShkZXN0aW5hdGlvblBhdGgsICcuaW5zdGFsbGluZycpKS5yZXBsYWNlKC9cXHMvZywgJycpO1xyXG5cclxuICBjb25zdCB0cmltbWVkRmlsZXMgPSBvdGhlckZpbGVzLm1hcChmaWxlID0+IHtcclxuICAgIGNvbnN0IHNvdXJjZSA9IGZpbGU7XHJcbiAgICBsZXQgcmVsUGF0aCA9IGZpbGUuc3BsaXQocGF0aC5zZXApXHJcbiAgICAgICAgICAgICAgICAgICAgICAuc2xpY2UoYmluSWR4KTtcclxuICAgIGlmIChyZWxQYXRoWzBdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgLy8gVGhpcyBmaWxlIG11c3QndmUgYmVlbiBpbnNpZGUgdGhlIHJvb3Qgb2YgdGhlIGFyY2hpdmU7XHJcbiAgICAgIC8vICBkZXBsb3kgYXMgaXMuXHJcbiAgICAgIHJlbFBhdGggPSBmaWxlLnNwbGl0KHBhdGguc2VwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaXJzdFNlZyA9IHJlbFBhdGhbMF0udG9Mb3dlckNhc2UoKTtcclxuICAgIGlmIChmaXJzdFNlZyA9PT0gJ2NvbnRlbnQnIHx8IGZpcnN0U2VnLmVuZHNXaXRoKFBBUlRfU1VGRklYKSkge1xyXG4gICAgICByZWxQYXRoID0gW10uY29uY2F0KFsnTW9kcycsIG1vZE5hbWVdLCByZWxQYXRoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzb3VyY2UsXHJcbiAgICAgIHJlbFBhdGg6IHJlbFBhdGguam9pbihwYXRoLnNlcCksXHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCB0b0NvcHlJbnN0cnVjdGlvbiA9IChzb3VyY2UsIGRlc3RpbmF0aW9uKSA9PiAoe1xyXG4gICAgdHlwZTogJ2NvcHknLFxyXG4gICAgc291cmNlLFxyXG4gICAgZGVzdGluYXRpb24sXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGlucHV0SW5zdHJ1Y3Rpb25zID0gdW5pcXVlSW5wdXQubWFwKGZpbGUgPT5cclxuICAgIHRvQ29weUluc3RydWN0aW9uKGZpbGUsIHBhdGguam9pbihpbnB1dEZpbGVEZXN0aW5hdGlvbiwgcGF0aC5iYXNlbmFtZShmaWxlKSkpKTtcclxuXHJcbiAgY29uc3Qgb3RoZXJJbnN0cnVjdGlvbnMgPSB0cmltbWVkRmlsZXMubWFwKGZpbGUgPT5cclxuICAgIHRvQ29weUluc3RydWN0aW9uKGZpbGUuc291cmNlLCBmaWxlLnJlbFBhdGgpKTtcclxuXHJcbiAgY29uc3QgbW9kRmlsZUluc3RydWN0aW9ucyA9IG1vZEZpbGVzLm1hcChmaWxlID0+XHJcbiAgICB0b0NvcHlJbnN0cnVjdGlvbihmaWxlLCBmaWxlKSk7XHJcblxyXG4gIGNvbnN0IGluc3RydWN0aW9ucyA9IFtdLmNvbmNhdChpbnB1dEluc3RydWN0aW9ucywgb3RoZXJJbnN0cnVjdGlvbnMsIG1vZEZpbGVJbnN0cnVjdGlvbnMpO1xyXG4gIGlmIChtb2ROYW1lcy5sZW5ndGggPiAwKSB7XHJcbiAgICBpbnN0cnVjdGlvbnMucHVzaCh7XHJcbiAgICAgIHR5cGU6ICdhdHRyaWJ1dGUnLFxyXG4gICAgICBrZXk6ICdtb2RDb21wb25lbnRzJyxcclxuICAgICAgdmFsdWU6IG1vZE5hbWVzLFxyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoeyBpbnN0cnVjdGlvbnMgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRlc3RNZW51TW9kUm9vdChpbnN0cnVjdGlvbnM6IGFueVtdLCBnYW1lSWQ6IHN0cmluZyk6XHJcbiAgUHJvbWlzZTx0eXBlcy5JU3VwcG9ydGVkUmVzdWx0IHwgYm9vbGVhbj4ge1xyXG4gIGNvbnN0IHByZWRpY2F0ZSA9IChpbnN0cikgPT4gKCEhZ2FtZUlkKVxyXG4gICAgPyAoKEdBTUVfSUQgPT09IGdhbWVJZCkgJiYgKGluc3RyLmluZGV4T2YoQ09ORklHX01BVFJJWF9SRUxfUEFUSCkgIT09IC0xKSlcclxuICAgIDogKChpbnN0ci50eXBlID09PSAnY29weScpICYmIChpbnN0ci5kZXN0aW5hdGlvbi5pbmRleE9mKENPTkZJR19NQVRSSVhfUkVMX1BBVEgpICE9PSAtMSkpO1xyXG5cclxuICByZXR1cm4gKCEhZ2FtZUlkKVxyXG4gICAgPyBQcm9taXNlLnJlc29sdmUoe1xyXG4gICAgICAgIHN1cHBvcnRlZDogaW5zdHJ1Y3Rpb25zLmZpbmQocHJlZGljYXRlKSAhPT0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHJlcXVpcmVkRmlsZXM6IFtdLFxyXG4gICAgICB9KVxyXG4gICAgOiBQcm9taXNlLnJlc29sdmUoaW5zdHJ1Y3Rpb25zLmZpbmQocHJlZGljYXRlKSAhPT0gdW5kZWZpbmVkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdGVzdFRMKGluc3RydWN0aW9ucykge1xyXG4gIGNvbnN0IG1lbnVNb2RGaWxlcyA9IGluc3RydWN0aW9ucy5maWx0ZXIoaW5zdHIgPT4gISFpbnN0ci5kZXN0aW5hdGlvblxyXG4gICAgJiYgaW5zdHIuZGVzdGluYXRpb24uaW5kZXhPZihDT05GSUdfTUFUUklYX1JFTF9QQVRIKSAhPT0gLTEpO1xyXG4gIGlmIChtZW51TW9kRmlsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RydWN0aW9ucy5maW5kKFxyXG4gICAgaW5zdHJ1Y3Rpb24gPT4gISFpbnN0cnVjdGlvbi5kZXN0aW5hdGlvbiAmJiBpbnN0cnVjdGlvbi5kZXN0aW5hdGlvbi50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ21vZHMnICsgcGF0aC5zZXApLFxyXG4gICkgIT09IHVuZGVmaW5lZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRlc3RETEMoaW5zdHJ1Y3Rpb25zKSB7XHJcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpbnN0cnVjdGlvbnMuZmluZChcclxuICAgIGluc3RydWN0aW9uID0+ICEhaW5zdHJ1Y3Rpb24uZGVzdGluYXRpb24gJiYgaW5zdHJ1Y3Rpb24uZGVzdGluYXRpb24udG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCdkbGMnICsgcGF0aC5zZXApKSAhPT0gdW5kZWZpbmVkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbm90aWZ5TWlzc2luZ1NjcmlwdE1lcmdlcihhcGkpIHtcclxuICBjb25zdCBub3RpZklkID0gJ21pc3Npbmctc2NyaXB0LW1lcmdlcic7XHJcbiAgYXBpLnNlbmROb3RpZmljYXRpb24oe1xyXG4gICAgaWQ6IG5vdGlmSWQsXHJcbiAgICB0eXBlOiAnaW5mbycsXHJcbiAgICBtZXNzYWdlOiBhcGkudHJhbnNsYXRlKCdXaXRjaGVyIDMgc2NyaXB0IG1lcmdlciBpcyBtaXNzaW5nL21pc2NvbmZpZ3VyZWQnLFxyXG4gICAgICB7IG5zOiBJMThOX05BTUVTUEFDRSB9KSxcclxuICAgIGFsbG93U3VwcHJlc3M6IHRydWUsXHJcbiAgICBhY3Rpb25zOiBbXHJcbiAgICAgIHtcclxuICAgICAgICB0aXRsZTogJ01vcmUnLFxyXG4gICAgICAgIGFjdGlvbjogKCkgPT4ge1xyXG4gICAgICAgICAgYXBpLnNob3dEaWFsb2coJ2luZm8nLCAnV2l0Y2hlciAzIFNjcmlwdCBNZXJnZXInLCB7XHJcbiAgICAgICAgICAgIGJiY29kZTogYXBpLnRyYW5zbGF0ZSgnVm9ydGV4IGlzIHVuYWJsZSB0byByZXNvbHZlIHRoZSBTY3JpcHQgTWVyZ2VyXFwncyBsb2NhdGlvbi4gVGhlIHRvb2wgbmVlZHMgdG8gYmUgZG93bmxvYWRlZCBhbmQgY29uZmlndXJlZCBtYW51YWxseS4gJ1xyXG4gICAgICAgICAgICAgICsgJ1t1cmw9aHR0cHM6Ly93aWtpLm5leHVzbW9kcy5jb20vaW5kZXgucGhwL1Rvb2xfU2V0dXA6X1dpdGNoZXJfM19TY3JpcHRfTWVyZ2VyXUZpbmQgb3V0IG1vcmUgYWJvdXQgaG93IHRvIGNvbmZpZ3VyZSBpdCBhcyBhIHRvb2wgZm9yIHVzZSBpbiBWb3J0ZXguWy91cmxdW2JyXVsvYnJdW2JyXVsvYnJdJ1xyXG4gICAgICAgICAgICAgICsgJ05vdGU6IFdoaWxlIHNjcmlwdCBtZXJnaW5nIHdvcmtzIHdlbGwgd2l0aCB0aGUgdmFzdCBtYWpvcml0eSBvZiBtb2RzLCB0aGVyZSBpcyBubyBndWFyYW50ZWUgZm9yIGEgc2F0aXNmeWluZyBvdXRjb21lIGluIGV2ZXJ5IHNpbmdsZSBjYXNlLicsIHsgbnM6IEkxOE5fTkFNRVNQQUNFIH0pLFxyXG4gICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICB7IGxhYmVsOiAnQ2FuY2VsJywgYWN0aW9uOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgYXBpLmRpc21pc3NOb3RpZmljYXRpb24oJ21pc3Npbmctc2NyaXB0LW1lcmdlcicpO1xyXG4gICAgICAgICAgICB9fSxcclxuICAgICAgICAgICAgeyBsYWJlbDogJ0Rvd25sb2FkIFNjcmlwdCBNZXJnZXInLCBhY3Rpb246ICgpID0+IHV0aWwub3BuKCdodHRwczovL3d3dy5uZXh1c21vZHMuY29tL3dpdGNoZXIzL21vZHMvNDg0JylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiBhcGkuZGlzbWlzc05vdGlmaWNhdGlvbignbWlzc2luZy1zY3JpcHQtbWVyZ2VyJykpIH0sXHJcbiAgICAgICAgICBdKTtcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgXSxcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJlcGFyZUZvck1vZGRpbmcoY29udGV4dCwgZGlzY292ZXJ5KSB7XHJcbiAgY29uc3QgZmluZFNjcmlwdE1lcmdlciA9IChlcnJvcikgPT4ge1xyXG4gICAgbG9nKCdlcnJvcicsICdmYWlsZWQgdG8gZG93bmxvYWQvaW5zdGFsbCBzY3JpcHQgbWVyZ2VyJywgZXJyb3IpO1xyXG4gICAgY29uc3Qgc2NyaXB0TWVyZ2VyUGF0aCA9IGdldFNjcmlwdE1lcmdlckRpcihjb250ZXh0KTtcclxuICAgIGlmIChzY3JpcHRNZXJnZXJQYXRoID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgbm90aWZ5TWlzc2luZ1NjcmlwdE1lcmdlcihjb250ZXh0LmFwaSk7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChkaXNjb3Zlcnk/LnRvb2xzPy5XM1NjcmlwdE1lcmdlciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIHNldE1lcmdlckNvbmZpZyhkaXNjb3ZlcnkucGF0aCwgc2NyaXB0TWVyZ2VyUGF0aCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjb25zdCBlbnN1cmVQYXRoID0gKGRpcnBhdGgpID0+XHJcbiAgICBmcy5lbnN1cmVEaXJXcml0YWJsZUFzeW5jKGRpcnBhdGgpXHJcbiAgICAgIC5jYXRjaChlcnIgPT4gKGVyci5jb2RlID09PSAnRUVYSVNUJylcclxuICAgICAgICA/IFByb21pc2UucmVzb2x2ZSgpXHJcbiAgICAgICAgOiBQcm9taXNlLnJlamVjdChlcnIpKTtcclxuXHJcbiAgcmV0dXJuIFByb21pc2UuYWxsKFtcclxuICAgIGVuc3VyZVBhdGgocGF0aC5qb2luKGRpc2NvdmVyeS5wYXRoLCAnTW9kcycpKSxcclxuICAgIGVuc3VyZVBhdGgocGF0aC5qb2luKGRpc2NvdmVyeS5wYXRoLCAnRExDJykpLFxyXG4gICAgZW5zdXJlUGF0aChwYXRoLmRpcm5hbWUoZ2V0TG9hZE9yZGVyRmlsZVBhdGgoKSkpXSlcclxuICAgICAgLnRoZW4oKCkgPT4gZG93bmxvYWRTY3JpcHRNZXJnZXIoY29udGV4dClcclxuICAgICAgICAuY2F0Y2goZXJyID0+IChlcnIgaW5zdGFuY2VvZiB1dGlsLlVzZXJDYW5jZWxlZClcclxuICAgICAgICAgID8gUHJvbWlzZS5yZXNvbHZlKClcclxuICAgICAgICAgIDogZmluZFNjcmlwdE1lcmdlcihlcnIpKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNjcmlwdE1lcmdlclRvb2woYXBpKSB7XHJcbiAgY29uc3Qgc3RhdGUgPSBhcGkuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICBjb25zdCBzY3JpcHRNZXJnZXIgPSB1dGlsLmdldFNhZmUoc3RhdGUsXHJcbiAgICBbJ3NldHRpbmdzJywgJ2dhbWVNb2RlJywgJ2Rpc2NvdmVyZWQnLCBHQU1FX0lELCAndG9vbHMnLCBTQ1JJUFRfTUVSR0VSX0lEXSwgdW5kZWZpbmVkKTtcclxuICBpZiAoISFzY3JpcHRNZXJnZXI/LnBhdGgpIHtcclxuICAgIHJldHVybiBzY3JpcHRNZXJnZXI7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBydW5TY3JpcHRNZXJnZXIoYXBpKSB7XHJcbiAgY29uc3QgdG9vbCA9IGdldFNjcmlwdE1lcmdlclRvb2woYXBpKTtcclxuICBpZiAodG9vbD8ucGF0aCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBub3RpZnlNaXNzaW5nU2NyaXB0TWVyZ2VyKGFwaSk7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYXBpLnJ1bkV4ZWN1dGFibGUodG9vbC5wYXRoLCBbXSwgeyBzdWdnZXN0RGVwbG95OiB0cnVlIH0pXHJcbiAgICAuY2F0Y2goZXJyID0+IGFwaS5zaG93RXJyb3JOb3RpZmljYXRpb24oJ0ZhaWxlZCB0byBydW4gdG9vbCcsIGVycixcclxuICAgICAgeyBhbGxvd1JlcG9ydDogWydFUEVSTScsICdFQUNDRVNTJywgJ0VOT0VOVCddLmluZGV4T2YoZXJyLmNvZGUpICE9PSAtMSB9KSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEFsbE1vZHMoY29udGV4dCkge1xyXG4gIC8vIE1vZCB0eXBlcyB3ZSBkb24ndCB3YW50IHRvIGRpc3BsYXkgaW4gdGhlIExPIHBhZ2VcclxuICBjb25zdCBpbnZhbGlkTW9kVHlwZXMgPSBbJ3dpdGNoZXIzbWVudW1vZGRvY3VtZW50cyddO1xyXG4gIGNvbnN0IHN0YXRlID0gY29udGV4dC5hcGkuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICBjb25zdCBwcm9maWxlID0gc2VsZWN0b3JzLmFjdGl2ZVByb2ZpbGUoc3RhdGUpO1xyXG4gIGlmIChwcm9maWxlPy5pZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcclxuICAgICAgbWVyZ2VkOiBbXSxcclxuICAgICAgbWFudWFsOiBbXSxcclxuICAgICAgbWFuYWdlZDogW10sXHJcbiAgICB9KTtcclxuICB9XHJcbiAgY29uc3QgbW9kU3RhdGUgPSB1dGlsLmdldFNhZmUoc3RhdGUsIFsncGVyc2lzdGVudCcsICdwcm9maWxlcycsIHByb2ZpbGUuaWQsICdtb2RTdGF0ZSddLCB7fSk7XHJcbiAgY29uc3QgbW9kcyA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ21vZHMnLCBHQU1FX0lEXSwge30pO1xyXG5cclxuICAvLyBPbmx5IHNlbGVjdCBtb2RzIHdoaWNoIGFyZSBlbmFibGVkLCBhbmQgYXJlIG5vdCBhIG1lbnUgbW9kLlxyXG4gIGNvbnN0IGVuYWJsZWRNb2RzID0gT2JqZWN0LmtleXMobW9kU3RhdGUpLmZpbHRlcihrZXkgPT5cclxuICAgICghIW1vZHNba2V5XSAmJiBtb2RTdGF0ZVtrZXldLmVuYWJsZWQgJiYgIWludmFsaWRNb2RUeXBlcy5pbmNsdWRlcyhtb2RzW2tleV0udHlwZSkpKTtcclxuXHJcbiAgY29uc3QgbWVyZ2VkTW9kTmFtZXMgPSBhd2FpdCBnZXRNZXJnZWRNb2ROYW1lcyhjb250ZXh0KTtcclxuICBjb25zdCBtYW51YWxseUFkZGVkTW9kcyA9IGF3YWl0IGdldE1hbnVhbGx5QWRkZWRNb2RzKGNvbnRleHQpO1xyXG4gIGNvbnN0IG1hbmFnZWRNb2RzID0gYXdhaXQgZ2V0TWFuYWdlZE1vZE5hbWVzKGNvbnRleHQsIGVuYWJsZWRNb2RzLm1hcChrZXkgPT4gbW9kc1trZXldKSk7XHJcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XHJcbiAgICBtZXJnZWQ6IG1lcmdlZE1vZE5hbWVzLFxyXG4gICAgbWFudWFsOiBtYW51YWxseUFkZGVkTW9kcy5maWx0ZXIobW9kID0+ICFtZXJnZWRNb2ROYW1lcy5pbmNsdWRlcyhtb2QpKSxcclxuICAgIG1hbmFnZWQ6IG1hbmFnZWRNb2RzLFxyXG4gIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzZXRJTklTdHJ1Y3QoY29udGV4dCwgbG9hZE9yZGVyLCBwcmlvcml0eU1hbmFnZXIpIHtcclxuICByZXR1cm4gZ2V0QWxsTW9kcyhjb250ZXh0KS50aGVuKG1vZE1hcCA9PiB7XHJcbiAgICBfSU5JX1NUUlVDVCA9IHt9O1xyXG4gICAgY29uc3QgbW9kcyA9IFtdLmNvbmNhdChtb2RNYXAubWVyZ2VkLCBtb2RNYXAubWFuYWdlZCwgbW9kTWFwLm1hbnVhbCk7XHJcbiAgICBjb25zdCBmaWx0ZXJGdW5jID0gKG1vZE5hbWU6IHN0cmluZykgPT4gbW9kTmFtZS5zdGFydHNXaXRoKExPQ0tFRF9QUkVGSVgpO1xyXG4gICAgY29uc3QgbWFudWFsTG9ja2VkID0gbW9kTWFwLm1hbnVhbC5maWx0ZXIoZmlsdGVyRnVuYyk7XHJcbiAgICBjb25zdCBtYW5hZ2VkTG9ja2VkID0gbW9kTWFwLm1hbmFnZWRcclxuICAgICAgLmZpbHRlcihlbnRyeSA9PiBmaWx0ZXJGdW5jKGVudHJ5Lm5hbWUpKVxyXG4gICAgICAubWFwKGVudHJ5ID0+IGVudHJ5Lm5hbWUpO1xyXG4gICAgY29uc3QgdG90YWxMb2NrZWQgPSBbXS5jb25jYXQobW9kTWFwLm1lcmdlZCwgbWFudWFsTG9ja2VkLCBtYW5hZ2VkTG9ja2VkKTtcclxuICAgIHJldHVybiBCbHVlYmlyZC5lYWNoKG1vZHMsIChtb2QsIGlkeCkgPT4ge1xyXG4gICAgICBsZXQgbmFtZTtcclxuICAgICAgbGV0IGtleTtcclxuICAgICAgaWYgKHR5cGVvZihtb2QpID09PSAnb2JqZWN0JyAmJiBtb2QgIT09IG51bGwpIHtcclxuICAgICAgICBuYW1lID0gbW9kLm5hbWU7XHJcbiAgICAgICAga2V5ID0gbW9kLmlkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG5hbWUgPSBtb2Q7XHJcbiAgICAgICAga2V5ID0gbW9kO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBMT0VudHJ5ID0gdXRpbC5nZXRTYWZlKGxvYWRPcmRlciwgW2tleV0sIHVuZGVmaW5lZCk7XHJcbiAgICAgIGlmIChpZHggPT09IDApIHtcclxuICAgICAgICBwcmlvcml0eU1hbmFnZXIucmVzZXRNYXhQcmlvcml0eSgpO1xyXG4gICAgICB9XHJcbiAgICAgIF9JTklfU1RSVUNUW25hbWVdID0ge1xyXG4gICAgICAgIC8vIFRoZSBJTkkgZmlsZSdzIGVuYWJsZWQgYXR0cmlidXRlIGV4cGVjdHMgMSBvciAwXHJcbiAgICAgICAgRW5hYmxlZDogKExPRW50cnkgIT09IHVuZGVmaW5lZCkgPyBMT0VudHJ5LmVuYWJsZWQgPyAxIDogMCA6IDEsXHJcbiAgICAgICAgUHJpb3JpdHk6IHRvdGFsTG9ja2VkLmluY2x1ZGVzKG5hbWUpXHJcbiAgICAgICAgICA/IHRvdGFsTG9ja2VkLmluZGV4T2YobmFtZSlcclxuICAgICAgICAgIDogcHJpb3JpdHlNYW5hZ2VyLmdldFByaW9yaXR5KHsgaWQ6IGtleSB9KSxcclxuICAgICAgICBWSzoga2V5LFxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmxldCByZWZyZXNoRnVuYztcclxuLy8gaXRlbTogSUxvYWRPcmRlckRpc3BsYXlJdGVtXHJcbmZ1bmN0aW9uIGdlbkVudHJ5QWN0aW9ucyhjb250ZXh0OiB0eXBlcy5JRXh0ZW5zaW9uQ29udGV4dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHR5cGVzLklMb2FkT3JkZXJEaXNwbGF5SXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgIG1pblByaW9yaXR5OiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBvblNldFByaW9yaXR5OiAoa2V5OiBzdHJpbmcsIHByaW9yaXR5OiBudW1iZXIpID0+IHZvaWQpIHtcclxuICBjb25zdCBwcmlvcml0eUlucHV0RGlhbG9nID0gKCkgPT4ge1xyXG4gICAgcmV0dXJuIG5ldyBCbHVlYmlyZCgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICBjb250ZXh0LmFwaS5zaG93RGlhbG9nKCdxdWVzdGlvbicsICdTZXQgTmV3IFByaW9yaXR5Jywge1xyXG4gICAgICAgIHRleHQ6IGNvbnRleHQuYXBpLnRyYW5zbGF0ZSgnSW5zZXJ0IG5ldyBudW1lcmljYWwgcHJpb3JpdHkgZm9yIHt7aXRlbU5hbWV9fSBpbiB0aGUgaW5wdXQgYm94OicsIHsgcmVwbGFjZTogeyBpdGVtTmFtZTogaXRlbS5uYW1lIH0gfSksXHJcbiAgICAgICAgaW5wdXQ6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgaWQ6ICd3M1ByaW9yaXR5SW5wdXQnLFxyXG4gICAgICAgICAgICBsYWJlbDogJ1ByaW9yaXR5JyxcclxuICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBfSU5JX1NUUlVDVFtpdGVtLmlkXT8uUHJpb3JpdHkgfHwgMCxcclxuICAgICAgICAgIH1dLFxyXG4gICAgICB9LCBbIHsgbGFiZWw6ICdDYW5jZWwnIH0sIHsgbGFiZWw6ICdTZXQnLCBkZWZhdWx0OiB0cnVlIH0gXSlcclxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcclxuICAgICAgICBpZiAocmVzdWx0LmFjdGlvbiA9PT0gJ1NldCcpIHtcclxuICAgICAgICAgIGNvbnN0IGl0ZW1LZXkgPSBPYmplY3Qua2V5cyhfSU5JX1NUUlVDVCkuZmluZChrZXkgPT4gX0lOSV9TVFJVQ1Rba2V5XS5WSyA9PT0gaXRlbS5pZCk7XHJcbiAgICAgICAgICBjb25zdCB3YW50ZWRQcmlvcml0eSA9IHJlc3VsdC5pbnB1dFsndzNQcmlvcml0eUlucHV0J107XHJcbiAgICAgICAgICBpZiAod2FudGVkUHJpb3JpdHkgPD0gbWluUHJpb3JpdHkpIHtcclxuICAgICAgICAgICAgY29udGV4dC5hcGkuc2hvd0Vycm9yTm90aWZpY2F0aW9uKCdDYW5ub3QgY2hhbmdlIHRvIGxvY2tlZCBlbnRyeSBQcmlvcml0eScsXHJcbiAgICAgICAgICAgICAgd2FudGVkUHJpb3JpdHkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGl0ZW1LZXkgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBfSU5JX1NUUlVDVFtpdGVtS2V5XS5Qcmlvcml0eSA9IHBhcnNlSW50KHdhbnRlZFByaW9yaXR5LCAxMCk7XHJcbiAgICAgICAgICAgIG9uU2V0UHJpb3JpdHkoaXRlbUtleSwgd2FudGVkUHJpb3JpdHkpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbG9nKCdlcnJvcicsICdGYWlsZWQgdG8gc2V0IHByaW9yaXR5IC0gbW9kIGlzIG5vdCBpbiBpbmkgc3RydWN0JywgeyBtb2RJZDogaXRlbS5pZCB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9O1xyXG4gIGNvbnN0IGl0ZW1BY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBzaG93OiBpdGVtLmxvY2tlZCAhPT0gdHJ1ZSxcclxuICAgICAgdGl0bGU6ICdTZXQgTWFudWFsIFByaW9yaXR5JyxcclxuICAgICAgYWN0aW9uOiAoKSA9PiBwcmlvcml0eUlucHV0RGlhbG9nKCksXHJcbiAgICB9LFxyXG4gIF07XHJcblxyXG4gIHJldHVybiBpdGVtQWN0aW9ucztcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHJlU29ydChjb250ZXh0LCBpdGVtcywgZGlyZWN0aW9uLCB1cGRhdGVUeXBlLCBwcmlvcml0eU1hbmFnZXIpOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gIGNvbnN0IGFjdGl2ZVByb2ZpbGUgPSBzZWxlY3RvcnMuYWN0aXZlUHJvZmlsZShzdGF0ZSk7XHJcbiAgY29uc3QgeyBnZXRQcmlvcml0eSwgcmVzZXRNYXhQcmlvcml0eSB9ID0gcHJpb3JpdHlNYW5hZ2VyO1xyXG4gIGlmIChhY3RpdmVQcm9maWxlPy5pZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAvLyBXaGF0IGFuIG9kZCB1c2UgY2FzZSAtIHBlcmhhcHMgdGhlIHVzZXIgaGFkIHN3aXRjaGVkIGdhbWVNb2RlcyBvclxyXG4gICAgLy8gIGV2ZW4gZGVsZXRlZCBoaXMgcHJvZmlsZSBkdXJpbmcgdGhlIHByZS1zb3J0IGZ1bmN0aW9uYWxpdHkgP1xyXG4gICAgLy8gIE9kZCBidXQgcGxhdXNpYmxlIEkgc3VwcG9zZSA/XHJcbiAgICBsb2coJ3dhcm4nLCAnW1czXSB1bmFibGUgdG8gcHJlc29ydCBkdWUgdG8gbm8gYWN0aXZlIHByb2ZpbGUnKTtcclxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xyXG4gIH1cclxuXHJcbiAgbGV0IGxvYWRPcmRlciA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ2xvYWRPcmRlcicsIGFjdGl2ZVByb2ZpbGUuaWRdLCB7fSk7XHJcbiAgY29uc3Qgb25TZXRQcmlvcml0eSA9IChpdGVtS2V5LCB3YW50ZWRQcmlvcml0eSkgPT4ge1xyXG4gICAgcmV0dXJuIHdyaXRlVG9Nb2RTZXR0aW5ncygpXHJcbiAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICB3YW50ZWRQcmlvcml0eSA9ICt3YW50ZWRQcmlvcml0eTtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICAgICAgY29uc3QgYWN0aXZlUHJvZmlsZSA9IHNlbGVjdG9ycy5hY3RpdmVQcm9maWxlKHN0YXRlKTtcclxuICAgICAgICBjb25zdCBtb2RJZCA9IF9JTklfU1RSVUNUW2l0ZW1LZXldLlZLO1xyXG4gICAgICAgIGNvbnN0IGxvRW50cnkgPSBsb2FkT3JkZXJbbW9kSWRdO1xyXG4gICAgICAgIGlmIChwcmlvcml0eU1hbmFnZXIucHJpb3JpdHlUeXBlID09PSAncG9zaXRpb24tYmFzZWQnKSB7XHJcbiAgICAgICAgICBjb250ZXh0LmFwaS5zdG9yZS5kaXNwYXRjaChhY3Rpb25zLnNldExvYWRPcmRlckVudHJ5KFxyXG4gICAgICAgICAgICBhY3RpdmVQcm9maWxlLmlkLCBtb2RJZCwge1xyXG4gICAgICAgICAgICAgIC4uLmxvRW50cnksXHJcbiAgICAgICAgICAgICAgcG9zOiAobG9FbnRyeS5wb3MgPCB3YW50ZWRQcmlvcml0eSkgPyB3YW50ZWRQcmlvcml0eSA6IHdhbnRlZFByaW9yaXR5IC0gMixcclxuICAgICAgICAgIH0pKTtcclxuICAgICAgICAgIGxvYWRPcmRlciA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ2xvYWRPcmRlcicsIGFjdGl2ZVByb2ZpbGUuaWRdLCB7fSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnRleHQuYXBpLnN0b3JlLmRpc3BhdGNoKGFjdGlvbnMuc2V0TG9hZE9yZGVyRW50cnkoXHJcbiAgICAgICAgICAgIGFjdGl2ZVByb2ZpbGUuaWQsIG1vZElkLCB7XHJcbiAgICAgICAgICAgICAgLi4ubG9FbnRyeSxcclxuICAgICAgICAgICAgICBwcmVmaXg6IHBhcnNlSW50KF9JTklfU1RSVUNUW2l0ZW1LZXldLlByaW9yaXR5LCAxMCksXHJcbiAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZWZyZXNoRnVuYyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICByZWZyZXNoRnVuYygpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgLmNhdGNoKGVyciA9PiBtb2RTZXR0aW5nc0Vycm9ySGFuZGxlcihjb250ZXh0LCBlcnIsXHJcbiAgICAgICAgJ0ZhaWxlZCB0byBtb2RpZnkgbG9hZCBvcmRlciBmaWxlJykpO1xyXG4gIH07XHJcbiAgY29uc3QgYWxsTW9kcyA9IGF3YWl0IGdldEFsbE1vZHMoY29udGV4dCk7XHJcbiAgaWYgKChhbGxNb2RzLm1lcmdlZC5sZW5ndGggPT09IDApICYmIChhbGxNb2RzLm1hbnVhbC5sZW5ndGggPT09IDApKSB7XHJcbiAgICBpdGVtcy5tYXAoKGl0ZW0sIGlkeCkgPT4ge1xyXG4gICAgICBpZiAoaWR4ID09PSAwKSB7XHJcbiAgICAgICAgcmVzZXRNYXhQcmlvcml0eSgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgLi4uaXRlbSxcclxuICAgICAgICBjb250ZXh0TWVudUFjdGlvbnM6IGdlbkVudHJ5QWN0aW9ucyhjb250ZXh0LCBpdGVtLCAwLCBvblNldFByaW9yaXR5KSxcclxuICAgICAgICBwcmVmaXg6IGdldFByaW9yaXR5KGl0ZW0pLFxyXG4gICAgICB9O1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBmaWx0ZXJGdW5jID0gKG1vZE5hbWU6IHN0cmluZykgPT4gbW9kTmFtZS5zdGFydHNXaXRoKExPQ0tFRF9QUkVGSVgpO1xyXG4gIGNvbnN0IGxvY2tlZE1vZHMgPSBbXS5jb25jYXQoYWxsTW9kcy5tYW51YWwuZmlsdGVyKGZpbHRlckZ1bmMpLFxyXG4gICAgYWxsTW9kcy5tYW5hZ2VkLmZpbHRlcihlbnRyeSA9PiBmaWx0ZXJGdW5jKGVudHJ5Lm5hbWUpKVxyXG4gICAgICAgICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5uYW1lKSk7XHJcbiAgY29uc3QgcmVhZGFibGVOYW1lcyA9IHtcclxuICAgIFtVTklfUEFUQ0hdOiAnVW5pZmljYXRpb24vQ29tbXVuaXR5IFBhdGNoJyxcclxuICB9O1xyXG5cclxuICBjb25zdCBsb2NrZWRFbnRyaWVzID0gW10uY29uY2F0KGFsbE1vZHMubWVyZ2VkLCBsb2NrZWRNb2RzKVxyXG4gICAgLnJlZHVjZSgoYWNjdW0sIG1vZE5hbWUsIGlkeCkgPT4ge1xyXG4gICAgICBjb25zdCBvYmogPSB7XHJcbiAgICAgICAgaWQ6IG1vZE5hbWUsXHJcbiAgICAgICAgbmFtZTogISFyZWFkYWJsZU5hbWVzW21vZE5hbWVdID8gcmVhZGFibGVOYW1lc1ttb2ROYW1lXSA6IG1vZE5hbWUsXHJcbiAgICAgICAgaW1nVXJsOiBgJHtfX2Rpcm5hbWV9L2dhbWVhcnQuanBnYCxcclxuICAgICAgICBsb2NrZWQ6IHRydWUsXHJcbiAgICAgICAgcHJlZml4OiBpZHggKyAxLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKCFhY2N1bS5maW5kKGFjYyA9PiBvYmouaWQgPT09IGFjYy5pZCkpIHtcclxuICAgICAgICBhY2N1bS5wdXNoKG9iaik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBhY2N1bTtcclxuICAgIH0sIFtdKTtcclxuXHJcbiAgaXRlbXMgPSBpdGVtcy5maWx0ZXIoaXRlbSA9PiAhYWxsTW9kcy5tZXJnZWQuaW5jbHVkZXMoaXRlbS5pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmICFhbGxNb2RzLm1hbnVhbC5pbmNsdWRlcyhpdGVtLmlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgIWFsbE1vZHMubWFuYWdlZC5maW5kKG1vZCA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG1vZC5uYW1lID09PSBVTklfUEFUQ0gpICYmIChtb2QuaWQgPT09IGl0ZW0uaWQpKSlcclxuICAgICAgICAgICAgICAgLm1hcCgoaXRlbSwgaWR4KSA9PiB7XHJcbiAgICBpZiAoaWR4ID09PSAwKSB7XHJcbiAgICAgIHJlc2V0TWF4UHJpb3JpdHkoKTtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgIC4uLml0ZW0sXHJcbiAgICAgIGNvbnRleHRNZW51QWN0aW9uczogZ2VuRW50cnlBY3Rpb25zKGNvbnRleHQsIGl0ZW0sIGxvY2tlZEVudHJpZXMubGVuZ3RoLCBvblNldFByaW9yaXR5KSxcclxuICAgICAgcHJlZml4OiBnZXRQcmlvcml0eShpdGVtKSxcclxuICAgIH07XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IG1hbnVhbEVudHJpZXMgPSBhbGxNb2RzLm1hbnVhbFxyXG4gICAgLmZpbHRlcihrZXkgPT4gbG9ja2VkRW50cmllcy5maW5kKGVudHJ5ID0+IGVudHJ5LmlkID09PSBrZXkpID09PSB1bmRlZmluZWQpXHJcbiAgICAubWFwKGtleSA9PiB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSB7XHJcbiAgICAgICAgaWQ6IGtleSxcclxuICAgICAgICBuYW1lOiBrZXksXHJcbiAgICAgICAgaW1nVXJsOiBgJHtfX2Rpcm5hbWV9L2dhbWVhcnQuanBnYCxcclxuICAgICAgICBleHRlcm5hbDogdHJ1ZSxcclxuICAgICAgfTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5pdGVtLFxyXG4gICAgICAgIHByZWZpeDogZ2V0UHJpb3JpdHkoaXRlbSksXHJcbiAgICAgICAgY29udGV4dE1lbnVBY3Rpb25zOiBnZW5FbnRyeUFjdGlvbnMoY29udGV4dCwgaXRlbSwgbG9ja2VkRW50cmllcy5sZW5ndGgsIG9uU2V0UHJpb3JpdHkpLFxyXG4gICAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobG9hZE9yZGVyKTtcclxuICBjb25zdCBrbm93bk1hbnVhbGx5QWRkZWQgPSBtYW51YWxFbnRyaWVzLmZpbHRlcihlbnRyeSA9PiBrZXlzLmluY2x1ZGVzKGVudHJ5LmlkKSkgfHwgW107XHJcbiAgY29uc3QgdW5rbm93bk1hbnVhbGx5QWRkZWQgPSBtYW51YWxFbnRyaWVzLmZpbHRlcihlbnRyeSA9PiAha2V5cy5pbmNsdWRlcyhlbnRyeS5pZCkpIHx8IFtdO1xyXG4gIGNvbnN0IGZpbHRlcmVkT3JkZXIgPSBrZXlzXHJcbiAgICAuZmlsdGVyKGtleSA9PiBsb2NrZWRFbnRyaWVzLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09PSBrZXkpID09PSB1bmRlZmluZWQpXHJcbiAgICAucmVkdWNlKChhY2N1bSwga2V5KSA9PiB7XHJcbiAgICAgIGFjY3VtW2tleV0gPSBsb2FkT3JkZXJba2V5XTtcclxuICAgICAgcmV0dXJuIGFjY3VtO1xyXG4gICAgfSwgW10pO1xyXG4gIGtub3duTWFudWFsbHlBZGRlZC5mb3JFYWNoKGtub3duID0+IHtcclxuICAgIGNvbnN0IGRpZmYgPSBrZXlzLmxlbmd0aCAtIE9iamVjdC5rZXlzKGZpbHRlcmVkT3JkZXIpLmxlbmd0aDtcclxuXHJcbiAgICBjb25zdCBwb3MgPSBmaWx0ZXJlZE9yZGVyW2tub3duLmlkXS5wb3MgLSBkaWZmO1xyXG4gICAgaXRlbXMgPSBbXS5jb25jYXQoaXRlbXMuc2xpY2UoMCwgcG9zKSB8fCBbXSwga25vd24sIGl0ZW1zLnNsaWNlKHBvcykgfHwgW10pO1xyXG4gIH0pO1xyXG5cclxuICBsZXQgcHJlU29ydGVkID0gW10uY29uY2F0KFxyXG4gICAgLi4ubG9ja2VkRW50cmllcyxcclxuICAgIGl0ZW1zLmZpbHRlcihpdGVtID0+IHtcclxuICAgICAgY29uc3QgaXNMb2NrZWQgPSBsb2NrZWRFbnRyaWVzLmZpbmQobG9ja2VkID0+IGxvY2tlZC5uYW1lID09PSBpdGVtLm5hbWUpICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgIGNvbnN0IGRvTm90RGlzcGxheSA9IERPX05PVF9ESVNQTEFZLmluY2x1ZGVzKGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgcmV0dXJuICFpc0xvY2tlZCAmJiAhZG9Ob3REaXNwbGF5O1xyXG4gICAgfSksXHJcbiAgICAuLi51bmtub3duTWFudWFsbHlBZGRlZCk7XHJcblxyXG4gIHByZVNvcnRlZCA9ICh1cGRhdGVUeXBlICE9PSAnZHJhZy1uLWRyb3AnKVxyXG4gICAgPyBwcmVTb3J0ZWQuc29ydCgobGhzLCByaHMpID0+IGxocy5wcmVmaXggLSByaHMucHJlZml4KVxyXG4gICAgOiBwcmVTb3J0ZWQucmVkdWNlKChhY2N1bSwgZW50cnksIGlkeCkgPT4ge1xyXG4gICAgICAgIGlmIChsb2NrZWRFbnRyaWVzLmluZGV4T2YoZW50cnkpICE9PSAtMSB8fCBpZHggPT09IDApIHtcclxuICAgICAgICAgIGFjY3VtLnB1c2goZW50cnkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zdCBwcmV2UHJlZml4ID0gcGFyc2VJbnQoYWNjdW1baWR4IC0gMV0ucHJlZml4LCAxMCk7XHJcbiAgICAgICAgICBpZiAocHJldlByZWZpeCA+PSBlbnRyeS5wcmVmaXgpIHtcclxuICAgICAgICAgICAgYWNjdW0ucHVzaCh7XHJcbiAgICAgICAgICAgICAgLi4uZW50cnksXHJcbiAgICAgICAgICAgICAgcHJlZml4OiBwcmV2UHJlZml4ICsgMSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhY2N1bS5wdXNoKGVudHJ5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFjY3VtO1xyXG4gICAgICB9LCBbXSk7XHJcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShwcmVTb3J0ZWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kTW9kRm9sZGVyKGluc3RhbGxhdGlvblBhdGg6IHN0cmluZywgbW9kOiB0eXBlcy5JTW9kKTogQmx1ZWJpcmQ8c3RyaW5nPiB7XHJcbiAgaWYgKCFpbnN0YWxsYXRpb25QYXRoIHx8ICFtb2Q/Lmluc3RhbGxhdGlvblBhdGgpIHtcclxuICAgIGNvbnN0IGVyck1lc3NhZ2UgPSAhaW5zdGFsbGF0aW9uUGF0aFxyXG4gICAgICA/ICdHYW1lIGlzIG5vdCBkaXNjb3ZlcmVkJ1xyXG4gICAgICA6ICdGYWlsZWQgdG8gcmVzb2x2ZSBtb2QgaW5zdGFsbGF0aW9uIHBhdGgnO1xyXG4gICAgcmV0dXJuIEJsdWViaXJkLnJlamVjdChuZXcgRXJyb3IoZXJyTWVzc2FnZSkpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZXhwZWN0ZWRNb2ROYW1lTG9jYXRpb24gPSBbJ3dpdGNoZXIzbWVudW1vZHJvb3QnLCAnd2l0Y2hlcjN0bCddLmluY2x1ZGVzKG1vZC50eXBlKVxyXG4gICAgPyBwYXRoLmpvaW4oaW5zdGFsbGF0aW9uUGF0aCwgbW9kLmluc3RhbGxhdGlvblBhdGgsICdNb2RzJylcclxuICAgIDogcGF0aC5qb2luKGluc3RhbGxhdGlvblBhdGgsIG1vZC5pbnN0YWxsYXRpb25QYXRoKTtcclxuICByZXR1cm4gZnMucmVhZGRpckFzeW5jKGV4cGVjdGVkTW9kTmFtZUxvY2F0aW9uKVxyXG4gICAgLnRoZW4oZW50cmllcyA9PiBQcm9taXNlLnJlc29sdmUoZW50cmllc1swXSkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRNYW5hZ2VkTW9kTmFtZXMoY29udGV4dDogdHlwZXMuSUNvbXBvbmVudENvbnRleHQsIG1vZHM6IHR5cGVzLklNb2RbXSkge1xyXG4gIGNvbnN0IGluc3RhbGxhdGlvblBhdGggPSBzZWxlY3RvcnMuaW5zdGFsbFBhdGhGb3JHYW1lKGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCksIEdBTUVfSUQpO1xyXG4gIHJldHVybiBCbHVlYmlyZC5yZWR1Y2UobW9kcywgKGFjY3VtLCBtb2QpID0+IGZpbmRNb2RGb2xkZXIoaW5zdGFsbGF0aW9uUGF0aCwgbW9kKVxyXG4gICAgLnRoZW4obW9kTmFtZSA9PiB7XHJcbiAgICAgIGlmICghbW9kTmFtZSB8fCBbJ2NvbGxlY3Rpb24nLCAndzNtb2RsaW1pdHBhdGNoZXInXS5pbmNsdWRlcyhtb2QudHlwZSkpIHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFjY3VtKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBtb2RDb21wb25lbnRzID0gdXRpbC5nZXRTYWZlKG1vZCwgWydhdHRyaWJ1dGVzJywgJ21vZENvbXBvbmVudHMnXSwgW10pO1xyXG4gICAgICBpZiAobW9kQ29tcG9uZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBtb2RDb21wb25lbnRzLnB1c2gobW9kTmFtZSk7XHJcbiAgICAgIH1cclxuICAgICAgWy4uLm1vZENvbXBvbmVudHNdLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICBhY2N1bS5wdXNoKHtcclxuICAgICAgICAgIGlkOiBtb2QuaWQsXHJcbiAgICAgICAgICBuYW1lOiBrZXksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGFjY3VtKTtcclxuICAgIH0pXHJcbiAgICAuY2F0Y2goZXJyID0+IHtcclxuICAgICAgbG9nKCdlcnJvcicsICd1bmFibGUgdG8gcmVzb2x2ZSBtb2QgbmFtZScsIGVycik7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYWNjdW0pO1xyXG4gICAgfSksIFtdKTtcclxufVxyXG5cclxuY29uc3QgdG9nZ2xlTW9kc1N0YXRlID0gYXN5bmMgKGNvbnRleHQsIHByb3BzLCBlbmFibGVkKSA9PiB7XHJcbiAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gIGNvbnN0IHByb2ZpbGUgPSBzZWxlY3RvcnMuYWN0aXZlUHJvZmlsZShzdGF0ZSk7XHJcbiAgY29uc3QgbG9hZE9yZGVyID0gdXRpbC5nZXRTYWZlKHN0YXRlLCBbJ3BlcnNpc3RlbnQnLCAnbG9hZE9yZGVyJywgcHJvZmlsZS5pZF0sIHt9KTtcclxuICBjb25zdCBtb2RNYXAgPSBhd2FpdCBnZXRBbGxNb2RzKGNvbnRleHQpO1xyXG4gIGNvbnN0IG1hbnVhbExvY2tlZCA9IG1vZE1hcC5tYW51YWwuZmlsdGVyKG1vZE5hbWUgPT4gbW9kTmFtZS5zdGFydHNXaXRoKExPQ0tFRF9QUkVGSVgpKTtcclxuICBjb25zdCB0b3RhbExvY2tlZCA9IFtdLmNvbmNhdChtb2RNYXAubWVyZ2VkLCBtYW51YWxMb2NrZWQpO1xyXG4gIGNvbnN0IG5ld0xPID0gT2JqZWN0LmtleXMobG9hZE9yZGVyKS5yZWR1Y2UoKGFjY3VtLCBrZXkpID0+IHtcclxuICAgIGlmICh0b3RhbExvY2tlZC5pbmNsdWRlcyhrZXkpKSB7XHJcbiAgICAgIGFjY3VtW2tleV0gPSBsb2FkT3JkZXJba2V5XTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFjY3VtW2tleV0gPSB7XHJcbiAgICAgICAgLi4ubG9hZE9yZGVyW2tleV0sXHJcbiAgICAgICAgZW5hYmxlZCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIHJldHVybiBhY2N1bTtcclxuICB9LCB7fSk7XHJcbiAgY29udGV4dC5hcGkuc3RvcmUuZGlzcGF0Y2goYWN0aW9ucy5zZXRMb2FkT3JkZXIocHJvZmlsZS5pZCwgbmV3TE8gYXMgYW55KSk7XHJcbiAgcHJvcHMucmVmcmVzaCgpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gaW5mb0NvbXBvbmVudChjb250ZXh0LCBwcm9wcyk6IEpTWC5FbGVtZW50IHtcclxuICBjb25zdCB0ID0gY29udGV4dC5hcGkudHJhbnNsYXRlO1xyXG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KEJTLlBhbmVsLCB7IGlkOiAnbG9hZG9yZGVyaW5mbycgfSxcclxuICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2gyJywge30sIHQoJ01hbmFnaW5nIHlvdXIgbG9hZCBvcmRlcicsIHsgbnM6IEkxOE5fTkFNRVNQQUNFIH0pKSxcclxuICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoRmxleExheW91dC5GbGV4LCB7IHN0eWxlOiB7IGhlaWdodDogJzMwJScgfSB9LFxyXG4gICAgUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2Jywge30sXHJcbiAgICBSZWFjdC5jcmVhdGVFbGVtZW50KCdwJywge30sIHQoJ1lvdSBjYW4gYWRqdXN0IHRoZSBsb2FkIG9yZGVyIGZvciBUaGUgV2l0Y2hlciAzIGJ5IGRyYWdnaW5nIGFuZCBkcm9wcGluZyAnXHJcbiAgICAgICsgJ21vZHMgdXAgb3IgZG93biBvbiB0aGlzIHBhZ2UuICBJZiB5b3UgYXJlIHVzaW5nIHNldmVyYWwgbW9kcyB0aGF0IGFkZCBzY3JpcHRzIHlvdSBtYXkgbmVlZCB0byB1c2UgJ1xyXG4gICAgICArICd0aGUgV2l0Y2hlciAzIFNjcmlwdCBtZXJnZXIuIEZvciBtb3JlIGluZm9ybWF0aW9uIHNlZTogJywgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSksXHJcbiAgICBSZWFjdC5jcmVhdGVFbGVtZW50KCdhJywgeyBvbkNsaWNrOiAoKSA9PiB1dGlsLm9wbignaHR0cHM6Ly93aWtpLm5leHVzbW9kcy5jb20vaW5kZXgucGhwL01vZGRpbmdfVGhlX1dpdGNoZXJfM193aXRoX1ZvcnRleCcpIH0sIHQoJ01vZGRpbmcgVGhlIFdpdGNoZXIgMyB3aXRoIFZvcnRleC4nLCB7IG5zOiBJMThOX05BTUVTUEFDRSB9KSkpKSksXHJcbiAgICBSZWFjdC5jcmVhdGVFbGVtZW50KCdkaXYnLCB7XHJcbiAgICAgIHN0eWxlOiB7IGhlaWdodDogJzgwJScgfSxcclxuICAgIH0sXHJcbiAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ3AnLCB7fSwgdCgnUGxlYXNlIG5vdGU6JywgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSkpLFxyXG4gICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KCd1bCcsIHt9LFxyXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2xpJywge30sIHQoJ0ZvciBXaXRjaGVyIDMsIHRoZSBtb2Qgd2l0aCB0aGUgbG93ZXN0IGluZGV4IG51bWJlciAoYnkgZGVmYXVsdCwgdGhlIG1vZCBzb3J0ZWQgYXQgdGhlIHRvcCkgb3ZlcnJpZGVzIG1vZHMgd2l0aCBhIGhpZ2hlciBpbmRleCBudW1iZXIuJywgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSkpLFxyXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2xpJywge30sIHQoJ1lvdSBhcmUgYWJsZSB0byBtb2RpZnkgdGhlIHByaW9yaXR5IG1hbnVhbGx5IGJ5IHJpZ2h0IGNsaWNraW5nIGFueSBMTyBlbnRyeSBhbmQgc2V0IHRoZSBtb2RcXCdzIHByaW9yaXR5JywgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSkpLFxyXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2xpJywge30sIHQoJ0lmIHlvdSBjYW5ub3Qgc2VlIHlvdXIgbW9kIGluIHRoaXMgbG9hZCBvcmRlciwgeW91IG1heSBuZWVkIHRvIGFkZCBpdCBtYW51YWxseSAoc2VlIG91ciB3aWtpIGZvciBkZXRhaWxzKS4nLCB7IG5zOiBJMThOX05BTUVTUEFDRSB9KSksXHJcbiAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudCgnbGknLCB7fSwgdCgnV2hlbiBtYW5hZ2luZyBtZW51IG1vZHMsIG1vZCBzZXR0aW5ncyBjaGFuZ2VkIGluc2lkZSB0aGUgZ2FtZSB3aWxsIGJlIGRldGVjdGVkIGJ5IFZvcnRleCBhcyBleHRlcm5hbCBjaGFuZ2VzIC0gdGhhdCBpcyBleHBlY3RlZCwgJ1xyXG4gICAgICAgICAgKyAnY2hvb3NlIHRvIHVzZSB0aGUgbmV3ZXIgZmlsZSBhbmQgeW91ciBzZXR0aW5ncyB3aWxsIGJlIG1hZGUgcGVyc2lzdGVudC4nLFxyXG4gICAgICAgICAgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSkpLFxyXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2xpJywge30sIHQoJ1lvdSBjYW4gY2hhbmdlIHRoZSB3YXkgdGhlIHByaW9yaXRpZXMgYXJlIGFzc2dpbmVkIHVzaW5nIHRoZSBcIlN3aXRjaCBUbyBQb3NpdGlvbi9QcmVmaXggYmFzZWRcIiBidXR0b24uICdcclxuICAgICAgICAgICsgJ1ByZWZpeCBiYXNlZCBpcyBsZXNzIHJlc3RyaWN0aXZlIGFuZCBhbGxvd3MgeW91IHRvIHNldCBhbnkgcHJpb3JpdHkgdmFsdWUgeW91IHdhbnQgXCI1MDAwLCA2OTk5OSwgZXRjXCIgd2hpbGUgcG9zaXRpb24gYmFzZWQgd2lsbCAnXHJcbiAgICAgICAgICArICdyZXN0cmljdCB0aGUgcHJpb3JpdGllcyB0byB0aGUgbnVtYmVyIG9mIGxvYWQgb3JkZXIgZW50cmllcyB0aGF0IGFyZSBhdmFpbGFibGUuJyxcclxuICAgICAgICAgIHsgbnM6IEkxOE5fTkFNRVNQQUNFIH0pKSxcclxuICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KCdsaScsIHt9LCB0KCdNZXJnZXMgZ2VuZXJhdGVkIGJ5IHRoZSBXaXRjaGVyIDMgU2NyaXB0IG1lcmdlciBtdXN0IGJlIGxvYWRlZCBmaXJzdCBhbmQgYXJlIGxvY2tlZCBpbiB0aGUgZmlyc3QgbG9hZCBvcmRlciBzbG90LicsIHsgbnM6IEkxOE5fTkFNRVNQQUNFIH0pKSksXHJcbiAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChCUy5CdXR0b24sIHtcclxuICAgICAgICAgIG9uQ2xpY2s6ICgpID0+IHRvZ2dsZU1vZHNTdGF0ZShjb250ZXh0LCBwcm9wcywgZmFsc2UpLFxyXG4gICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgbWFyZ2luQm90dG9tOiAnNXB4JyxcclxuICAgICAgICAgICAgd2lkdGg6ICdtaW4tY29udGVudCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sIHQoJ0Rpc2FibGUgQWxsJykpLFxyXG4gICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2JyJyksXHJcbiAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChCUy5CdXR0b24sIHtcclxuICAgICAgICAgIG9uQ2xpY2s6ICgpID0+IHRvZ2dsZU1vZHNTdGF0ZShjb250ZXh0LCBwcm9wcywgdHJ1ZSksXHJcbiAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICBtYXJnaW5Cb3R0b206ICc1cHgnLFxyXG4gICAgICAgICAgICB3aWR0aDogJ21pbi1jb250ZW50JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSwgdCgnRW5hYmxlIEFsbCAnKSksIFtdKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHF1ZXJ5U2NyaXB0TWVyZ2UoY29udGV4dCwgcmVhc29uKSB7XHJcbiAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gIGNvbnN0IHNjcmlwdE1lcmdlclRvb2wgPSB1dGlsLmdldFNhZmUoc3RhdGUsIFsnc2V0dGluZ3MnLCAnZ2FtZU1vZGUnLCAnZGlzY292ZXJlZCcsIEdBTUVfSUQsICd0b29scycsIFNDUklQVF9NRVJHRVJfSURdLCB1bmRlZmluZWQpO1xyXG4gIGlmICghIXNjcmlwdE1lcmdlclRvb2w/LnBhdGgpIHtcclxuICAgIGNvbnRleHQuYXBpLnNlbmROb3RpZmljYXRpb24oe1xyXG4gICAgICBpZDogJ3dpdGNoZXIzLW1lcmdlJyxcclxuICAgICAgdHlwZTogJ3dhcm5pbmcnLFxyXG4gICAgICBtZXNzYWdlOiBjb250ZXh0LmFwaS50cmFuc2xhdGUoJ1dpdGNoZXIgU2NyaXB0IG1lcmdlciBtYXkgbmVlZCB0byBiZSBleGVjdXRlZCcsXHJcbiAgICAgICAgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSksXHJcbiAgICAgIGFsbG93U3VwcHJlc3M6IHRydWUsXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0aXRsZTogJ01vcmUnLFxyXG4gICAgICAgICAgYWN0aW9uOiAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnRleHQuYXBpLnNob3dEaWFsb2coJ2luZm8nLCAnV2l0Y2hlciAzJywge1xyXG4gICAgICAgICAgICAgIHRleHQ6IHJlYXNvbixcclxuICAgICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICAgIHsgbGFiZWw6ICdDbG9zZScgfSxcclxuICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdGl0bGU6ICdSdW4gdG9vbCcsXHJcbiAgICAgICAgICBhY3Rpb246IGRpc21pc3MgPT4ge1xyXG4gICAgICAgICAgICBydW5TY3JpcHRNZXJnZXIoY29udGV4dC5hcGkpO1xyXG4gICAgICAgICAgICBkaXNtaXNzKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgbm90aWZ5TWlzc2luZ1NjcmlwdE1lcmdlcihjb250ZXh0LmFwaSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYW5NZXJnZShnYW1lLCBnYW1lRGlzY292ZXJ5KSB7XHJcbiAgaWYgKGdhbWUuaWQgIT09IEdBTUVfSUQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gKHtcclxuICAgIGJhc2VGaWxlczogKCkgPT4gW1xyXG4gICAgICB7XHJcbiAgICAgICAgaW46IHBhdGguam9pbihnYW1lRGlzY292ZXJ5LnBhdGgsIENPTkZJR19NQVRSSVhfUkVMX1BBVEgsIElOUFVUX1hNTF9GSUxFTkFNRSksXHJcbiAgICAgICAgb3V0OiBwYXRoLmpvaW4oQ09ORklHX01BVFJJWF9SRUxfUEFUSCwgSU5QVVRfWE1MX0ZJTEVOQU1FKSxcclxuICAgICAgfSxcclxuICAgIF0sXHJcbiAgICBmaWx0ZXI6IGZpbGVQYXRoID0+IGZpbGVQYXRoLmVuZHNXaXRoKElOUFVUX1hNTF9GSUxFTkFNRSksXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRJbnB1dEZpbGUoY29udGV4dCwgbWVyZ2VEaXIpIHtcclxuICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgY29uc3QgZGlzY292ZXJ5ID0gdXRpbC5nZXRTYWZlKHN0YXRlLCBbJ3NldHRpbmdzJywgJ2dhbWVNb2RlJywgJ2Rpc2NvdmVyZWQnLCBHQU1FX0lEXSwgdW5kZWZpbmVkKTtcclxuICBjb25zdCBnYW1lSW5wdXRGaWxlcGF0aCA9IHBhdGguam9pbihkaXNjb3ZlcnkucGF0aCwgQ09ORklHX01BVFJJWF9SRUxfUEFUSCwgSU5QVVRfWE1MX0ZJTEVOQU1FKTtcclxuICByZXR1cm4gKCEhZGlzY292ZXJ5Py5wYXRoKVxyXG4gICAgPyBmcy5yZWFkRmlsZUFzeW5jKHBhdGguam9pbihtZXJnZURpciwgQ09ORklHX01BVFJJWF9SRUxfUEFUSCwgSU5QVVRfWE1MX0ZJTEVOQU1FKSlcclxuICAgICAgLmNhdGNoKGVyciA9PiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKVxyXG4gICAgICAgID8gZnMucmVhZEZpbGVBc3luYyhnYW1lSW5wdXRGaWxlcGF0aClcclxuICAgICAgICA6IFByb21pc2UucmVqZWN0KGVycikpXHJcbiAgICA6IFByb21pc2UucmVqZWN0KHsgY29kZTogJ0VOT0VOVCcsIG1lc3NhZ2U6ICdHYW1lIGlzIG5vdCBkaXNjb3ZlcmVkJyB9KTtcclxufVxyXG5cclxuY29uc3QgZW1wdHlYbWwgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+PG1ldGFkYXRhPjwvbWV0YWRhdGE+JztcclxuZnVuY3Rpb24gbWVyZ2UoZmlsZVBhdGgsIG1lcmdlRGlyLCBjb250ZXh0KSB7XHJcbiAgbGV0IG1vZERhdGE7XHJcbiAgcmV0dXJuIGZzLnJlYWRGaWxlQXN5bmMoZmlsZVBhdGgpXHJcbiAgICAudGhlbih4bWxEYXRhID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBtb2REYXRhID0gcGFyc2VYbWxTdHJpbmcoeG1sRGF0YSwgeyBpZ25vcmVfZW5jOiB0cnVlLCBub2JsYW5rczogdHJ1ZSB9KTtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIC8vIFRoZSBtb2QgaXRzZWxmIGhhcyBpbnZhbGlkIHhtbCBkYXRhLlxyXG4gICAgICAgIGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignSW52YWxpZCBtb2QgWE1MIGRhdGEgLSBpbmZvcm0gbW9kIGF1dGhvcicsXHJcbiAgICAgICAgeyBwYXRoOiBmaWxlUGF0aCwgZXJyb3I6IGVyci5tZXNzYWdlIH0sIHsgYWxsb3dSZXBvcnQ6IGZhbHNlIH0pO1xyXG4gICAgICAgIG1vZERhdGEgPSBlbXB0eVhtbDtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAudGhlbigoKSA9PiByZWFkSW5wdXRGaWxlKGNvbnRleHQsIG1lcmdlRGlyKSlcclxuICAgIC50aGVuKG1lcmdlZERhdGEgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IG1lcmdlZCA9IHBhcnNlWG1sU3RyaW5nKG1lcmdlZERhdGEsIHsgaWdub3JlX2VuYzogdHJ1ZSwgbm9ibGFua3M6IHRydWUgfSk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtZXJnZWQpO1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBtZXJnZWQgZmlsZSAtIGlmIGl0J3MgaW52YWxpZCBjaGFuY2VzIGFyZSB3ZSBtZXNzZWQgdXBcclxuICAgICAgICAvLyAgc29tZWhvdywgcmVhc29uIHdoeSB3ZSdyZSBnb2luZyB0byBhbGxvdyB0aGlzIGVycm9yIHRvIGdldCByZXBvcnRlZC5cclxuICAgICAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICAgICAgY29uc3QgYWN0aXZlUHJvZmlsZSA9IHNlbGVjdG9ycy5hY3RpdmVQcm9maWxlKHN0YXRlKTtcclxuICAgICAgICBjb25zdCBsb2FkT3JkZXIgPSB1dGlsLmdldFNhZmUoc3RhdGUsIFsncGVyc2lzdGVudCcsICdsb2FkT3JkZXInLCBhY3RpdmVQcm9maWxlLmlkXSwge30pO1xyXG4gICAgICAgIGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignSW52YWxpZCBtZXJnZWQgWE1MIGRhdGEnLCBlcnIsIHtcclxuICAgICAgICAgIGFsbG93UmVwb3J0OiB0cnVlLFxyXG4gICAgICAgICAgYXR0YWNobWVudHM6IFtcclxuICAgICAgICAgICAgeyBpZDogJ19fbWVyZ2VkL2lucHV0LnhtbCcsIHR5cGU6ICdkYXRhJywgZGF0YTogbWVyZ2VkRGF0YSxcclxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1dpdGNoZXIgMyBtZW51IG1vZCBtZXJnZWQgZGF0YScgfSxcclxuICAgICAgICAgICAgeyBpZDogYCR7YWN0aXZlUHJvZmlsZS5pZH1fbG9hZE9yZGVyYCwgdHlwZTogJ2RhdGEnLCBkYXRhOiBsb2FkT3JkZXIsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXJyZW50IGxvYWQgb3JkZXInIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgdXRpbC5EYXRhSW52YWxpZCgnSW52YWxpZCBtZXJnZWQgWE1MIGRhdGEnKSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAudGhlbihnYW1lSW5kZXhGaWxlID0+IHtcclxuICAgICAgY29uc3QgbW9kVmFycyA9IG1vZERhdGEuZmluZCgnLy9WYXInKTtcclxuICAgICAgY29uc3QgZ2FtZVZhcnMgPSBnYW1lSW5kZXhGaWxlLmZpbmQ8RWxlbWVudD4oJy8vVmFyJyk7XHJcblxyXG4gICAgICBtb2RWYXJzLmZvckVhY2gobW9kVmFyID0+IHtcclxuICAgICAgICBjb25zdCBtYXRjaGVyID0gKGdhbWVWYXIpID0+IHtcclxuICAgICAgICAgIGxldCBnYW1lVmFyUGFyZW50O1xyXG4gICAgICAgICAgbGV0IG1vZFZhclBhcmVudDtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGdhbWVWYXJQYXJlbnQgPSBnYW1lVmFyLnBhcmVudCgpLnBhcmVudCgpO1xyXG4gICAgICAgICAgICBtb2RWYXJQYXJlbnQgPSBtb2RWYXIucGFyZW50KCkucGFyZW50KCk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgLy8gVGhpcyBnYW1lIHZhcmlhYmxlIG11c3QndmUgYmVlbiByZXBsYWNlZCBpbiBhIHByZXZpb3VzXHJcbiAgICAgICAgICAgIC8vICBpdGVyYXRpb24uXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoKHR5cGVvZihnYW1lVmFyUGFyZW50Py5hdHRyKSAhPT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICB8fCAodHlwZW9mKG1vZFZhclBhcmVudD8uYXR0cikgIT09ICdmdW5jdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAvLyBUaGlzIGlzIGFjdHVhbGx5IHF1aXRlIHByb2JsZW1hdGljIC0gaXQgcHJldHR5IG11Y2ggbWVhbnNcclxuICAgICAgICAgICAgIC8vICB0aGF0IGVpdGhlciB0aGUgbW9kIG9yIHRoZSBnYW1lIGl0c2VsZiBoYXMgZ2FtZSB2YXJpYWJsZXNcclxuICAgICAgICAgICAgIC8vICBsb2NhdGVkIG91dHNpZGUgYSBncm91cC4gRWl0aGVyIHRoZSBnYW1lIGlucHV0IGZpbGUgaXMgY29ycnVwdGVkXHJcbiAgICAgICAgICAgICAvLyAgKG1hbnVhbCB0YW1wZXJpbmc/KSBvciB0aGUgbW9kIGl0c2VsZiBpcy4gVGhhbmtmdWxseSB3ZSB3aWxsIGJlXHJcbiAgICAgICAgICAgICAvLyAgY3JlYXRpbmcgdGhlIG1pc3NpbmcgZ3JvdXAsIGJ1dCBpdCBsZWFkcyB0byB0aGUgcXVlc3Rpb24sIHdoYXRcclxuICAgICAgICAgICAgIC8vICBvdGhlciBzdXJwcmlzZXMgYXJlIHdlIGdvaW5nIHRvIGVuY291bnRlciBmdXJ0aGVyIGRvd24gdGhlIGxpbmUgP1xyXG4gICAgICAgICAgICAgbG9nKCdlcnJvcicsICdmYWlsZWQgdG8gZmluZCBwYXJlbnQgZ3JvdXAgb2YgbW9kIHZhcmlhYmxlJywgbW9kVmFyKTtcclxuICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuICgoZ2FtZVZhclBhcmVudC5hdHRyKCdpZCcpLnZhbHVlKCkgPT09IG1vZFZhclBhcmVudC5hdHRyKCdpZCcpLnZhbHVlKCkpXHJcbiAgICAgICAgICAgICYmIChnYW1lVmFyLmF0dHIoJ2lkJykudmFsdWUoKSA9PT0gbW9kVmFyLmF0dHIoJ2lkJykudmFsdWUoKSkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nVmFyID0gZ2FtZVZhcnMuZmluZChtYXRjaGVyKTtcclxuICAgICAgICBpZiAoZXhpc3RpbmdWYXIpIHtcclxuICAgICAgICAgIGV4aXN0aW5nVmFyLnJlcGxhY2UobW9kVmFyLmNsb25lKCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zdCBwYXJlbnRHcm91cCA9IG1vZFZhci5wYXJlbnQoKS5wYXJlbnQoKTtcclxuICAgICAgICAgIGNvbnN0IGdyb3VwSWQgPSBwYXJlbnRHcm91cC5hdHRyKCdpZCcpLnZhbHVlKCk7XHJcbiAgICAgICAgICBjb25zdCBtYXRjaGluZ0luZGV4R3JvdXAgPSBnYW1lSW5kZXhGaWxlLmZpbmQ8RWxlbWVudD4oJy8vR3JvdXAnKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGdyb3VwID0+IGdyb3VwLmF0dHIoJ2lkJykudmFsdWUoKSA9PT0gZ3JvdXBJZCk7XHJcbiAgICAgICAgICBpZiAobWF0Y2hpbmdJbmRleEdyb3VwLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgLy8gU29tZXRoaW5nJ3Mgd3Jvbmcgd2l0aCB0aGUgZmlsZSAtIGJhY2sgb2ZmLlxyXG4gICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgdXRpbC5EYXRhSW52YWxpZCgnRHVwbGljYXRlIGdyb3VwIGVudHJpZXMgZm91bmQgaW4gZ2FtZSBpbnB1dC54bWwnXHJcbiAgICAgICAgICAgICAgKyBgXFxuXFxuJHtwYXRoLmpvaW4obWVyZ2VEaXIsIElOUFVUX1hNTF9GSUxFTkFNRSl9XFxuXFxuYFxyXG4gICAgICAgICAgICAgICsgJ2ZpbGUgLSBwbGVhc2UgZml4IHRoaXMgbWFudWFsbHkgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcmUtaW5zdGFsbCB0aGUgbW9kJyk7XHJcbiAgICAgICAgICAgIGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignRHVwbGljYXRlIGdyb3VwIGVudHJpZXMgZGV0ZWN0ZWQnLCBlcnIsXHJcbiAgICAgICAgICAgICAgeyBhbGxvd1JlcG9ydDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaGluZ0luZGV4R3JvdXAubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gYWRkIHRoZSBncm91cCBBTkQgdGhlIHZhci5cclxuICAgICAgICAgICAgY29uc3QgdXNlckNvbmZpZyA9IGdhbWVJbmRleEZpbGUuZ2V0PEVsZW1lbnQ+KCcvL1VzZXJDb25maWcnKTtcclxuICAgICAgICAgICAgdXNlckNvbmZpZy5hZGRDaGlsZChwYXJlbnRHcm91cC5jbG9uZSgpKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIChtYXRjaGluZ0luZGV4R3JvdXBbMF0uY2hpbGQoMCkgYXMgRWxlbWVudCkuYWRkQ2hpbGQobW9kVmFyLmNsb25lKCkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gZnMud3JpdGVGaWxlQXN5bmMocGF0aC5qb2luKG1lcmdlRGlyLCBDT05GSUdfTUFUUklYX1JFTF9QQVRILCBJTlBVVF9YTUxfRklMRU5BTUUpLFxyXG4gICAgICAgIGdhbWVJbmRleEZpbGUpO1xyXG4gICAgfSlcclxuICAgIC5jYXRjaChlcnIgPT4ge1xyXG4gICAgICBsb2coJ2Vycm9yJywgJ2lucHV0LnhtbCBtZXJnZSBmYWlsZWQnLCBlcnIpO1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuY29uc3QgU0NSSVBUX01FUkdFUl9GSUxFUyA9IFsnV2l0Y2hlclNjcmlwdE1lcmdlci5leGUnXTtcclxuZnVuY3Rpb24gc2NyaXB0TWVyZ2VyVGVzdChmaWxlcywgZ2FtZUlkKSB7XHJcbiAgY29uc3QgbWF0Y2hlciA9IChmaWxlID0+IFNDUklQVF9NRVJHRVJfRklMRVMuaW5jbHVkZXMoZmlsZSkpO1xyXG4gIGNvbnN0IHN1cHBvcnRlZCA9ICgoZ2FtZUlkID09PSBHQU1FX0lEKSAmJiAoZmlsZXMuZmlsdGVyKG1hdGNoZXIpLmxlbmd0aCA+IDApKTtcclxuXHJcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7IHN1cHBvcnRlZCwgcmVxdWlyZWRGaWxlczogU0NSSVBUX01FUkdFUl9GSUxFUyB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW9kU2V0dGluZ3NFcnJvckhhbmRsZXIoY29udGV4dCwgZXJyLCBlcnJNZXNzYWdlKSB7XHJcbiAgbGV0IGFsbG93UmVwb3J0ID0gdHJ1ZTtcclxuICBjb25zdCB1c2VyQ2FuY2VsZWQgPSBlcnIgaW5zdGFuY2VvZiB1dGlsLlVzZXJDYW5jZWxlZDtcclxuICBpZiAodXNlckNhbmNlbGVkKSB7XHJcbiAgICBhbGxvd1JlcG9ydCA9IGZhbHNlO1xyXG4gIH1cclxuICBjb25zdCBidXN5UmVzb3VyY2UgPSBlcnIgaW5zdGFuY2VvZiBSZXNvdXJjZUluYWNjZXNzaWJsZUVycm9yO1xyXG4gIGlmIChhbGxvd1JlcG9ydCAmJiBidXN5UmVzb3VyY2UpIHtcclxuICAgIGFsbG93UmVwb3J0ID0gZXJyLmFsbG93UmVwb3J0O1xyXG4gICAgZXJyLm1lc3NhZ2UgPSBlcnIuZXJyb3JNZXNzYWdlO1xyXG4gIH1cclxuXHJcbiAgY29udGV4dC5hcGkuc2hvd0Vycm9yTm90aWZpY2F0aW9uKGVyck1lc3NhZ2UsIGVyciwgeyBhbGxvd1JlcG9ydCB9KTtcclxuICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjcmlwdE1lcmdlckR1bW15SW5zdGFsbGVyKGNvbnRleHQsIGZpbGVzKSB7XHJcbiAgY29udGV4dC5hcGkuc2hvd0Vycm9yTm90aWZpY2F0aW9uKCdJbnZhbGlkIE1vZCcsICdJdCBsb29rcyBsaWtlIHlvdSB0cmllZCB0byBpbnN0YWxsICdcclxuICAgICsgJ1RoZSBXaXRjaGVyIDMgU2NyaXB0IE1lcmdlciwgd2hpY2ggaXMgYSB0b29sIGFuZCBub3QgYSBtb2QgZm9yIFRoZSBXaXRjaGVyIDMuXFxuXFxuJ1xyXG4gICAgKyAnVGhlIHNjcmlwdCBtZXJnZXIgc2hvdWxkXFwndmUgYmVlbiBpbnN0YWxsZWQgYXV0b21hdGljYWxseSBieSBWb3J0ZXggYXMgc29vbiBhcyB5b3UgYWN0aXZhdGVkIHRoaXMgZXh0ZW5zaW9uLiAnXHJcbiAgICArICdJZiB0aGUgZG93bmxvYWQgb3IgaW5zdGFsbGF0aW9uIGhhcyBmYWlsZWQgZm9yIGFueSByZWFzb24gLSBwbGVhc2UgbGV0IHVzIGtub3cgd2h5LCBieSByZXBvcnRpbmcgdGhlIGVycm9yIHRocm91Z2ggJ1xyXG4gICAgKyAnb3VyIGZlZWRiYWNrIHN5c3RlbSBhbmQgbWFrZSBzdXJlIHRvIGluY2x1ZGUgdm9ydGV4IGxvZ3MuIFBsZWFzZSBub3RlOiBpZiB5b3VcXCd2ZSBpbnN0YWxsZWQgJ1xyXG4gICAgKyAndGhlIHNjcmlwdCBtZXJnZXIgaW4gcHJldmlvdXMgdmVyc2lvbnMgb2YgVm9ydGV4IGFzIGEgbW9kIGFuZCBTVElMTCBoYXZlIGl0IGluc3RhbGxlZCAnXHJcbiAgICArICcoaXRcXCdzIHByZXNlbnQgaW4geW91ciBtb2QgbGlzdCkgLSB5b3Ugc2hvdWxkIGNvbnNpZGVyIHVuLWluc3RhbGxpbmcgaXQgZm9sbG93ZWQgYnkgYSBWb3J0ZXggcmVzdGFydDsgJ1xyXG4gICAgKyAndGhlIGF1dG9tYXRpYyBtZXJnZXIgaW5zdGFsbGVyL3VwZGF0ZXIgc2hvdWxkIHRoZW4ga2ljayBvZmYgYW5kIHNldCB1cCB0aGUgdG9vbCBmb3IgeW91LicsXHJcbiAgICB7IGFsbG93UmVwb3J0OiBmYWxzZSB9KTtcclxuICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IHV0aWwuUHJvY2Vzc0NhbmNlbGVkKCdJbnZhbGlkIG1vZCcpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRvQmx1ZTxUPihmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4pOiAoLi4uYXJnczogYW55W10pID0+IEJsdWViaXJkPFQ+IHtcclxuICByZXR1cm4gKC4uLmFyZ3M6IGFueVtdKSA9PiBCbHVlYmlyZC5yZXNvbHZlKGZ1bmMoLi4uYXJncykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWluKGNvbnRleHQ6IHR5cGVzLklFeHRlbnNpb25Db250ZXh0KSB7XHJcbiAgY29udGV4dC5yZWdpc3RlclJlZHVjZXIoWydzZXR0aW5ncycsICd3aXRjaGVyMyddLCBXM1JlZHVjZXIpO1xyXG4gIGxldCBwcmlvcml0eU1hbmFnZXI6IFByaW9yaXR5TWFuYWdlcjtcclxuICBsZXQgbW9kTGltaXRQYXRjaGVyOiBNb2RMaW1pdFBhdGNoZXI7XHJcbiAgY29udGV4dC5yZWdpc3RlckdhbWUoe1xyXG4gICAgaWQ6IEdBTUVfSUQsXHJcbiAgICBuYW1lOiAnVGhlIFdpdGNoZXIgMycsXHJcbiAgICBtZXJnZU1vZHM6IHRydWUsXHJcbiAgICBxdWVyeVBhdGg6IGZpbmRHYW1lLFxyXG4gICAgcXVlcnlNb2RQYXRoOiAoKSA9PiAnTW9kcycsXHJcbiAgICBsb2dvOiAnZ2FtZWFydC5qcGcnLFxyXG4gICAgZXhlY3V0YWJsZTogKCkgPT4gJ2Jpbi94NjQvd2l0Y2hlcjMuZXhlJyxcclxuICAgIHNldHVwOiB0b0JsdWUoKGRpc2NvdmVyeSkgPT4gcHJlcGFyZUZvck1vZGRpbmcoY29udGV4dCwgZGlzY292ZXJ5KSksXHJcbiAgICBzdXBwb3J0ZWRUb29sczogdG9vbHMsXHJcbiAgICByZXF1aXJlc0NsZWFudXA6IHRydWUsXHJcbiAgICByZXF1aXJlZEZpbGVzOiBbXHJcbiAgICAgICdiaW4veDY0L3dpdGNoZXIzLmV4ZScsXHJcbiAgICBdLFxyXG4gICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgU3RlYW1BUFBJZDogJzI5MjAzMCcsXHJcbiAgICB9LFxyXG4gICAgZGV0YWlsczoge1xyXG4gICAgICBzdGVhbUFwcElkOiAyOTIwMzAsXHJcbiAgICAgIGlnbm9yZUNvbmZsaWN0czogRE9fTk9UX0RFUExPWSxcclxuICAgICAgaWdub3JlRGVwbG95OiBET19OT1RfREVQTE9ZLFxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgY29uc3QgZ2V0RExDUGF0aCA9IChnYW1lKSA9PiB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBkaXNjb3ZlcnkgPSBzdGF0ZS5zZXR0aW5ncy5nYW1lTW9kZS5kaXNjb3ZlcmVkW2dhbWUuaWRdO1xyXG4gICAgcmV0dXJuIHBhdGguam9pbihkaXNjb3ZlcnkucGF0aCwgJ0RMQycpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGdldFRMUGF0aCA9IChnYW1lKSA9PiB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBkaXNjb3ZlcnkgPSBzdGF0ZS5zZXR0aW5ncy5nYW1lTW9kZS5kaXNjb3ZlcmVkW2dhbWUuaWRdO1xyXG4gICAgcmV0dXJuIGRpc2NvdmVyeS5wYXRoO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGlzVFczID0gKGdhbWVJZCA9IHVuZGVmaW5lZCkgPT4ge1xyXG4gICAgaWYgKGdhbWVJZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiAoZ2FtZUlkID09PSBHQU1FX0lEKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHN0YXRlID0gY29udGV4dC5hcGkuZ2V0U3RhdGUoKTtcclxuICAgIGNvbnN0IGdhbWVNb2RlID0gc2VsZWN0b3JzLmFjdGl2ZUdhbWVJZChzdGF0ZSk7XHJcbiAgICByZXR1cm4gKGdhbWVNb2RlID09PSBHQU1FX0lEKTtcclxuICB9O1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVySW5zdGFsbGVyKCd3aXRjaGVyM3RsJywgMjUsIHRvQmx1ZSh0ZXN0U3VwcG9ydGVkVEwpLCB0b0JsdWUoaW5zdGFsbFRMKSk7XHJcbiAgY29udGV4dC5yZWdpc3Rlckluc3RhbGxlcignd2l0Y2hlcjNtaXhlZCcsIDMwLCB0b0JsdWUodGVzdFN1cHBvcnRlZE1peGVkKSwgdG9CbHVlKGluc3RhbGxNaXhlZCkpO1xyXG4gIGNvbnRleHQucmVnaXN0ZXJJbnN0YWxsZXIoJ3dpdGNoZXIzY29udGVudCcsIDUwLFxyXG4gICAgdG9CbHVlKHRlc3RTdXBwb3J0ZWRDb250ZW50KSwgdG9CbHVlKGluc3RhbGxDb250ZW50KSk7XHJcbiAgY29udGV4dC5yZWdpc3Rlckluc3RhbGxlcignd2l0Y2hlcjNtZW51bW9kcm9vdCcsIDIwLFxyXG4gICAgdG9CbHVlKHRlc3RNZW51TW9kUm9vdCBhcyBhbnkpLCB0b0JsdWUoaW5zdGFsbE1lbnVNb2QpKTtcclxuICBjb250ZXh0LnJlZ2lzdGVySW5zdGFsbGVyKCdzY3JpcHRtZXJnZXJkdW1teScsIDE1LFxyXG4gICAgdG9CbHVlKHNjcmlwdE1lcmdlclRlc3QpLCB0b0JsdWUoKGZpbGVzKSA9PiBzY3JpcHRNZXJnZXJEdW1teUluc3RhbGxlcihjb250ZXh0LCBmaWxlcykpKTtcclxuXHJcbiAgY29udGV4dC5yZWdpc3Rlck1vZFR5cGUoJ3dpdGNoZXIzdGwnLCAyNSwgaXNUVzMsIGdldFRMUGF0aCwgdG9CbHVlKHRlc3RUTCkpO1xyXG4gIGNvbnRleHQucmVnaXN0ZXJNb2RUeXBlKCd3aXRjaGVyM2RsYycsIDI1LCBpc1RXMywgZ2V0RExDUGF0aCwgdG9CbHVlKHRlc3RETEMpKTtcclxuICBjb250ZXh0LnJlZ2lzdGVyTW9kVHlwZSgnd2l0Y2hlcjNtZW51bW9kcm9vdCcsIDIwLFxyXG4gICAgaXNUVzMsIGdldFRMUGF0aCwgdG9CbHVlKHRlc3RNZW51TW9kUm9vdCBhcyBhbnkpKTtcclxuICBjb250ZXh0LnJlZ2lzdGVyTW9kVHlwZSgnd2l0Y2hlcjNtZW51bW9kZG9jdW1lbnRzJywgNjAsIGlzVFczLFxyXG4gICAgKGdhbWUpID0+IHBhdGguam9pbih1dGlsLmdldFZvcnRleFBhdGgoJ2RvY3VtZW50cycpLCAnVGhlIFdpdGNoZXIgMycpLFxyXG4gICAgKCkgPT4gQmx1ZWJpcmQucmVzb2x2ZShmYWxzZSkpO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyTW9kVHlwZSgndzNtb2RsaW1pdHBhdGNoZXInLCAyNSwgaXNUVzMsIGdldFRMUGF0aCwgKCkgPT4gQmx1ZWJpcmQucmVzb2x2ZShmYWxzZSksXHJcbiAgICB7IGRlcGxveW1lbnRFc3NlbnRpYWw6IGZhbHNlLCBuYW1lOiAnTW9kIExpbWl0IFBhdGNoZXIgTW9kIFR5cGUnIH0pO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyTWVyZ2UoY2FuTWVyZ2UsXHJcbiAgICAoZmlsZVBhdGgsIG1lcmdlRGlyKSA9PiBtZXJnZShmaWxlUGF0aCwgbWVyZ2VEaXIsIGNvbnRleHQpLCAnd2l0Y2hlcjNtZW51bW9kcm9vdCcpO1xyXG5cclxuICByZWdpc3RlckFjdGlvbnMoe1xyXG4gICAgY29udGV4dCxcclxuICAgIHJlZnJlc2hGdW5jLFxyXG4gICAgZ2V0UHJpb3JpdHlNYW5hZ2VyOiAoKSA9PiBwcmlvcml0eU1hbmFnZXIsXHJcbiAgICBnZXRNb2RMaW1pdFBhdGNoZXI6ICgpID0+IG1vZExpbWl0UGF0Y2hlcixcclxuICB9KTtcclxuXHJcbiAgY29udGV4dFsncmVnaXN0ZXJDb2xsZWN0aW9uRmVhdHVyZSddKFxyXG4gICAgJ3dpdGNoZXIzX2NvbGxlY3Rpb25fZGF0YScsXHJcbiAgICAoZ2FtZUlkOiBzdHJpbmcsIGluY2x1ZGVkTW9kczogc3RyaW5nW10sIGNvbGxlY3Rpb246IHR5cGVzLklNb2QpID0+XHJcbiAgICAgIGdlbkNvbGxlY3Rpb25zRGF0YShjb250ZXh0LCBnYW1lSWQsIGluY2x1ZGVkTW9kcywgY29sbGVjdGlvbiksXHJcbiAgICAoZ2FtZUlkOiBzdHJpbmcsIGNvbGxlY3Rpb246IElXM0NvbGxlY3Rpb25zRGF0YSkgPT5cclxuICAgICAgcGFyc2VDb2xsZWN0aW9uc0RhdGEoY29udGV4dCwgZ2FtZUlkLCBjb2xsZWN0aW9uKSxcclxuICAgICgpID0+IFByb21pc2UucmVzb2x2ZSgpLFxyXG4gICAgKHQpID0+IHQoJ1dpdGNoZXIgMyBEYXRhJyksXHJcbiAgICAoc3RhdGU6IHR5cGVzLklTdGF0ZSwgZ2FtZUlkOiBzdHJpbmcpID0+IGdhbWVJZCA9PT0gR0FNRV9JRCxcclxuICAgIENvbGxlY3Rpb25zRGF0YVZpZXcsXHJcbiAgKTtcclxuXHJcbiAgY29udGV4dC5yZWdpc3RlclByb2ZpbGVGZWF0dXJlKFxyXG4gICAgJ2xvY2FsX21lcmdlcycsICdib29sZWFuJywgJ3NldHRpbmdzJywgJ1Byb2ZpbGUgRGF0YScsXHJcbiAgICAnVGhpcyBwcm9maWxlIHdpbGwgc3RvcmUgYW5kIHJlc3RvcmUgcHJvZmlsZSBzcGVjaWZpYyBkYXRhIChtZXJnZWQgc2NyaXB0cywgbG9hZG9yZGVyLCBldGMpIHdoZW4gc3dpdGNoaW5nIHByb2ZpbGVzJyxcclxuICAgICgpID0+IHtcclxuICAgICAgY29uc3QgYWN0aXZlR2FtZUlkID0gc2VsZWN0b3JzLmFjdGl2ZUdhbWVJZChjb250ZXh0LmFwaS5nZXRTdGF0ZSgpKTtcclxuICAgICAgcmV0dXJuIGFjdGl2ZUdhbWVJZCA9PT0gR0FNRV9JRDtcclxuICAgIH0pO1xyXG5cclxuICBjb25zdCBpbnZhbGlkTW9kVHlwZXMgPSBbJ3dpdGNoZXIzbWVudW1vZGRvY3VtZW50cycsICdjb2xsZWN0aW9uJ107XHJcbiAgY29udGV4dC5yZWdpc3RlckxvYWRPcmRlclBhZ2Uoe1xyXG4gICAgZ2FtZUlkOiBHQU1FX0lELFxyXG4gICAgY3JlYXRlSW5mb1BhbmVsOiAocHJvcHMpID0+IHtcclxuICAgICAgcmVmcmVzaEZ1bmMgPSBwcm9wcy5yZWZyZXNoO1xyXG4gICAgICByZXR1cm4gaW5mb0NvbXBvbmVudChjb250ZXh0LCBwcm9wcykgYXMgYW55O1xyXG4gICAgfSxcclxuICAgIGdhbWVBcnRVUkw6IGAke19fZGlybmFtZX0vZ2FtZWFydC5qcGdgLFxyXG4gICAgZmlsdGVyOiAobW9kcykgPT4gbW9kcy5maWx0ZXIobW9kID0+ICFpbnZhbGlkTW9kVHlwZXMuaW5jbHVkZXMobW9kLnR5cGUpKSxcclxuICAgIHByZVNvcnQ6IChpdGVtczogYW55W10sIGRpcmVjdGlvbjogYW55LCB1cGRhdGVUeXBlOiBhbnkpID0+IHtcclxuICAgICAgcmV0dXJuIHByZVNvcnQoY29udGV4dCwgaXRlbXMsIGRpcmVjdGlvbiwgdXBkYXRlVHlwZSwgcHJpb3JpdHlNYW5hZ2VyKSBhcyBhbnk7XHJcbiAgICB9LFxyXG4gICAgbm9Db2xsZWN0aW9uR2VuZXJhdGlvbjogdHJ1ZSxcclxuICAgIGNhbGxiYWNrOiAobG9hZE9yZGVyLCB1cGRhdGVUeXBlKSA9PiB7XHJcbiAgICAgIGlmIChsb2FkT3JkZXIgPT09IF9QUkVWSU9VU19MTykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKF9QUkVWSU9VU19MTyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgY29udGV4dC5hcGkuc3RvcmUuZGlzcGF0Y2goYWN0aW9ucy5zZXREZXBsb3ltZW50TmVjZXNzYXJ5KEdBTUVfSUQsIHRydWUpKTtcclxuICAgICAgfVxyXG4gICAgICBfUFJFVklPVVNfTE8gPSBsb2FkT3JkZXI7XHJcbiAgICAgIHNldElOSVN0cnVjdChjb250ZXh0LCBsb2FkT3JkZXIsIHByaW9yaXR5TWFuYWdlcilcclxuICAgICAgICAudGhlbigoKSA9PiB3cml0ZVRvTW9kU2V0dGluZ3MoKSlcclxuICAgICAgICAuY2F0Y2goZXJyID0+IG1vZFNldHRpbmdzRXJyb3JIYW5kbGVyKGNvbnRleHQsIGVycixcclxuICAgICAgICAgICdGYWlsZWQgdG8gbW9kaWZ5IGxvYWQgb3JkZXIgZmlsZScpKTtcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIGNvbnRleHQucmVnaXN0ZXJUZXN0KCd0dzMtbW9kLWxpbWl0LWJyZWFjaCcsICdnYW1lbW9kZS1hY3RpdmF0ZWQnLFxyXG4gICAgKCkgPT4gQmx1ZWJpcmQucmVzb2x2ZSh0ZXN0TW9kTGltaXRCcmVhY2goY29udGV4dC5hcGksIG1vZExpbWl0UGF0Y2hlcikpKTtcclxuICBjb250ZXh0LnJlZ2lzdGVyVGVzdCgndHczLW1vZC1saW1pdC1icmVhY2gnLCAnbW9kLWFjdGl2YXRlZCcsXHJcbiAgICAoKSA9PiBCbHVlYmlyZC5yZXNvbHZlKHRlc3RNb2RMaW1pdEJyZWFjaChjb250ZXh0LmFwaSwgbW9kTGltaXRQYXRjaGVyKSkpO1xyXG5cclxuICBjb25zdCByZXZlcnRMT0ZpbGUgPSAoKSA9PiB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBwcm9maWxlID0gc2VsZWN0b3JzLmFjdGl2ZVByb2ZpbGUoc3RhdGUpO1xyXG4gICAgaWYgKCEhcHJvZmlsZSAmJiAocHJvZmlsZS5nYW1lSWQgPT09IEdBTUVfSUQpKSB7XHJcbiAgICAgIGNvbnN0IGxvYWRPcmRlciA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ2xvYWRPcmRlcicsIHByb2ZpbGUuaWRdLCB1bmRlZmluZWQpO1xyXG4gICAgICByZXR1cm4gZ2V0TWFudWFsbHlBZGRlZE1vZHMoY29udGV4dCkudGhlbigobWFudWFsbHlBZGRlZCkgPT4ge1xyXG4gICAgICAgIGlmIChtYW51YWxseUFkZGVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGNvbnN0IG5ld1N0cnVjdCA9IHt9O1xyXG4gICAgICAgICAgbWFudWFsbHlBZGRlZC5mb3JFYWNoKChtb2QsIGlkeCkgPT4ge1xyXG4gICAgICAgICAgICBuZXdTdHJ1Y3RbbW9kXSA9IHtcclxuICAgICAgICAgICAgICBFbmFibGVkOiAxLFxyXG4gICAgICAgICAgICAgIFByaW9yaXR5OiAoKGxvYWRPcmRlciAhPT0gdW5kZWZpbmVkICYmICEhbG9hZE9yZGVyW21vZF0pXHJcbiAgICAgICAgICAgICAgICA/IHBhcnNlSW50KGxvYWRPcmRlclttb2RdLnByZWZpeCwgMTApIDogaWR4KSArIDEsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBfSU5JX1NUUlVDVCA9IG5ld1N0cnVjdDtcclxuICAgICAgICAgIHdyaXRlVG9Nb2RTZXR0aW5ncygpXHJcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICByZWZyZXNoRnVuYz8uKCk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuY2F0Y2goZXJyID0+IG1vZFNldHRpbmdzRXJyb3JIYW5kbGVyKGNvbnRleHQsIGVycixcclxuICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNsZWFudXAgbG9hZCBvcmRlciBmaWxlJykpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGdldExvYWRPcmRlckZpbGVQYXRoKCk7XHJcbiAgICAgICAgICBmcy5yZW1vdmVBc3luYyhmaWxlUGF0aClcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKVxyXG4gICAgICAgICAgICAgID8gUHJvbWlzZS5yZXNvbHZlKClcclxuICAgICAgICAgICAgICA6IGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignRmFpbGVkIHRvIGNsZWFudXAgbG9hZCBvcmRlciBmaWxlJywgZXJyKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBjb25zdCB2YWxpZGF0ZVByb2ZpbGUgPSAocHJvZmlsZUlkLCBzdGF0ZSkgPT4ge1xyXG4gICAgY29uc3QgYWN0aXZlUHJvZmlsZSA9IHNlbGVjdG9ycy5hY3RpdmVQcm9maWxlKHN0YXRlKTtcclxuICAgIGNvbnN0IGRlcGxveVByb2ZpbGUgPSBzZWxlY3RvcnMucHJvZmlsZUJ5SWQoc3RhdGUsIHByb2ZpbGVJZCk7XHJcbiAgICBpZiAoISFhY3RpdmVQcm9maWxlICYmICEhZGVwbG95UHJvZmlsZSAmJiAoZGVwbG95UHJvZmlsZS5pZCAhPT0gYWN0aXZlUHJvZmlsZS5pZCkpIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYWN0aXZlUHJvZmlsZT8uZ2FtZUlkICE9PSBHQU1FX0lEKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFjdGl2ZVByb2ZpbGU7XHJcbiAgfTtcclxuXHJcbiAgbGV0IHByZXZEZXBsb3ltZW50ID0gW107XHJcbiAgY29udGV4dC5vbmNlKCgpID0+IHtcclxuICAgIG1vZExpbWl0UGF0Y2hlciA9IG5ldyBNb2RMaW1pdFBhdGNoZXIoY29udGV4dC5hcGkpO1xyXG4gICAgcHJpb3JpdHlNYW5hZ2VyID0gbmV3IFByaW9yaXR5TWFuYWdlcihjb250ZXh0LmFwaSwgJ3ByZWZpeC1iYXNlZCcpO1xyXG4gICAgY29udGV4dC5hcGkuZXZlbnRzLm9uKCdnYW1lbW9kZS1hY3RpdmF0ZWQnLCBhc3luYyAoZ2FtZU1vZGUpID0+IHtcclxuICAgICAgaWYgKGdhbWVNb2RlICE9PSBHQU1FX0lEKSB7XHJcbiAgICAgICAgLy8gSnVzdCBpbiBjYXNlIHRoZSBzY3JpcHQgbWVyZ2VyIG5vdGlmaWNhdGlvbiBpcyBzdGlsbFxyXG4gICAgICAgIC8vICBwcmVzZW50LlxyXG4gICAgICAgIGNvbnRleHQuYXBpLmRpc21pc3NOb3RpZmljYXRpb24oJ3dpdGNoZXIzLW1lcmdlJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5nZXRTdGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IGxhc3RQcm9mSWQgPSBzZWxlY3RvcnMubGFzdEFjdGl2ZVByb2ZpbGVGb3JHYW1lKHN0YXRlLCBnYW1lTW9kZSk7XHJcbiAgICAgICAgY29uc3QgYWN0aXZlUHJvZiA9IHNlbGVjdG9ycy5hY3RpdmVQcm9maWxlKHN0YXRlKTtcclxuICAgICAgICBjb25zdCBwcmlvcml0eVR5cGUgPSB1dGlsLmdldFNhZmUoc3RhdGUsIGdldFByaW9yaXR5VHlwZUJyYW5jaCgpLCAncHJlZml4LWJhc2VkJyk7XHJcbiAgICAgICAgY29udGV4dC5hcGkuc3RvcmUuZGlzcGF0Y2goc2V0UHJpb3JpdHlUeXBlKHByaW9yaXR5VHlwZSkpO1xyXG4gICAgICAgIGlmIChsYXN0UHJvZklkICE9PSBhY3RpdmVQcm9mPy5pZCkge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgc3RvcmVUb1Byb2ZpbGUoY29udGV4dCwgbGFzdFByb2ZJZClcclxuICAgICAgICAgICAgICAudGhlbigoKSA9PiByZXN0b3JlRnJvbVByb2ZpbGUoY29udGV4dCwgYWN0aXZlUHJvZj8uaWQpKTtcclxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBjb250ZXh0LmFwaS5zaG93RXJyb3JOb3RpZmljYXRpb24oJ0ZhaWxlZCB0byByZXN0b3JlIHByb2ZpbGUgbWVyZ2VkIGZpbGVzJywgZXJyKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgY29udGV4dC5hcGkub25Bc3luYygnd2lsbC1kZXBsb3knLCAocHJvZmlsZUlkLCBkZXBsb3ltZW50KSA9PiB7XHJcbiAgICAgIGNvbnN0IHN0YXRlID0gY29udGV4dC5hcGkuc3RvcmUuZ2V0U3RhdGUoKTtcclxuICAgICAgY29uc3QgYWN0aXZlUHJvZmlsZSA9IHZhbGlkYXRlUHJvZmlsZShwcm9maWxlSWQsIHN0YXRlKTtcclxuICAgICAgaWYgKGFjdGl2ZVByb2ZpbGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG1lbnVNb2Qub25XaWxsRGVwbG95KGNvbnRleHQuYXBpLCBkZXBsb3ltZW50LCBhY3RpdmVQcm9maWxlKVxyXG4gICAgICAgIC5jYXRjaChlcnIgPT4gKGVyciBpbnN0YW5jZW9mIHV0aWwuVXNlckNhbmNlbGVkKVxyXG4gICAgICAgICAgPyBQcm9taXNlLnJlc29sdmUoKVxyXG4gICAgICAgICAgOiBQcm9taXNlLnJlamVjdChlcnIpKTtcclxuICAgIH0pO1xyXG4gICAgY29udGV4dC5hcGkub25Bc3luYygnZGlkLWRlcGxveScsIGFzeW5jIChwcm9maWxlSWQsIGRlcGxveW1lbnQpID0+IHtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5zdG9yZS5nZXRTdGF0ZSgpO1xyXG4gICAgICBjb25zdCBhY3RpdmVQcm9maWxlID0gdmFsaWRhdGVQcm9maWxlKHByb2ZpbGVJZCwgc3RhdGUpO1xyXG4gICAgICBpZiAoYWN0aXZlUHJvZmlsZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoSlNPTi5zdHJpbmdpZnkocHJldkRlcGxveW1lbnQpICE9PSBKU09OLnN0cmluZ2lmeShkZXBsb3ltZW50KSkge1xyXG4gICAgICAgIHByZXZEZXBsb3ltZW50ID0gZGVwbG95bWVudDtcclxuICAgICAgICBxdWVyeVNjcmlwdE1lcmdlKGNvbnRleHQsICdZb3VyIG1vZHMgc3RhdGUvbG9hZCBvcmRlciBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHlvdSByYW4gJ1xyXG4gICAgICAgICAgKyAndGhlIHNjcmlwdCBtZXJnZXIuIFlvdSBtYXkgd2FudCB0byBydW4gdGhlIG1lcmdlciB0b29sIGFuZCBjaGVjayB3aGV0aGVyIGFueSBuZXcgc2NyaXB0IGNvbmZsaWN0cyBhcmUgJ1xyXG4gICAgICAgICAgKyAncHJlc2VudCwgb3IgaWYgZXhpc3RpbmcgbWVyZ2VzIGhhdmUgYmVjb21lIHVuZWNlc3NhcnkuIFBsZWFzZSBhbHNvIG5vdGUgdGhhdCBhbnkgbG9hZCBvcmRlciBjaGFuZ2VzICdcclxuICAgICAgICAgICsgJ21heSBhZmZlY3QgdGhlIG9yZGVyIGluIHdoaWNoIHlvdXIgY29uZmxpY3RpbmcgbW9kcyBhcmUgbWVhbnQgdG8gYmUgbWVyZ2VkLCBhbmQgbWF5IHJlcXVpcmUgeW91IHRvICdcclxuICAgICAgICAgICsgJ3JlbW92ZSB0aGUgZXhpc3RpbmcgbWVyZ2UgYW5kIHJlLWFwcGx5IGl0LicpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGxvYWRPcmRlciA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ2xvYWRPcmRlcicsIGFjdGl2ZVByb2ZpbGUuaWRdLCB7fSk7XHJcbiAgICAgIGNvbnN0IGRvY0ZpbGVzID0gZGVwbG95bWVudFsnd2l0Y2hlcjNtZW51bW9kcm9vdCddXHJcbiAgICAgICAgLmZpbHRlcihmaWxlID0+IGZpbGUucmVsUGF0aC5lbmRzV2l0aChQQVJUX1NVRkZJWClcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKGZpbGUucmVsUGF0aC5pbmRleE9mKElOUFVUX1hNTF9GSUxFTkFNRSkgPT09IC0xKSk7XHJcbiAgICAgIGNvbnN0IG1lbnVNb2RQcm9taXNlID0gKCkgPT4ge1xyXG4gICAgICAgIGlmIChkb2NGaWxlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBtZW51IG1vZHMgZGVwbG95ZWQgLSByZW1vdmUgdGhlIG1vZC5cclxuICAgICAgICAgIHJldHVybiBtZW51TW9kLnJlbW92ZU1vZChjb250ZXh0LmFwaSwgYWN0aXZlUHJvZmlsZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiBtZW51TW9kLm9uRGlkRGVwbG95KGNvbnRleHQuYXBpLCBkZXBsb3ltZW50LCBhY3RpdmVQcm9maWxlKVxyXG4gICAgICAgICAgICAudGhlbihhc3luYyBtb2RJZCA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKG1vZElkID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGNvbnRleHQuYXBpLnN0b3JlLmRpc3BhdGNoKGFjdGlvbnMuc2V0TW9kRW5hYmxlZChhY3RpdmVQcm9maWxlLmlkLCBtb2RJZCwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgIGF3YWl0IGNvbnRleHQuYXBpLmVtaXRBbmRBd2FpdCgnZGVwbG95LXNpbmdsZS1tb2QnLCBHQU1FX0lELCBtb2RJZCk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4gbWVudU1vZFByb21pc2UoKVxyXG4gICAgICAgIC50aGVuKCgpID0+IHNldElOSVN0cnVjdChjb250ZXh0LCBsb2FkT3JkZXIsIHByaW9yaXR5TWFuYWdlcikpXHJcbiAgICAgICAgLnRoZW4oKCkgPT4gd3JpdGVUb01vZFNldHRpbmdzKCkpXHJcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgcmVmcmVzaEZ1bmM/LigpO1xyXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGVyciA9PiBtb2RTZXR0aW5nc0Vycm9ySGFuZGxlcihjb250ZXh0LCBlcnIsXHJcbiAgICAgICAgICAnRmFpbGVkIHRvIG1vZGlmeSBsb2FkIG9yZGVyIGZpbGUnKSk7XHJcbiAgICB9KTtcclxuICAgIGNvbnRleHQuYXBpLmV2ZW50cy5vbigncHJvZmlsZS13aWxsLWNoYW5nZScsIGFzeW5jIChuZXdQcm9maWxlSWQpID0+IHtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBjb250ZXh0LmFwaS5nZXRTdGF0ZSgpO1xyXG4gICAgICBjb25zdCBwcm9maWxlID0gc2VsZWN0b3JzLnByb2ZpbGVCeUlkKHN0YXRlLCBuZXdQcm9maWxlSWQpO1xyXG4gICAgICBpZiAocHJvZmlsZT8uZ2FtZUlkICE9PSBHQU1FX0lEKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwcmlvcml0eVR5cGUgPSB1dGlsLmdldFNhZmUoc3RhdGUsIGdldFByaW9yaXR5VHlwZUJyYW5jaCgpLCAncHJlZml4LWJhc2VkJyk7XHJcbiAgICAgIGNvbnRleHQuYXBpLnN0b3JlLmRpc3BhdGNoKHNldFByaW9yaXR5VHlwZShwcmlvcml0eVR5cGUpKTtcclxuXHJcbiAgICAgIGNvbnN0IGxhc3RQcm9mSWQgPSBzZWxlY3RvcnMubGFzdEFjdGl2ZVByb2ZpbGVGb3JHYW1lKHN0YXRlLCBwcm9maWxlLmdhbWVJZCk7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgc3RvcmVUb1Byb2ZpbGUoY29udGV4dCwgbGFzdFByb2ZJZClcclxuICAgICAgICAgIC50aGVuKCgpID0+IHJlc3RvcmVGcm9tUHJvZmlsZShjb250ZXh0LCBwcm9maWxlLmlkKSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGNvbnRleHQuYXBpLnNob3dFcnJvck5vdGlmaWNhdGlvbignRmFpbGVkIHRvIHN0b3JlIHByb2ZpbGUgc3BlY2lmaWMgbWVyZ2VkIGl0ZW1zJywgZXJyKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29udGV4dC5hcGkub25TdGF0ZUNoYW5nZShbJ3NldHRpbmdzJywgJ3dpdGNoZXIzJ10sIChwcmV2LCBjdXJyZW50KSA9PiB7XHJcbiAgICAgIGNvbnN0IHN0YXRlID0gY29udGV4dC5hcGkuZ2V0U3RhdGUoKTtcclxuICAgICAgY29uc3QgYWN0aXZlUHJvZmlsZSA9IHNlbGVjdG9ycy5hY3RpdmVQcm9maWxlKHN0YXRlKTtcclxuICAgICAgaWYgKGFjdGl2ZVByb2ZpbGU/LmdhbWVJZCAhPT0gR0FNRV9JRCB8fCBwcmlvcml0eU1hbmFnZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcHJpb3JpdHlUeXBlID0gdXRpbC5nZXRTYWZlKHN0YXRlLCBnZXRQcmlvcml0eVR5cGVCcmFuY2goKSwgJ3ByZWZpeC1iYXNlZCcpO1xyXG4gICAgICBwcmlvcml0eU1hbmFnZXIucHJpb3JpdHlUeXBlID0gcHJpb3JpdHlUeXBlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29udGV4dC5hcGkuZXZlbnRzLm9uKCdwdXJnZS1tb2RzJywgKCkgPT4ge1xyXG4gICAgICByZXZlcnRMT0ZpbGUoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZGVmYXVsdDogbWFpbixcclxufTtcclxuIl19