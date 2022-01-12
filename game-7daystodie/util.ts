import Bluebird from 'bluebird';
import path from 'path';
import turbowalk from 'turbowalk';
import { fs, selectors, types, util } from 'vortex-api';
import { parseStringPromise } from 'xml2js';

import { GAME_ID, LO_FILE_NAME, MOD_INFO } from './common';
import { IProps } from './types';

// We _should_ just export this from vortex-api, but I guess it's not wise to make it
//  easy for users since we want to move away from bluebird in the future ?
export function toBlue<T>(func: (...args: any[]) => Promise<T>): (...args: any[]) => Bluebird<T> {
  return (...args: any[]) => Bluebird.resolve(func(...args));
}

export function genProps(context: types.IExtensionContext, profileId?: string): IProps {
  const api = context.api;
  const state = api.getState();
  const profile: types.IProfile = (profileId !== undefined)
    ? selectors.profileById(state, profileId)
    : selectors.activeProfile(state);

  if (profile?.gameId !== GAME_ID) {
    return undefined;
  }

  const discovery: types.IDiscoveryResult = util.getSafe(state,
    ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if (discovery?.path === undefined) {
    return undefined;
  }

  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return { api, state, profile, mods, discovery };
}

export async function ensureLOFile(context: types.IExtensionContext,
                                   profileId?: string,
                                   props?: IProps): Promise<string> {
  if (props === undefined) {
    props = genProps(context, profileId);
  }

  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled('failed to generate game props'));
  }

  const targetPath = path.join(props.discovery.path, props.profile.id + '_' + LO_FILE_NAME);
  try {
    await fs.statAsync(targetPath)
      .catch({ code: 'ENOENT' }, () => fs.writeFileAsync(targetPath, JSON.stringify([]), { encoding: 'utf8' }));
    return targetPath;
  } catch (err) {
    return Promise.reject(err);
  }
}

export function makePrefix(input: number) {
  let res = '';
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  return util.pad((res as any), 'A', 3);
}

export async function getModName(modInfoPath): Promise<any> {
  let modInfo;
  try {
    const xmlData = await fs.readFileAsync(modInfoPath);
    modInfo = await parseStringPromise(xmlData);
    const modName = modInfo?.ModInfo?.[0].Name?.[0]?.$?.value
                 || modInfo?.xml.ModInfo?.[0]?.Name?.[0]?.$?.value;
    return (modName !== undefined)
      ? Promise.resolve(modName)
      : Promise.reject(new util.DataInvalid('Unexpected modinfo.xml format'));
  } catch (err) {
    return Promise.reject(new util.DataInvalid('Failed to parse ModInfo.xml file'));
  }
}

export async function getModInfoFiles(basePath: string): Promise<string[]> {
  let filePaths: string[] = [];
  return turbowalk(basePath, files => {
    const filtered = files.filter(entry =>
      !entry.isDirectory && path.basename(entry.filePath) === MOD_INFO);
    filePaths = filePaths.concat(filtered.map(entry => entry.filePath));
  }, { recurse: true, skipLinks: true })
  .catch(err => ['ENOENT', 'ENOTFOUND'].includes(err.code)
    ? Promise.resolve() : Promise.reject(err))
  .then(() => Promise.resolve(filePaths));
}

export interface IAttribute extends IXmlNode<{ id: string, type: string, value: string }> {}
export interface IXmlNode<AttributeT extends object> {
  $: AttributeT;
}
export interface IModNameNode extends IXmlNode<{ id: 'Name' }> {
  attribute: IAttribute;
}
export interface IModInfoNode extends IXmlNode<{ id: 'ModInfo' }> {
  children?: [{ node: IModNameNode[] }];
  attribute?: IAttribute[];
}
