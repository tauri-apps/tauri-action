import { existsSync, readFileSync } from 'fs';
import path, { join, normalize, resolve, sep } from 'path';

import { execa } from 'execa';
import { parse as parseToml } from '@iarna/toml';
import { sync as globSync } from 'glob-gitignore';
import ignore from 'ignore';
import JSON5 from 'json5';

import type { CargoManifest, Info, TauriConfig } from './types';

/*** constants ***/
export const extensions = [
  '.app.tar.gz.sig',
  '.app.tar.gz',
  '.dmg',
  '.AppImage.tar.gz.sig',
  '.AppImage.tar.gz',
  '.AppImage',
  '.deb',
  '.msi.zip.sig',
  '.msi.zip',
  '.msi',
];

/*** helper functions ***/
export function getAssetName(assetPath: string) {
  const basename = path.basename(assetPath);
  const exts = extensions.filter((s) => basename.includes(s));
  const ext = exts[0] || path.extname(assetPath);
  const filename = basename.replace(ext, '');

  let arch = '';
  if (ext === '.app.tar.gz.sig' || ext === '.app.tar.gz') {
    arch = assetPath.includes('universal-apple-darwin')
      ? '_universal'
      : assetPath.includes('aarch64-apple-darwin')
      ? '_aarch64'
      : '_x64';
  }

  return assetPath.includes(`${path.sep}debug${path.sep}`)
    ? `${filename}-debug${arch}${ext}`
    : `${filename}${arch}${ext}`;
}

export function getPackageJson(root: string) {
  const packageJsonPath = join(root, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString();
    const packageJson = JSON.parse(packageJsonString);
    return packageJson;
  }
  return null;
}

export function getTauriDir(root: string): string | null {
  const ignoreRules = ignore();
  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    ignoreRules.add(readFileSync(gitignorePath).toString());
  } else {
    ignoreRules.add('node_modules').add('target');
  }
  const paths = globSync(
    ['**/tauri.conf.json', '**/tauri.conf.json5', '**/Tauri.toml'],
    {
      cwd: root,
      ignore: ignoreRules,
    }
  );
  const tauriConfPath = paths[0];
  return tauriConfPath ? resolve(root, tauriConfPath, '..') : null;
}

export function getWorkspaceDir(dir: string): string | null {
  const rootPath = dir;
  while (dir.length && dir[dir.length - 1] !== sep) {
    const manifestPath = join(dir, 'Cargo.toml');
    if (existsSync(manifestPath)) {
      const toml = parseToml(readFileSync(manifestPath).toString());
      // @ts-expect-error
      if (toml.workspace?.members) {
        // @ts-expect-error
        const members: string[] = toml.workspace.members;
        if (members.some((m) => resolve(dir, m) === rootPath)) {
          return dir;
        }
      }
    }

    dir = normalize(join(dir, '..'));
  }
  return null;
}

export function getTargetDir(crateDir: string): string {
  const def = join(crateDir, 'target');
  if ('CARGO_TARGET_DIR' in process.env) {
    return process.env.CARGO_TARGET_DIR ?? def;
  }
  let dir = crateDir;
  while (dir.length && dir[dir.length - 1] !== sep) {
    let cargoConfigPath = join(dir, '.cargo/config');
    if (!existsSync(cargoConfigPath)) {
      cargoConfigPath = join(dir, '.cargo/config.toml');
    }
    if (existsSync(cargoConfigPath)) {
      const cargoConfig = parseToml(readFileSync(cargoConfigPath).toString());
      // @ts-ignore
      if (cargoConfig.build?.['target-dir']) {
        // @ts-ignore
        return cargoConfig.build['target-dir'];
      }
    }

    dir = normalize(join(dir, '..'));
  }
  return def;
}

export function hasDependency(dependencyName: string, root: string): boolean {
  const packageJson = getPackageJson(root);
  return (
    packageJson &&
    (packageJson.dependencies?.[dependencyName] ||
      packageJson.devDependencies?.[dependencyName])
  );
}

export function usesYarn(root: string): boolean {
  return existsSync(join(root, 'yarn.lock'));
}

