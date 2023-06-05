import { existsSync } from 'fs';
import { join } from 'path';

import { initProject } from './init-project';
import { getRunner } from './runner';
import {
  getInfo,
  getTargetDir,
  getTargetInfo,
  getWorkspaceDir,
  hasDependency,
} from './utils';

import type { Artifact, BuildOptions } from './types';

export async function buildProject(
  root: string,
  debug: boolean,
  buildOpts: BuildOptions
): Promise<Artifact[]> {
  const runner = await getRunner(root, buildOpts.tauriScript);

  const tauriArgs = debug
    ? ['--debug', ...(buildOpts.args ?? [])]
    : buildOpts.args ?? [];

  const targetArgIdx = [...tauriArgs].findIndex(
    (e) => e === '-t' || e === '--target'
  );
  const targetPath =
    targetArgIdx >= 0 ? [...tauriArgs][targetArgIdx + 1] : undefined;

  const configArgIdx = [...tauriArgs].findIndex(
    (e) => e === '-c' || e === '--config'
  );
  const configArg =
    configArgIdx >= 0 ? [...tauriArgs][configArgIdx + 1] : undefined;

  const targetInfo = getTargetInfo(targetPath);

  const info = getInfo(root, targetInfo, configArg);

  const app = info.tauriPath
    ? {
        tauriPath: info.tauriPath,
        runner,
        name: info.name,
        version: info.version,
        wixLanguage: info.wixLanguage,
      }
    : await initProject(root, runner, info, buildOpts);

  let buildCommand;
  if (hasDependency('vue-cli-plugin-tauri', root)) {
    buildCommand = 'tauri:build';
  } else {
    buildCommand = 'build';
  }

  await runner.execTauriCommand([buildCommand], [...tauriArgs], root);

  let fileAppName = app.name;
  // on Linux, the app product name is converted to kebab-case
  if (targetInfo.platform === 'linux') {
    fileAppName = fileAppName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .replace(/[ _.]/g, '-')
      .toLowerCase();
  }

  const cratePath = getWorkspaceDir(app.tauriPath) ?? app.tauriPath;

  const artifactsPath = join(
    getTargetDir(cratePath),
    targetPath ?? '',
    debug ? 'debug' : 'release'
  );

  let artifacts: Artifact[] = [];

  let arch = targetInfo.arch;

  if (targetInfo.platform === 'macos') {
    if (arch === 'x86_64') {
      arch = 'x64';
    } else if (arch === 'arm64') {
      arch = 'aarch64';
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
  } else if (targetInfo.platform === 'windows') {
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

    winArtifacts.push(
      join(
        artifactsPath,
        `bundle/nsis/${fileAppName}_${app.version}_${arch}-setup.exe`
      )
    );
    winArtifacts.push(
      join(
        artifactsPath,
        `bundle/nsis/${fileAppName}_${app.version}_${arch}-setup.nsis.zip`
      )
    );
    winArtifacts.push(
      join(
        artifactsPath,
        `bundle/nsis/${fileAppName}_${app.version}_${arch}-setup.nsis.zip.sig`
      )
    );

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
    `Looking for artifacts in:\n${artifacts.map((a) => a.path).join('\n')}`
  );
  return artifacts.filter((p) => existsSync(p.path));
}
