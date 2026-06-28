import { existsSync, readFileSync } from 'node:fs';
import path, {
  basename,
  extname,
  join,
  normalize,
  resolve,
  sep,
} from 'node:path';

import { execa, execaSync } from 'execa';
import { findUpSync } from 'find-up-simple';
import { globbySync } from 'globby';
import TOML from 'smol-toml';

import { TauriConfig } from './config';
import { isAndroid, isDebug, isIOS, projectPath } from './inputs';

import type {
  Artifact,
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
  '.deb.sig',
  '.deb',
  '.rpm.sig',
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
export function parseAsset(assetPath: string) {
  const basename = path.basename(assetPath);
  const exts = extensions.filter((s) => basename.includes(s));
  const ext = exts[0] || path.extname(assetPath);
  const filename = basename.replace(ext, '');

  let arch = '';
  if (ext === '.app.tar.gz.sig' || ext === '.app.tar.gz') {
    if (assetPath.includes('universal-apple-darwin')) {
      arch = 'universal';
    } else if (assetPath.includes('aarch64-apple-darwin')) {
      arch = 'aarch64';
    } else if (assetPath.includes('x86_64-apple-darwin')) {
      arch = 'x64';
    } else {
      arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
    }
  }

  return { basename, ext, filename, arch };
}

export function renderNamePattern(
  pattern: string,
  replacements: Record<string, string>,
) {
  return pattern.replace(/\[(\w+)]/g, (match, type: string) => {
    if (!Object.hasOwn(replacements, type)) {
      return match;
    }
    const replacement = replacements[type];
    return replacement;
  });
}

export function getAssetName(asset: Artifact, pattern?: string) {
  // TODO(v1): In a future version we may want to unify the naming schemes. For now we keep using the cli output.
  // const DEFAULT_PATTERN = `[name]_v[version]_[platform]_[arch][ext]`;
  // pattern = pattern || DEFAULT_PATTERN;

  if (asset.name === 'latest.json') {
    return 'latest.json';
  }

  if (pattern) {
    return renderNamePattern(
      pattern,
      asset as unknown as Record<string, string>,
    );
  } else {
    if (
      // Tauri rightfully does not inject the version in .app but does the same for the .app.tar.gz which imo should have the version
      asset.ext !== '.app.tar.gz' &&
      asset.ext !== '.app.tar.gz.sig' &&
      // the binary is just the same Cargo.toml name field on all platforms
      asset.name !== 'binary' &&
      // Android bundles are called `app-universal-debug.apk`
      asset.ext !== '.apk' &&
      asset.ext !== '.aab' &&
      // iOS bundles do not include the architecture
      asset.ext !== '.ipa'
    ) {
      // See TODO above, in most cases we keep the file name set by tauri's cli.
      return basename(asset.path);
    }

    // Currently Tauri uses the product name on all platforms (except mobile).
    // If Tauri changes that to for example match .deb and .rpm standards we should follow suit.
    let name = asset.name;
    const arch = `_${asset.arch}`;
    let platform = '';
    let version = '';

    if (asset.name === 'binary') {
      name = basename(asset.path, asset.ext);
      platform = `_${asset.platform}`;
    }

    // binaries usually don't have the version in them
    if (asset.name !== 'binary') {
      name = asset.name;
      version = `_${asset.version}`;
    }

    return name + platform + version + arch + asset.ext;
  }
}

export function ghAssetName(
  artifact: Artifact,
  releaseAssetNamePattern?: string,
) {
  return getAssetName(artifact, releaseAssetNamePattern)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '.')
    .replace(/\.\./g, '.');
}

