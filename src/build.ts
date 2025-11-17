import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getRunner } from './runner';
import {
  createArtifact,
  getInfo,
  getTargetDir,
  getTargetInfo,
  getWorkspaceDir,
} from './utils';

import type { Artifact, BuildOptions } from './types';

export async function buildProject(
  root: string,
  buildOpts: BuildOptions,
  retryAttempts: number,
  uploadPlainBinary: boolean,
): Promise<Artifact[]> {
  const runner = await getRunner(root, buildOpts.tauriScript);

  const debug = buildOpts.parsedArgs['debug'] as boolean;
  const targetPath = buildOpts.parsedArgs['target'] as string | undefined;
  const configArg = buildOpts.parsedArgs['config'] as string | undefined;
  const profile = buildOpts.parsedRunnerArgs['profile'] as string | undefined;

  const targetInfo = getTargetInfo(targetPath);

  const info = getInfo(root, targetInfo, configArg);

  if (!info.tauriPath) {
    throw Error("Couldn't detect path of tauri app");
  }

  const app = {
    tauriPath: info.tauriPath,
    runner,
    name: info.name,
    mainBinaryName: info.mainBinaryName,
    version: info.version,
    wixLanguage: info.wixLanguage,
    rpmRelease: info.rpmRelease,
  };

  await runner.execTauriCommand(
    ['build'],
    buildOpts.rawArgs || [],
    root,
    targetInfo.platform === 'macos'
      ? {
          TAURI_BUNDLER_DMG_IGNORE_CI:
            process.env.TAURI_BUNDLER_DMG_IGNORE_CI ?? 'true',
        }
      : undefined,
    retryAttempts,
  );

  const workspacePath = getWorkspaceDir(app.tauriPath) ?? app.tauriPath;

  const artifactsPath = join(
    getTargetDir(workspacePath, info.tauriPath, !!targetPath),
    targetPath ?? '',
    profile ? profile : debug ? 'debug' : 'release',
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
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/dmg/${app.name}_${app.version}_${arch}.dmg`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'dmg', // could be 'dmg' or 'app' depending on the usecase
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app`),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'app',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app.tar.gz`),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'app',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app.tar.gz.sig`),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'app',
        version: app.version,
      }),
    ];
  } else if (targetInfo.platform === 'windows') {
    if (arch.startsWith('i')) {
      arch = 'x86';
    } else if (arch === 'aarch64' || arch === 'arm64') {
      arch = 'arm64';
    } else {
      arch = 'x64';
    }

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

    const winArtifacts: Artifact[] = [];

    // wix v2
    langs.forEach((lang) => {
      winArtifacts.push(
        createArtifact({
          path: join(
            artifactsPath,
            `bundle/msi/${app.name}_${app.version}_${arch}_${lang}.msi`,
          ),
          name: app.name,
          debug,
          platform: targetInfo.platform,
          arch,
          bundle: 'msi',
          version: app.version,
        }),
        createArtifact({
          path: join(
            artifactsPath,
            `bundle/msi/${app.name}_${app.version}_${arch}_${lang}.msi.sig`,
          ),
          name: app.name,
          debug,
          platform: targetInfo.platform,
          arch,
          bundle: 'msi',
          version: app.version,
        }),
        createArtifact({
          path: join(
            artifactsPath,
            `bundle/msi/${app.name}_${app.version}_${arch}_${lang}.msi.zip`,
          ),
          name: app.name,
          debug,
          platform: targetInfo.platform,
          arch,
          bundle: 'msi',
          version: app.version,
        }),
        createArtifact({
          path: join(
            artifactsPath,
            `bundle/msi/${app.name}_${app.version}_${arch}_${lang}.msi.zip.sig`,
          ),
          name: app.name,
          debug,
          platform: targetInfo.platform,
          arch,
          bundle: 'msi',
          version: app.version,
        }),
      );
    });

    winArtifacts.push(
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/nsis/${app.name}_${app.version}_${arch}-setup.exe`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'nsis',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/nsis/${app.name}_${app.version}_${arch}-setup.exe.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'nsis',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/nsis/${app.name}_${app.version}_${arch}-setup.nsis.zip`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'nsis',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/nsis/${app.name}_${app.version}_${arch}-setup.nsis.zip.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch,
        bundle: 'nsis',
        version: app.version,
      }),
    );

    artifacts = winArtifacts;
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
    const rpmArch =
      arch === 'x64' || arch === 'x86_64'
        ? 'x86_64'
        : arch === 'x32' || arch === 'x86' || arch === 'i686'
          ? 'i386'
          : arch === 'arm'
            ? 'armhfp'
            : arch === 'arm64'
              ? 'aarch64'
              : arch;
    const appImageArch =
      arch === 'x64' || arch === 'x86_64'
        ? 'amd64'
        : arch === 'x32' || arch === 'i686'
          ? 'i386'
          : arch === 'arm' // TODO: Confirm this
            ? 'arm'
            : arch === 'arm64' // TODO: This is probably a Tauri bug
              ? 'aarch64'
              : arch;

    artifacts = [
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/deb/${app.name}_${app.version}_${debianArch}.deb`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: debianArch,
        bundle: 'deb',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/deb/${app.name}_${app.version}_${debianArch}.deb.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: debianArch,
        bundle: 'deb',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/rpm/${app.name}-${app.version}-${app.rpmRelease}.${rpmArch}.rpm`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: rpmArch,
        bundle: 'rpm',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/rpm/${app.name}-${app.version}-${app.rpmRelease}.${rpmArch}.rpm.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: rpmArch,
        bundle: 'rpm',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/appimage/${app.name}_${app.version}_${appImageArch}.AppImage`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: appImageArch,
        bundle: 'appimage',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/appimage/${app.name}_${app.version}_${appImageArch}.AppImage.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: appImageArch,
        bundle: 'appimage',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/appimage/${app.name}_${app.version}_${appImageArch}.AppImage.tar.gz`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: appImageArch,
        bundle: 'appimage',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `bundle/appimage/${app.name}_${app.version}_${appImageArch}.AppImage.tar.gz.sig`,
        ),
        name: app.name,
        debug,
        platform: targetInfo.platform,
        arch: appImageArch,
        bundle: 'appimage',
        version: app.version,
      }),
    ];
  }

  if (uploadPlainBinary) {
    const ext = targetInfo.platform === 'windows' ? '.exe' : '';
    artifacts.push(
      createArtifact({
        path: join(artifactsPath, `${app.mainBinaryName}${ext}`),
        name: 'binary', // app.mainBinaryName,
        bundle: 'bin',
        debug,
        platform: targetInfo.platform,
        arch,
        version: app.version,
      }),
    );
  }

  console.log(
    `Looking for artifacts in:\n${artifacts.map((a) => a.path).join('\n')}`,
  );
  return artifacts.filter((p) => existsSync(p.path));
}
