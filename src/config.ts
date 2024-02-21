import { existsSync, readFileSync } from 'fs';
import path, { join } from 'path';

import { parse as parseToml } from '@iarna/toml';
import JSON5 from 'json5';
import merge from 'lodash.merge';

import { TauriConfigV1, TauriConfigV2 } from './types';

function _tryParseJsonConfig(
  contents: string,
): TauriConfigV1 | TauriConfigV2 | null {
  try {
    const config = JSON.parse(contents) as TauriConfigV1 | TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

function _tryParseJson5Config(
  contents: string,
): TauriConfigV1 | TauriConfigV2 | null {
  try {
    const config = JSON5.parse(contents) as TauriConfigV1 | TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

function _tryParseTomlConfig(
  contents: string,
): TauriConfigV1 | TauriConfigV2 | null {
  try {
    const config = parseToml(contents) as TauriConfigV1 | TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

function readPlatformConfig(
  tauriDir: string,
  platform: string,
): TauriConfigV1 | TauriConfigV2 | null {
  let path = join(tauriDir, `tauri.${platform}.conf.json`);
  if (existsSync(path)) {
    const contents = readFileSync(path).toString();
    const config = _tryParseJsonConfig(contents);
    if (config) return config;
  }

  path = join(tauriDir, `tauri.${platform}.conf.json5`);
  if (existsSync(path)) {
    const contents = readFileSync(path).toString();
    const config = _tryParseJson5Config(contents);
    if (config) return config;
  }

  path = join(tauriDir, `Tauri.${platform}.toml`);
  if (existsSync(path)) {
    const contents = readFileSync(path).toString();
    const config = _tryParseTomlConfig(contents);
    if (config) return config;
  }

  return null;
}

/// This modifies baseConfig in-place!
export function mergePlatformConfig(
  baseConfig: TauriConfigV1 | TauriConfigV2,
  tauriDir: string,
  target: string,
) {
  const config = readPlatformConfig(tauriDir, target);

  if (config) {
    merge(baseConfig, config);
  }
}

/// This modifies baseConfig in-place!
export function mergeUserConfig(
  root: string,
  baseConfig: TauriConfigV1 | TauriConfigV2,
  mergeConfig: string,
) {
  let config = _tryParseJsonConfig(mergeConfig);

  if (!config) {
    const configPath = path.isAbsolute(mergeConfig)
      ? mergeConfig
      : path.join(root, mergeConfig);

    config = readCustomConfig(configPath);
  }

  if (config) {
    merge(baseConfig, config);
  } else {
    console.error(`Couldn't read --config: ${mergeConfig}`);
  }
}

export function getConfig(
  tauriDir: string /* customPath?: string */,
): TauriConfigV1 | TauriConfigV2 {
  /* if (customPath) {
    return readCustomConfig(customPath);
  } */

  if (existsSync(join(tauriDir, 'tauri.conf.json'))) {
    const contents = readFileSync(join(tauriDir, 'tauri.conf.json')).toString();
    const config = _tryParseJsonConfig(contents);
    if (config) return config;
    console.error("Found tauri.conf.json file but couldn't parse it as JSON.");
  }

  if (existsSync(join(tauriDir, 'tauri.conf.json5'))) {
    const contents = readFileSync(
      join(tauriDir, 'tauri.conf.json5'),
    ).toString();
    const config = _tryParseJson5Config(contents);
    if (config) return config;
    console.error(
      "Found tauri.conf.json5 file but couldn't parse it as JSON5.",
    );
  }

  if (existsSync(join(tauriDir, 'Tauri.toml'))) {
    const contents = readFileSync(join(tauriDir, 'Tauri.toml')).toString();
    const config = _tryParseTomlConfig(contents);
    if (config) return config;
    console.error("Found Tauri.toml file but couldn't parse it as TOML.");
  }

  throw "Couldn't locate or parse tauri config.";
}

function readCustomConfig(customPath: string): TauriConfigV1 | TauriConfigV2 {
  if (!existsSync(customPath)) {
    throw `Provided config path \`${customPath}\` does not exist.`;
  }

  const contents = readFileSync(customPath).toString();
  const ext = path.extname(customPath);

  if (ext === '.json') {
    const config = _tryParseJsonConfig(contents);
    if (config) return config;
  }

  if (ext === '.json5') {
    const config = _tryParseJson5Config(contents);
    if (config) return config;
  }

  if (ext === '.toml') {
    const config = _tryParseTomlConfig(contents);
    if (config) return config;
  }

  throw `Couldn't parse \`${customPath}\` as ${ext.substring(1)}.`;
}

export function isV2Config(
  config: TauriConfigV1 | TauriConfigV2,
): config is TauriConfigV2 {
  return 'identifier' in config;
}

export function convertToV2Config(config: TauriConfigV1): TauriConfigV2 {
  if (!config.tauri?.bundle?.identifier) {
    throw Error('v1 config has no bundle identifier.');
  }

  return {
    identifier: config.tauri?.bundle?.identifier,
    productName: config.package?.productName,
    version: config.package?.version,
    build: {
      frontendDist: config.build?.distDir,
      beforeBuildCommand: config.build?.beforeBuildCommand,
    },
    bundle: {
      linux: {
        rpm: {
          release: config.tauri?.bundle?.rpm?.release,
        },
      },
      windows: {
        wix: {
          language: config.tauri?.bundle?.windows?.wix?.language,
        },
      },
    },
  };
}
