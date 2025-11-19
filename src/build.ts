import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getRunner } from './runner';
import {
  isAndroid,
  isDebug,
  isIOS,
  parsedArgs,
  parsedRunnerArgs,
  projectPath,
  rawArgs,
  retryAttempts,
  uploadPlainBinary,
} from './inputs';
import {
  createArtifact,
  getInfo,
  getTargetDir,
  getTargetInfo,
  getWorkspaceDir,
} from './utils';

import type { Artifact } from './types';

export async function buildProject(): Promise<Artifact[]> {
  const runner = await getRunner();

  const targetPath = parsedArgs['target'] as string | undefined;
  const configArg = parsedArgs['config'] as string | undefined;
  const profile = parsedRunnerArgs['profile'] as string | undefined;

  const targetInfo = getTargetInfo(targetPath);

  const info = getInfo(targetInfo, configArg);

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

  let command = ['build'];
  if (isAndroid) command = ['android', 'build'];
  if (isIOS) command = ['ios', 'build'];

  await runner.execTauriCommand(
    command,
    rawArgs,
    projectPath,
    targetInfo.platform === 'macos'
      ? {
          TAURI_BUNDLER_DMG_IGNORE_CI:
            process.env.TAURI_BUNDLER_DMG_IGNORE_CI ?? 'true',
        }
      : undefined,
    retryAttempts,
  );

  const workspacePath = getWorkspaceDir(app.tauriPath) ?? app.tauriPath;

  let artifactsPath = join(
    getTargetDir(workspacePath, info.tauriPath, !!targetPath),
    targetPath ?? '',
    profile ? profile : isDebug ? 'debug' : 'release',
  );
  if (isAndroid) {
    artifactsPath = join(info.tauriPath, 'gen/android/app/build/outputs/');
  }
  if (isIOS) {
    artifactsPath = join(info.tauriPath, 'gen/apple/build/');
  }

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
        platform: targetInfo.platform,
        arch,
        bundle: 'dmg', // could be 'dmg' or 'app' depending on the usecase
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app`),
        name: app.name,
        platform: targetInfo.platform,
        arch,
        bundle: 'app',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app.tar.gz`),
        name: app.name,
        platform: targetInfo.platform,
        arch,
        bundle: 'app',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `bundle/macos/${app.name}.app.tar.gz.sig`),
        name: app.name,
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
        platform: targetInfo.platform,
        arch,
        bundle: 'nsis',
        version: app.version,
      }),
    );

    artifacts = winArtifacts;
  } else if (targetInfo.platform === 'linux') {
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
        platform: targetInfo.platform,
        arch: appImageArch,
        bundle: 'appimage',
        version: app.version,
      }),
    ];
  } else if (targetInfo.platform === 'android') {
    const debug = isDebug ? 'debug' : 'release';

    // TODO: detect (un)signed beforehand

    if (!isDebug) {
      // unsigned release apks
      artifacts.push(
        createArtifact({
          path: join(
            artifactsPath,
            `apk/universal/release/app-universal-unsigend.apk`,
          ),
          name: app.name,
          platform: targetInfo.platform,
          arch: 'universal',
          bundle: 'apk',
          version: app.version,
        }),
        createArtifact({
          path: join(artifactsPath, `apk/arm64/release/app-arm64-unsigend.apk`),
          name: app.name,
          platform: targetInfo.platform,
          arch: 'arm64',
          bundle: 'apk',
          version: app.version,
        }),
        createArtifact({
          path: join(artifactsPath, `apk/arm/release/app-arm-unsigend.apk`),
          name: app.name,
          platform: targetInfo.platform,
          arch: 'universal',
          bundle: 'apk',
          version: app.version,
        }),
        createArtifact({
          path: join(
            artifactsPath,
            `apk/x86_64/release/app-x86_64-unsigend.apk`,
          ),
          name: app.name,
          platform: targetInfo.platform,
          arch: 'arm',
          bundle: 'apk',
          version: app.version,
        }),
        createArtifact({
          path: join(artifactsPath, `apk/x86/release/app-x86-unsigend.apk`),
          name: app.name,
          platform: targetInfo.platform,
          arch: 'x86',
          bundle: 'apk',
          version: app.version,
        }),
      );
    }

    artifacts.push(
      // signed release apks and debug apks
      createArtifact({
        path: join(
          artifactsPath,
          `apk/universal/${debug}/app-universal-${debug}.apk`,
        ),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'universal',
        bundle: 'apk',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `apk/arm64/${debug}/app-arm64-${debug}.apk`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm64',
        bundle: 'apk',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `apk/arm/${debug}/app-arm-${debug}.apk`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'universal',
        bundle: 'apk',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `apk/x86_64/${debug}/app-x86_64-${debug}.apk`,
        ),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm',
        bundle: 'apk',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `apk/x86/${debug}/app-x86-${debug}.apk`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'x86',
        bundle: 'apk',
        version: app.version,
      }),
      //
      // aabs
      //
      createArtifact({
        path: join(
          artifactsPath,
          `/bundle/universal${debug}/app-universal-${debug}.aab`,
        ),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'universal',
        bundle: 'aab',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `/bundle/arm64${debug}/app-arm64-${debug}.aab`,
        ),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm64',
        bundle: 'aab',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `/bundle/arm${debug}/app-arm-${debug}.aab`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm',
        bundle: 'aab',
        version: app.version,
      }),
      createArtifact({
        path: join(
          artifactsPath,
          `/bundle/x86_64${debug}/app-x86_64-${debug}.aab`,
        ),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'x86_64',
        bundle: 'aab',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `/bundle/x86${debug}/app-x86-${debug}.aab`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'x86',
        bundle: 'aab',
        version: app.version,
      }),
    );
  } else if (targetInfo.platform === 'ios') {
    // TODO: Confirm that info.name is correct.
    artifacts = [
      createArtifact({
        path: join(artifactsPath, `x86_64/${app.name}.ipa`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'x86_64',
        bundle: 'ipa',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `arm64/${app.name}.ipa`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm64',
        bundle: 'ipa',
        version: app.version,
      }),
      createArtifact({
        path: join(artifactsPath, `arm64-sim/${app.name}.ipa`),
        name: app.name,
        platform: targetInfo.platform,
        arch: 'arm64-sim',
        bundle: 'ipa',
        version: app.version,
      }),
    ];
  } else {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.error(`Unhandled target platform: "${targetInfo.platform}"`);
  }

  if (uploadPlainBinary) {
    const ext = targetInfo.platform === 'windows' ? '.exe' : '';
    artifacts.push(
      createArtifact({
        path: join(artifactsPath, `${app.mainBinaryName}${ext}`),
        name: 'binary', // app.mainBinaryName,
        bundle: 'bin',

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