export function createArtifact({
  info,
  path,
  name,
  arch,
  bundle,
}: {
  info: Info;
  path: string;
  /// Defaults to info.name
  name?: string;
  arch: string;
  bundle: string;
}): Artifact {
  const baseName = basename(path);
  const exts = extensions.filter((s) => baseName.includes(s));
  const ext = exts[0] || extname(path);
  let workflowArtifactName: string | undefined;
  if (
    name === 'binary' ||
    [
      '.app',
      '.dmg',
      '.exe',
      '.msi',
      '.deb',
      '.rpm',
      '.AppImage',
      '.apk',
      '.aab',
      '.ipa',
    ].includes(ext)
  ) {
    workflowArtifactName = `${info.targetPlatform}-${arch}-${bundle}`;
  }

  return {
    path,
    name: name || info.name,
    mainBinaryName: info.mainBinaryName,
    mode: isDebug ? 'debug' : 'release',
    platform: info.targetPlatform === 'macos' ? 'darwin' : info.targetPlatform,
    arch,
    bundle,
    ext,
    version: info.version,
    setup: bundle === 'nsis' ? '-setup' : '',
    _setup: bundle === 'nsis' ? '_setup' : '',
    workflowArtifactName,
  };
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

export function getTauriDir(): string | null {
  const tauriConfPaths = globbySync(
    ['**/tauri.conf.json', '**/tauri.conf.json5', '**/Tauri.toml'],
    {
      // globby v16 changes this to also look into parent dir. Monitor this closely and disable if needed.
      gitignore: true,
      cwd: projectPath,
      // Forcefully ignore target and node_modules dirs
      ignore: ['**/target', '**/node_modules'],
    },
  );

  if (tauriConfPaths.length === 0) {
    return null;
  }

  return resolve(projectPath, tauriConfPaths[0], '..');
}

export function getWorkspaceDir(dir: string): string | null {
  const rootPath = dir;

  while (dir.length && dir[dir.length - 1] !== sep) {
    const manifestPath = join(dir, 'Cargo.toml');
    if (existsSync(manifestPath)) {
      const toml = TOML.parse(readFileSync(manifestPath).toString()) as {
        workspace?: { members?: string[]; exclude?: string[] };
      };

      // If the tauri package and workspace root are the same file, the tauri package doesn't have to be listed in workspace.members
      if (toml.workspace && dir === rootPath) {
        return dir;
      }

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
  let targetDir: string | undefined;
  // same for build.target
  let targetDirExt: string | undefined;

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
      const cargoConfig = TOML.parse(
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
  const cargoManifest = TOML.parse(
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
    typeof cargoManifest.package.version === 'object' ||
    typeof cargoManifest.package.name === 'object'
  ) {
    const workspaceDir = getWorkspaceDir(dir);
    if (!workspaceDir) {
      throw new Error(
        'Could not find workspace directory, but version and/or name specifies to use workspace package',
      );
    }
    const manifestPath = join(workspaceDir, 'Cargo.toml');
    const workspaceManifest = TOML.parse(
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

export function hasTauriScript(root: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const packageJson = getPackageJson(root);
  return (
    !!packageJson &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    !!packageJson.scripts?.tauri
  );
}

export function usesVitePlus(): boolean {
  if (isRunnerInstalled('vp')) {
    return true;
  }
  return false;
}

export function usesNpm(cwd: string): boolean {
  if (findUpSync('package-lock.json', { cwd })) {
    if (isRunnerInstalled('npm')) {
      return true;
    } else {
      console.warn(
        "package-lock.json detected but couldn't find `npm` executable.",
      );
    }
  }
  return false;
}

export function usesYarn(cwd: string): boolean {
  if (findUpSync('yarn.lock', { cwd })) {
    if (isRunnerInstalled('yarn')) {
      return true;
    } else {
      console.warn("yarn.lock detected but couldn't find `yarn` executable.");
    }
  }
  return false;
}

export function usesPnpm(cwd: string): boolean {
  if (findUpSync('pnpm-lock.yaml', { cwd })) {
    if (isRunnerInstalled('pnpm')) {
      return true;
    } else {
      console.warn(
        "pnpm-lock.yaml detected but couldn't find `pnpm` executable.",
      );
    }
  }
  return false;
}

export function usesBun(cwd: string): boolean {
  if (findUpSync('bun.lockb', { cwd }) || findUpSync('bun.lock', { cwd })) {
    if (isRunnerInstalled('bun')) {
      return true;
    } else {
      console.warn("bun.lock(b) detected but couldn't find `bun` executable.");
    }
  }
  return false;
}

function isRunnerInstalled(runner: string) {
  const bin = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    return execaSync(bin, [runner]).exitCode === 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return false;
  }
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

export function getInfo(targetInfo: TargetInfo, configFlag?: string[]): Info {
  const tauriDir = getTauriDir();
  if (tauriDir !== null) {
    let name: string | undefined;
    let version: string | undefined;
    let wixLanguage: string | string[] | { [language: string]: unknown } =
      'en-US';
    let rpmRelease = '1';

    const config = TauriConfig.fromBaseConfig(tauriDir);

    if (targetInfo) {
      config.mergePlatformConfig(tauriDir, targetInfo.platform);
    }
    if (configFlag) {
      for (const c of configFlag) {
        config.mergeUserConfig(projectPath, c);
      }
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

    const cargoManifest = getCargoManifest(tauriDir);
    if (!(name && version)) {
      name = name ?? cargoManifest.package.name;
      version = version ?? cargoManifest.package.version;
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version.');
      process.exit(1);
    }

    if (config.wixLanguage) {
      wixLanguage = config.wixLanguage;
    }

    if (config.rpmRelease) {
      rpmRelease = config.rpmRelease;
    }

    return {
      tauriPath: tauriDir,
      name,
      mainBinaryName: config.mainBinaryName || cargoManifest.package.name,
      version,
      wixLanguage,
      rpmRelease,
      unzippedSigs: config.unzippedSigs === true,
      targetPlatform: targetInfo.platform,
    };
  } else {
    // This should not actually happen.
    throw Error("Couldn't detect Tauri dir");
  }
}

export function getTargetInfo(targetPath?: string): TargetInfo {
  let arch: string = process.arch;
  let platform: TargetPlatform;
  if (isAndroid) {
    platform = 'android';
  } else if (isIOS) {
    platform = 'ios';
  } else if (process.platform === 'win32') {
    platform = 'windows';
  } else if (process.platform === 'darwin') {
    platform = 'macos';
  } else {
    platform = 'linux';
  }

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

/// Will run provided fn at least once plus the provided attempts on failures,
/// waiting between 1-10 seconds between retries
/// Examples
/// - retry(fn, 0) = run fn once then return no matter the success status
/// - retry(fn, 3) = if all tries fail, fn will be executed 4 times
export async function retry(
  fn: () => Promise<unknown>,
  additionalAttempts: number,
): Promise<unknown> {
  const attempts = additionalAttempts + 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.log(
        `Attempt ${attempt} failed. ${attempts - attempt} tries left.`,
      );
      // For now we test random sleeps between 1 and 10 seconds.
      // If that doesn't help enough, try taking pastAttempts into account,
      // for a more exponential backoff-like approach (still needs a random element)
      await sleep(Math.floor(Math.random() * 10) + 1);
    }
  }
}

async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// TODO: Properly resolve the eslint issues in this file.
