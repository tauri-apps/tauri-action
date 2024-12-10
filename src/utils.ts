import { existsSync, readFileSync } from 'node:fs';
import path, { join, normalize, resolve, sep } from 'node:path';

import { parse as parseToml } from '@iarna/toml';
import { execa } from 'execa';
import { globbySync } from 'globby';

import { TauriConfig } from './config';

import type {
  CargoConfig,
  CargoManifest,
  Info,
  TargetInfo,
  TargetPlatform,
} from './types';

/*** constants ***/
export const extensions = [
  '.app.tar.gz.sig',
  '.app.tar.gz',
  '.dmg',
  '.AppImage.tar.gz.sig',
  '.AppImage.tar.gz',
  '.AppImage.sig',
  '.AppImage',
  '.deb',
  '.rpm',
  '.msi.zip.sig',
  '.msi.zip',
  '.msi.sig',
  '.msi',
  '.nsis.zip.sig',
  '.nsis.zip',
  '.exe.sig',
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
    if (assetPath.includes('universal-apple-darwin')) {
      arch = '_universal';
    } else if (assetPath.includes('aarch64-apple-darwin')) {
      arch = '_aarch64';
    } else if (assetPath.includes('x86_64-apple-darwin')) {
      arch = '_x64';
    } else {
      arch = process.arch === 'arm64' ? '_aarch64' : '_x64';
    }
  }

  return assetPath.includes(`${path.sep}debug${path.sep}`)
    ? `${filename}-debug${arch}${ext}`
    : `${filename}${arch}${ext}`;
}

export function getPackageJson(root: string) {
  const packageJsonPath = join(root, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
      const toml = parseToml(readFileSync(manifestPath).toString()) as {
        workspace?: { members?: string[]; exclude?: string[] };
      };
      if (toml.workspace?.members) {
        const ignore = ['**/target', '**/node_modules'];
        if (toml.workspace.exclude) ignore.push(...toml.workspace.exclude);

        const memberPaths = globbySync(toml.workspace.members, {
          cwd: dir,
          ignore,
          expandDirectories: false,
          onlyFiles: false,
        });

        if (memberPaths.some((m) => resolve(dir, m) === rootPath)) {
          return dir;
        }
      }
    }

    dir = normalize(join(dir, '..'));
  }
  return null;
}

export function getTargetDir(
  workspacePath: string,
  tauriPath: string,
  targetArgSet: boolean,
): string {
  // The default path if no configs are set.
  const def = join(workspacePath, 'target');

  // This will hold the path of current iteration
  let dir = tauriPath;

  // hold on to target-dir cargo config while we search for build.target
  let targetDir;
  // same for build.target
  let targetDirExt;

  // The env var takes precedence over config files.
  if (process.env.CARGO_TARGET_DIR) {
    targetDir = process.env.CARGO_TARGET_DIR ?? def;
  }

  while (dir.length && dir[dir.length - 1] !== sep) {
    let cargoConfigPath = join(dir, '.cargo/config');
    if (!existsSync(cargoConfigPath)) {
      cargoConfigPath = join(dir, '.cargo/config.toml');
    }
    if (existsSync(cargoConfigPath)) {
      const cargoConfig = parseToml(
        readFileSync(cargoConfigPath).toString(),
      ) as CargoConfig;

      if (!targetDir && cargoConfig.build?.['target-dir']) {
        const t = cargoConfig.build['target-dir'];
        if (path.isAbsolute(t)) {
          targetDir = t;
        } else {
          targetDir = normalize(join(dir, t));
        }
      }

      // Even if build.target is the same as the default target it will change the output dir.
      // Just like tauri we only support a single string, not an array (bug?).
      // targetArgSet: --target overwrites the .cargo/config.toml target value so we check for that too.
      if (
        !targetArgSet &&
        !targetDirExt &&
        typeof cargoConfig.build?.target === 'string'
      ) {
        targetDirExt = cargoConfig.build.target;
      }
    }

    // If we got both we don't need to keep going
    if (targetDir && targetDirExt) break;

    // Prepare the path for the next iteration
    dir = normalize(join(dir, '..'));
  }

  if (targetDir) {
    return normalize(join(targetDir, targetDirExt ?? ''));
  }

  return normalize(join(def, targetDirExt ?? ''));
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const packageJson = getPackageJson(root);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (
    packageJson &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (packageJson.dependencies?.[dependencyName] ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      packageJson.devDependencies?.[dependencyName])
  );
}

export function usesYarn(root: string): boolean {
  return existsSync(join(root, 'yarn.lock'));
}

export function usesPnpm(root: string): boolean {
  return existsSync(join(root, 'pnpm-lock.yaml'));
}

export function usesBun(root: string): boolean {
  return existsSync(join(root, 'bun.lockb'));
}

export async function execCommand(
  command: string,
  args: string[],
  { cwd }: { cwd?: string } = {},
  env: Record<string, string> = {},
): Promise<void> {
  console.log(`running ${command}`, args);

  const child = execa(command, args, {
    cwd,
    env: { FORCE_COLOR: '0', ...env },
    lines: true,
    stdio: 'pipe',
    reject: false,
  });

  child.stdout?.on('data', (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    process.stdout.write(data);
  });

  child.stderr?.on('data', (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    process.stderr.write(data);
  });

  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code && code > 0) {
        reject(
          new Error(
            `Command "${command} ${JSON.stringify(args)}" failed with exit code ${code}`,
          ),
        );
      } else {
        resolve();
      }
    });
  });
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
    let rpmRelease = '1';

    const config = TauriConfig.fromBaseConfig(tauriDir);

    if (targetInfo) {
      config.mergePlatformConfig(tauriDir, targetInfo.platform);
    }
    if (configFlag) {
      config.mergeUserConfig(root, configFlag);
    }

    name = config?.productName;

    if (config.version?.endsWith('.json')) {
      const packageJsonPath = join(tauriDir, config?.version);
      const contents = readFileSync(packageJsonPath).toString();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      version = JSON.parse(contents).version as string;
    } else {
      version = config?.version;
    }

    if (!(name && version)) {
      const cargoManifest = getCargoManifest(tauriDir);
      name = name ?? cargoManifest.package.name;
      version = version ?? cargoManifest.package.version;
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version.');
      process.exit(1);
    }

    const wixAppVersion = version.replace(/[-+]/g, '.');

    if (config.wixLanguage) {
      wixLanguage = config.wixLanguage;
    }

    if (config.rpmRelease) {
      rpmRelease = config.rpmRelease;
    }

    return {
      tauriPath: tauriDir,
      name,
      version,
      wixLanguage,
      wixAppVersion,
      rpmRelease,
      unzippedSigs: config.unzippedSigs === true,
    };
  } else {
    // This should not actually happen.
    throw Error("Couldn't detect Tauri dir");
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

export async function retry(
  fn: () => Promise<unknown>,
  attempts: number,
): Promise<unknown> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
    }
  }
}

// TODO: Properly resolve the eslint issues in this file.