export function usesPnpm(root: string): boolean {
  return existsSync(join(root, 'pnpm-lock.yaml'));
}

export function execCommand(
  command: string,
  args: string[],
  { cwd }: { cwd?: string } = {}
): Promise<void> {
  console.log(`running ${command}`, args);

  return execa(command, args, {
    cwd,
    stdio: 'inherit',
    env: { FORCE_COLOR: '0' },
  }).then();
}

function _tryParseJsonConfig(contents: string): TauriConfig | null {
  try {
    const config = JSON.parse(contents) as TauriConfig;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

function _tryParseJson5Config(contents: string): TauriConfig | null {
  try {
    const config = JSON5.parse(contents) as TauriConfig;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

function _tryParseTomlConfig(contents: string): TauriConfig | null {
  try {
    const config = parseToml(contents) as TauriConfig;
    return config;
  } catch (e) {
    // @ts-ignore
    console.error(e.message);
    return null;
  }
}

export function getConfig(tauriDir: string, customPath?: string): TauriConfig {
  let config;

  if (customPath) {
    if (!existsSync(customPath)) {
      throw `Provided config path \`${customPath}\` does not exist.`;
    }

    const contents = readFileSync(customPath).toString();

    config = _tryParseJsonConfig(contents);
    if (config) return config;

    config = _tryParseJson5Config(contents);
    if (config) return config;

    config = _tryParseTomlConfig(contents);
    if (config) return config;

    throw `Couldn't parse \`${customPath}\` as JSON, JSON5 or TOML.`;
  }

  if (existsSync(join(tauriDir, 'tauri.conf.json'))) {
    const contents = readFileSync(join(tauriDir, 'tauri.conf.json')).toString();
    config = _tryParseJsonConfig(contents);
    if (config) return config;
    console.error("Found tauri.conf.json file but couldn't parse it as JSON");
  }

  if (existsSync(join(tauriDir, 'tauri.conf.json5'))) {
    const contents = readFileSync(
      join(tauriDir, 'tauri.conf.json5')
    ).toString();
    config = _tryParseJson5Config(contents);
    if (config) return config;
    console.error("Found tauri.conf.json5 file but couldn't parse it as JSON5");
  }

  if (existsSync(join(tauriDir, 'Tauri.toml'))) {
    const contents = readFileSync(join(tauriDir, 'Tauri.toml')).toString();
    config = _tryParseTomlConfig(contents);
    if (config) return config;
    console.error("Found Tauri.toml file but couldn't parse it as TOML");
  }

  throw "Couldn't locate or parse tauri config.";
}

export function getInfo(root: string, inConfigPath?: string): Info {
  const tauriDir = getTauriDir(root);
  if (tauriDir !== null) {
    let name;
    let version;
    let wixLanguage: string | string[] | { [language: string]: unknown } =
      'en-US';
    const config = getConfig(tauriDir, inConfigPath);
    if (config.package) {
      name = config.package.productName;
      version = config.package.version;
      if (config.package.version?.endsWith('.json')) {
        const packageJsonPath = join(tauriDir, config.package.version);
        const contents = readFileSync(packageJsonPath).toString();
        version = JSON.parse(contents).version;
      }
    }
    if (!(name && version)) {
      const manifestPath = join(tauriDir, 'Cargo.toml');
      const cargoManifest = parseToml(
        readFileSync(manifestPath).toString()
      ) as unknown as CargoManifest;
      name = name || cargoManifest.package.name;
      version = version || cargoManifest.package.version;
    }
    if (config.tauri?.bundle?.windows?.wix?.language) {
      wixLanguage = config.tauri.bundle.windows.wix.language;
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version');
      process.exit(1);
    }

    return {
      tauriPath: tauriDir,
      name,
      version,
      wixLanguage,
    };
  } else {
    const packageJson = getPackageJson(root);
    const appName = packageJson
      ? (packageJson.displayName || packageJson.name).replace(/ /g, '-')
      : 'app';
    const version = packageJson ? packageJson.version : '0.1.0';
    return {
      tauriPath: null,
      name: appName,
      version,
      wixLanguage: 'en-US',
    };
  }
}
