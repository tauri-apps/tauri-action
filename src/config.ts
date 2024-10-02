import { existsSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';

import { parse as parseToml } from '@iarna/toml';
import JSON5 from 'json5';

import { TargetPlatform, TauriConfigV1, TauriConfigV2 } from './types';

function _tryParseJsonConfig(
  contents: string,
): TauriConfigV1 | TauriConfigV2 | null {
  try {
    const config = JSON.parse(contents) as TauriConfigV1 | TauriConfigV2;
    return config;
  } catch (e) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This is not an error if it's a file path. Source: "${msg}"`,
    );
    return null;
  }
}

function _tryParseJson5Config(
  contents: string,
): TauriConfigV1 | TauriConfigV2 | null {
  try {
    const config = JSON5.parse<TauriConfigV1 | TauriConfigV2>(contents);
    return config;
  } catch (e) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This is not an error if it's a file path. Source: "${msg}"`,
    );
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
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const msg = e.message;
    console.error(
      `Couldn't parse --config flag as inline JSON. This is not an error if it's a file path. Source: "${msg}"`,
    );
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

function readCustomConfig(customPath: string): TauriConfigV1 | TauriConfigV2 {
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
  // Non tauri config properties
  private _isV2: boolean;

  // Required values
  identifier: string;

  // Optional values
  productName?: string;
  version?: string;
  frontendDist?: string;
  beforeBuildCommand?: string;
  rpmRelease?: string;
  wixLanguage?: string | string[] | { [language: string]: unknown };
  unzippedSigs?: boolean;

  constructor(identifier: string, isV2 = false) {
    this.identifier = identifier;
    this._isV2 = isV2;
  }

  public isV2(): boolean {
    return this._isV2;
  }

  public static fromBaseConfig(tauriDir: string): TauriConfig {
    if (existsSync(join(tauriDir, 'tauri.conf.json'))) {
      const contents = readFileSync(
        join(tauriDir, 'tauri.conf.json'),
      ).toString();
      const config = _tryParseJsonConfig(contents);
      if (config) {
        if ('identifier' in config) {
          return this.fromV2Base(config);
        } else {
          return this.fromV1Base(config);
        }
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
        if ('identifier' in config) {
          return this.fromV2Base(config);
        } else {
          return this.fromV1Base(config);
        }
      }
      console.error(
        "Found tauri.conf.json5 file but couldn't parse it as JSON5.",
      );
    }

    if (existsSync(join(tauriDir, 'Tauri.toml'))) {
      const contents = readFileSync(join(tauriDir, 'Tauri.toml')).toString();
      const config = _tryParseTomlConfig(contents);
      if (config) {
        if ('identifier' in config) {
          return this.fromV2Base(config);
        } else {
          return this.fromV1Base(config);
        }
      }
      console.error("Found Tauri.toml file but couldn't parse it as TOML.");
    }

    throw new Error("Couldn't locate or parse tauri config.");
  }

  private static fromV1Base(config: TauriConfigV1): TauriConfig {
    if (!config.tauri?.bundle?.identifier) {
      throw Error('base config has no bundle identifier.');
    }

    const c = new TauriConfig(config.tauri?.bundle?.identifier, false);

    c.productName = config.package?.productName;
    c.version = config.package?.version;
    c.frontendDist = config.build?.distDir;
    c.beforeBuildCommand = config.build?.beforeBuildCommand;
    c.rpmRelease = config.tauri.bundle.rpm?.release;
    c.wixLanguage = config.tauri.bundle.windows?.wix?.language;

    return c;
  }

  private static fromV2Base(config: TauriConfigV2): TauriConfig {
    if (!config.identifier) {
      throw Error('base config has no bundle identifier.');
    }

    const c = new TauriConfig(config.identifier, true);

    c.productName = config.productName;
    c.version = config.version;
    c.frontendDist = config.build?.frontendDist;
    c.beforeBuildCommand = config.build?.beforeBuildCommand;
    c.rpmRelease = config.bundle?.linux?.rpm?.release;
    c.wixLanguage = config.bundle?.windows?.wix?.language;
    c.unzippedSigs = config.bundle?.createUpdaterArtifacts === true;

    return c;
  }

  private mergeConfig(config: TauriConfigV1 | TauriConfigV2) {
    if (this._isV2) {
      const c = config as TauriConfigV2;

      this.identifier = c.identifier ?? this.identifier;
      this.productName = c.productName ?? this.productName;
      this.version = c.version ?? this.version;
      this.frontendDist = c.build?.frontendDist ?? this.frontendDist;
      this.beforeBuildCommand =
        c.build?.beforeBuildCommand ?? this.beforeBuildCommand;
      this.rpmRelease = c.bundle?.linux?.rpm?.release ?? this.rpmRelease;
      this.wixLanguage = c.bundle?.windows?.wix?.language ?? this.wixLanguage;
      this.unzippedSigs =
        c.bundle?.createUpdaterArtifacts != null
          ? c.bundle?.createUpdaterArtifacts === true
          : this.unzippedSigs;
    } else {
      const c = config as TauriConfigV1;

      this.identifier = c.tauri?.bundle?.identifier ?? this.identifier;
      this.productName = c.package?.productName ?? this.productName;
      this.version = c.package?.version ?? this.version;
      this.frontendDist = c.build?.distDir ?? this.frontendDist;
      this.beforeBuildCommand =
        c.build?.beforeBuildCommand ?? this.beforeBuildCommand;
      this.rpmRelease = c.tauri?.bundle?.rpm?.release ?? this.rpmRelease;
      this.wixLanguage =
        c.tauri?.bundle?.windows?.wix?.language ?? this.wixLanguage;
    }
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

  /// Update tauri.conf.json file on disk with current values. Used solely in `initProject()`
  /// and therefore only handles plain JSON while assuming it's a valid file straight from `tauri init`.
  public updateConfigFile(tauriDir: string) {
    const configPath = join(tauriDir, 'tauri.conf.json');
    const contents = readFileSync(configPath).toString();
    const config = _tryParseJsonConfig(contents);

    if (!config) {
      // This shouldn't happen. Instead the prior call to fromBaseConfig should fail.
      throw new Error("Couldn't parse tauri.conf.json");
    }

    if (this._isV2) {
      const c = config as TauriConfigV2;

      c.identifier = this.identifier;
      c.productName = this.productName;
      c.version = this.version;
      c.build!.beforeBuildCommand = this.beforeBuildCommand;
      c.build!.frontendDist = this.frontendDist;

      writeFileSync(configPath, JSON.stringify(c, null, 2));
    } else {
      const c = config as TauriConfigV1;

      c.build!.beforeBuildCommand = this.beforeBuildCommand;
      c.build!.distDir = this.frontendDist;
      c.package!.productName = this.productName;
      c.package!.version = this.version;
      c.tauri!.bundle!.identifier = this.identifier;

      writeFileSync(configPath, JSON.stringify(c, null, 2));
    }
  }
}
