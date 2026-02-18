import { existsSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';

import JSON5 from 'json5';
import TOML from 'smol-toml';

import type { TargetPlatform, TauriConfigV2 } from './types';

function _tryParseJsonConfig(contents: string): TauriConfigV2 | null {
  try {
    const config = JSON.parse(contents) as TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This error can be ignored if it's a file path. Source: "${msg}"`,
    );
    return null;
  }
}

function _tryParseJson5Config(contents: string): TauriConfigV2 | null {
  try {
    const config = JSON5.parse<TauriConfigV2>(contents);
    return config;
  } catch (e) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This error can be ignored if it's a file path. Source: "${msg}"`,
    );
    return null;
  }
}

function _tryParseTomlConfig(contents: string): TauriConfigV2 | null {
  try {
    const config = TOML.parse(contents) as unknown as TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This error can be ignored if it's a file path. Source: "${msg}"`,
    );
    return null;
  }
}

function readPlatformConfig(
  tauriDir: string,
  platform: string,
): TauriConfigV2 | null {
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

function readCustomConfig(customPath: string): TauriConfigV2 {
  if (!existsSync(customPath)) {
    throw new Error(`Provided config path \`${customPath}\` does not exist.`);
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

  throw new Error(`Couldn't parse \`${customPath}\` as ${ext.substring(1)}.`);
}

export class TauriConfig {
  // Required values
  identifier: string;

  // Optional values
  productName?: string;
  mainBinaryName?: string;
  version?: string;
  frontendDist?: string;
  beforeBuildCommand?: string;
  rpmRelease?: string;
  wixLanguage?: string | string[] | { [language: string]: unknown };
  unzippedSigs?: boolean;

  constructor(identifier: string) {
    this.identifier = identifier;
  }

  public static fromBaseConfig(tauriDir: string): TauriConfig {
    if (existsSync(join(tauriDir, 'tauri.conf.json'))) {
      const contents = readFileSync(
        join(tauriDir, 'tauri.conf.json'),
      ).toString();
      const config = _tryParseJsonConfig(contents);
      if (config) {
        return TauriConfig.fromV2Base(config);
      }
      console.error(
        "Found tauri.conf.json file but couldn't parse it as JSON.",
      );
    }

    if (existsSync(join(tauriDir, 'tauri.conf.json5'))) {
      const contents = readFileSync(
        join(tauriDir, 'tauri.conf.json5'),
      ).toString();
      const config = _tryParseJson5Config(contents);
      if (config) {
        return TauriConfig.fromV2Base(config);
      }
      console.error(
        "Found tauri.conf.json5 file but couldn't parse it as JSON5.",
      );
    }

    if (existsSync(join(tauriDir, 'Tauri.toml'))) {
      const contents = readFileSync(join(tauriDir, 'Tauri.toml')).toString();
      const config = _tryParseTomlConfig(contents);
      if (config) {
        return TauriConfig.fromV2Base(config);
      }
      console.error("Found Tauri.toml file but couldn't parse it as TOML.");
    }

    throw new Error("Couldn't locate or parse tauri config.");
  }

  private static fromV2Base(config: TauriConfigV2): TauriConfig {
    if (!config.identifier) {
      throw Error('base config has no bundle identifier.');
    }

    const c = new TauriConfig(config.identifier);

    c.productName = config.productName;
    c.mainBinaryName = config.mainBinaryName;
    c.version = config.version;
    c.frontendDist = config.build?.frontendDist;
    c.beforeBuildCommand = config.build?.beforeBuildCommand;
    c.rpmRelease = config.bundle?.linux?.rpm?.release;
    c.wixLanguage = config.bundle?.windows?.wix?.language;
    c.unzippedSigs = config.bundle?.createUpdaterArtifacts === true;

    return c;
  }

  private mergeConfig(config: TauriConfigV2) {
    this.identifier = config.identifier ?? this.identifier;
    this.productName = config.productName ?? this.productName;
    this.mainBinaryName = config.mainBinaryName ?? this.mainBinaryName;
    this.version = config.version ?? this.version;
    this.frontendDist = config.build?.frontendDist ?? this.frontendDist;
    this.beforeBuildCommand =
      config.build?.beforeBuildCommand ?? this.beforeBuildCommand;
    this.rpmRelease = config.bundle?.linux?.rpm?.release ?? this.rpmRelease;
    this.wixLanguage =
      config.bundle?.windows?.wix?.language ?? this.wixLanguage;
    this.unzippedSigs =
      config.bundle?.createUpdaterArtifacts != null
        ? config.bundle?.createUpdaterArtifacts === true
        : this.unzippedSigs;
  }

  public mergePlatformConfig(tauriDir: string, target: TargetPlatform) {
    const config = readPlatformConfig(tauriDir, target);

    if (config) {
      this.mergeConfig(config);
    }
  }

  public mergeUserConfig(root: string, mergeConfig: string) {
    let config = _tryParseJsonConfig(mergeConfig);

    if (!config) {
      const configPath = path.isAbsolute(mergeConfig)
        ? mergeConfig
        : path.join(root, mergeConfig);

      config = readCustomConfig(configPath);
    }

    if (config) {
      this.mergeConfig(config);
    } else {
      console.error(`Couldn't read --config: ${mergeConfig}`);
    }
  }
}
