import { existsSync, readFileSync } from 'fs';
import path, { join, normalize, resolve, sep } from 'path';

import { execa } from 'execa';
import { parse as parseToml } from '@iarna/toml';
import { globbySync } from 'globby';

import { getConfig, mergePlatformConfig, mergeUserConfig } from './config';

import type { CargoManifest, Info, TargetInfo, TargetPlatform } from './types';

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
  '.nsis.zip.sig',
  '.nsis.zip',
  '.exe',
];

/*** helper functions ***/
export function getAssetName(assetPath: string) {
  const basename = path.basename(assetPath);
  const exts = extensions.filter((s) => basename.includes(s));
  const ext = exts[0] || path.extname(assetPath);
  const filename = basename.replace(ext, '');

  let arch = '';
  if (ext === '.app.tar.gz.sig' || ext === '.app.tar.gz') {
    const os_arch = process.arch === 'arm64' ? '_aarch64' : '_x64';

    arch = assetPath.includes('universal-apple-darwin')
      ? '_universal'
      : assetPath.includes('aarch64-apple-darwin')
      ? '_aarch64'
      : os_arch;
  }

  return assetPath.includes(`${path.sep}debug${path.sep}`)
    ? `${filename}-debug${arch}${ext}`
    : `${filename}${arch}${ext}`;
}

export function getPackageJson(root: string) {
  const packageJsonPath = join(root, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString();
    return JSON.parse(packageJsonString);
  }
  return null;
}

export function getTauriDir(root: string): string | null {
  const tauriConfPaths = globbySync(
    ['**/tauri.conf.json', '**/tauri.conf.json5', '**/Tauri.toml'],
    {
      gitignore: true,
      cwd: root,
      // Forcefully ignore target and node_modules dirs
      ignore: ['**/target', '**/node_modules'],
    },
  );

  if (tauriConfPaths.length === 0) {
    return null;
  }

  return resolve(root, tauriConfPaths[0], '..');
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
    console.log('dir', dir);
    let cargoConfigPath = join(dir, '.cargo/config');
    if (!existsSync(cargoConfigPath)) {
      cargoConfigPath = join(dir, '.cargo/config.toml');
    }
    if (existsSync(cargoConfigPath)) {
      const cargoConfig = parseToml(readFileSync(cargoConfigPath).toString());
      // @ts-ignore
      if (cargoConfig.build?.['target-dir']) {
        // @ts-ignore
        const t = cargoConfig.build['target-dir'];
        const p = normalize(join(dir, '.cargo', t));
        console.log('t', t);
        console.log('p', p);
        if (path.isAbsolute(t)) return t;
        return p;
      }
    }

    dir = normalize(join(dir, '..'));
  }
  return def;
}

export function getCargoManifest(dir: string): CargoManifest {
  const manifestPath = join(dir, 'Cargo.toml');
  const cargoManifest = parseToml(
    readFileSync(manifestPath).toString(),
  ) as unknown as CargoManifest & {
    package: {
      version: { workspace: true } | string;
      name: { workspace: true } | string;
    };
  };

  let name = cargoManifest.package.name;
  let version = cargoManifest.package.version;

  // if the version or name is an object, it means it is a workspace package and we need to traverse up
  if (
    typeof cargoManifest.package.version == 'object' ||
    typeof cargoManifest.package.name == 'object'
  ) {
    const workspaceDir = getWorkspaceDir(dir);
    if (!workspaceDir) {
      throw new Error(
        'Could not find workspace directory, but version and/or name specifies to use workspace package',
      );
    }
    const manifestPath = join(workspaceDir, 'Cargo.toml');
    const workspaceManifest = parseToml(
      readFileSync(manifestPath).toString(),
    ) as unknown as CargoManifest;

    if (
      typeof name === 'object' &&
      workspaceManifest?.workspace?.package?.name !== undefined
    ) {
      name = workspaceManifest.workspace.package.name;
    }
    if (
      typeof version === 'object' &&
      workspaceManifest?.workspace?.package?.version !== undefined
    ) {
      version = workspaceManifest.workspace.package.version;
    }
  }

  return {
    ...cargoManifest,
    package: {
      ...cargoManifest.package,
      name,
      version,
    },
  };
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
  { cwd }: { cwd?: string } = {},
): Promise<void> {
  console.log(`running ${command}`, args);

  return execa(command, args, {
    cwd,
    stdio: 'inherit',
    env: { FORCE_COLOR: '0' },
  }).then();
}

export function getInfo(
  root: string,
  targetInfo?: TargetInfo,
  configFlag?: string,
): Info {
  const tauriDir = getTauriDir(root);
  if (tauriDir !== null) {
    let name;
    let version;
    let wixLanguage: string | string[] | { [language: string]: unknown } =
      'en-US';

    const config = getConfig(tauriDir);
    if (targetInfo) {
      mergePlatformConfig(config, tauriDir, targetInfo.platform);
    }
    if (configFlag) {
      mergeUserConfig(root, config, configFlag);
    }

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
      const cargoManifest = getCargoManifest(tauriDir);
      name = name ?? cargoManifest.package.name;
      version = version ?? cargoManifest.package.version;
    }
    if (config.tauri?.bundle?.windows?.wix?.language) {
      wixLanguage = config.tauri.bundle.windows.wix.language;
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version.');
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

export function getTargetInfo(targetPath?: string): TargetInfo {
  let arch: string = process.arch;
  let platform: TargetPlatform =
    process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
      ? 'macos'
      : 'linux';

  if (targetPath) {
    if (targetPath.includes('windows')) {
      platform = 'windows';
    } else if (targetPath.includes('darwin') || targetPath.includes('macos')) {
      platform = 'macos';
    } else if (targetPath.includes('linux')) {
      platform = 'linux';
    } else if (targetPath.includes('android')) {
      platform = 'android';
    } else if (targetPath.includes('ios')) {
      platform = 'ios';
    }

    if (targetPath.includes('-')) {
      arch = targetPath.split('-')[0];
    }
  }

  return { arch, platform };
}
