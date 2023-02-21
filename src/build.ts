import { platform } from 'os';
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { initProject } from './init-project';
import {
  execCommand,
  getInfo,
  getTargetDir,
  getWorkspaceDir,
  hasDependency,
  usesPnpm,
  usesYarn,
} from './utils';

import type { Artifact, BuildOptions, Runner } from './types';

async function getRunner(
  root: string,
  tauriScript: string | null
): Promise<Runner> {
  if (tauriScript) {
    const [runnerCommand, ...runnerArgs] = tauriScript.split(' ');
    return { runnerCommand, runnerArgs };
  }

  if (
    hasDependency('@tauri-apps/cli', root) ||
    hasDependency('vue-cli-plugin-tauri', root)
  ) {
    if (usesYarn(root)) return { runnerCommand: 'yarn', runnerArgs: ['tauri'] };
    if (usesPnpm(root)) return { runnerCommand: 'pnpm', runnerArgs: ['tauri'] };
    // FIXME: This can trigger a download of the tauri alpha package. Likely when the tauri frontend is part of a workspace and projectPath is undefined.
    return { runnerCommand: 'npx', runnerArgs: ['tauri'] };
  }

  await execCommand('npm', ['install', '-g', '@tauri-apps/cli'], {
    cwd: undefined,
  });

  return { runnerCommand: 'tauri', runnerArgs: [] };
}

export async function buildProject(
  root: string,
  debug: boolean,
  buildOpts: BuildOptions
): Promise<Artifact[]> {
  const runner = await getRunner(root, buildOpts.tauriScript);

  const info = getInfo(root, buildOpts.configPath ?? undefined);

  const app = info.tauriPath
    ? {
        tauriPath: info.tauriPath,
        runner,
        name: info.name,
        version: info.version,
        wixLanguage: info.wixLanguage,
      }
    : await initProject(root, runner, info, buildOpts);

  const tauriConfPath = join(app.tauriPath, 'tauri.conf.json');
  if (buildOpts.configPath !== null) {
    copyFileSync(buildOpts.configPath, tauriConfPath);
  }

  if (buildOpts.distPath) {
    const tauriConf = JSON.parse(readFileSync(tauriConfPath).toString());
    tauriConf.build.distDir = buildOpts.distPath;
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf));
  }

  const tauriArgs = debug
    ? ['--debug', ...(buildOpts.args ?? [])]
    : buildOpts.args ?? [];
  let buildCommand;
  let buildArgs: string[] = [];

  if (hasDependency('vue-cli-plugin-tauri', root)) {
    if (usesYarn(root)) {
      buildCommand = 'yarn';
      buildArgs = ['tauri:build'];
    }
    if (usesPnpm(root)) {
      buildCommand = 'pnpm';
      buildArgs = ['tauri:build'];
    } else {
      buildCommand = 'npm';
      buildArgs = ['run', 'tauri:build'];
    }
  } else {
    buildCommand = app.runner.runnerCommand;
    buildArgs = [...app.runner.runnerArgs, 'build'];
  }

  await execCommand(buildCommand, [...buildArgs, ...tauriArgs], {
    cwd: root,
  });

  let fileAppName = app.name;
  // on Linux, the app product name is converted to kebab-case
  if (!['darwin', 'win32'].includes(platform())) {
    fileAppName = fileAppName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .replace(/[ _.]/g, '-')
      .toLowerCase();
  }

  const cratePath = getWorkspaceDir(app.tauriPath) ?? app.tauriPath;

  const found = [...tauriArgs].findIndex((e) => e === '-t' || e === '--target');
  const targetPath = found >= 0 ? [...tauriArgs][found + 1] : '';

  const artifactsPath = join(
    getTargetDir(cratePath),
    targetPath,
    debug ? 'debug' : 'release'
  );

  let arch =
    targetPath.search('-') >= 0 ? targetPath.split('-')[0] : process.arch;

  let artifacts: Artifact[] = [];

  if (platform() === 'darwin') {
    if (arch === 'x86_64') {
      arch = 'x64';
    }

    artifacts = [
      join(
        artifactsPath,
        `bundle/dmg/${fileAppName}_${app.version}_${arch}.dmg`
      ),
      join(artifactsPath, `bundle/macos/${fileAppName}.app`),
      join(artifactsPath, `bundle/macos/${fileAppName}.app.tar.gz`),
      join(artifactsPath, `bundle/macos/${fileAppName}.app.tar.gz.sig`),
    ].map((path) => ({ path, arch }));
  } else if (platform() === 'win32') {
    arch = arch.startsWith('i') ? 'x86' : 'x64';

    // If multiple Wix languages are specified, multiple installers (.msi) will be made
    // The .zip and .sig are only generated for the first specified language
    let langs;
    if (typeof app.wixLanguage === 'string') {
      langs = [app.wixLanguage];
    } else if (Array.isArray(app.wixLanguage)) {
      langs = app.wixLanguage;
    } else {
      langs = Object.keys(app.wixLanguage);
    }

    const winArtifacts: string[] = [];

    langs.forEach((lang) => {
      winArtifacts.push(
        join(
          artifactsPath,
          `bundle/msi/${fileAppName}_${app.version}_${arch}_${lang}.msi`
        )
      );
      winArtifacts.push(
        join(
          artifactsPath,
          `bundle/msi/${fileAppName}_${app.version}_${arch}_${lang}.msi.zip`
        )
      );
      winArtifacts.push(
        join(
          artifactsPath,
          `bundle/msi/${fileAppName}_${app.version}_${arch}_${lang}.msi.zip.sig`
        )
      );
    });

    artifacts = winArtifacts.map((path) => ({ path, arch }));
  } else {
    const debianArch =
      arch === 'x64' || arch === 'x86_64'
        ? 'amd64'
        : arch === 'x32' || arch === 'i686'
        ? 'i386'
        : arch === 'arm'
        ? 'armhf'
        : arch === 'aarch64'
        ? 'arm64'
        : arch;
    const appImageArch =
      arch === 'x64' || arch === 'x86_64'
        ? 'amd64'
        : arch === 'x32' || arch === 'i686'
        ? 'i386'
        : arch;

    artifacts = [
      {
        path: join(
          artifactsPath,
          `bundle/deb/${fileAppName}_${app.version}_${debianArch}.deb`
        ),
        arch: debianArch,
      },
      {
        path: join(
          artifactsPath,
          `bundle/appimage/${fileAppName}_${app.version}_${appImageArch}.AppImage`
        ),
        arch: appImageArch,
      },
      {
        path: join(
          artifactsPath,
          `bundle/appimage/${fileAppName}_${app.version}_${appImageArch}.AppImage.tar.gz`
        ),
        arch: appImageArch,
      },
      {
        path: join(
          artifactsPath,
          `bundle/appimage/${fileAppName}_${app.version}_${appImageArch}.AppImage.tar.gz.sig`
        ),
        arch: appImageArch,
      },
    ];
  }

  console.log(
    `Expected artifacts paths:\n${artifacts.map((a) => a.path).join('\n')}`
  );
  return artifacts.filter((p) => existsSync(p.path));
}
