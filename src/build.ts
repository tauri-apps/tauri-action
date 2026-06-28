import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
import { getRunner } from './runner';
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

  const targetPath = parsedArgs.target as string | undefined;
  const configArg = parsedArgs.config as string[] | undefined;
  const profile = parsedRunnerArgs.profile as string | undefined;

  const targetInfo = getTargetInfo(targetPath);

  const info = getInfo(targetInfo, configArg);

  if (!info.tauriPath) {
    throw Error("Couldn't detect path of tauri app");
  }

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

  const workspacePath = getWorkspaceDir(info.tauriPath) ?? info.tauriPath;

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
        info,
        path: join(
          artifactsPath,
          `bundle/dmg/${info.name}_${info.version}_${arch}.dmg`,
        ),
        arch,
        bundle: 'dmg', // could be 'dmg' or 'app' depending on the usecase
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `bundle/macos/${info.name}.app`),
        arch,
        bundle: 'app',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `bundle/macos/${info.name}.app.tar.gz`),
        arch,
        bundle: 'app',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `bundle/macos/${info.name}.app.tar.gz.sig`),
        arch,
        bundle: 'app',
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
    let langs: string[];
    if (typeof info.wixLanguage === 'string') {
      langs = [info.wixLanguage];
    } else if (Array.isArray(info.wixLanguage)) {
      langs = info.wixLanguage;
    } else {
      langs = Object.keys(info.wixLanguage);
    }

    const winArtifacts: Artifact[] = [];

    // wix v2
    langs.forEach((lang) => {
      winArtifacts.push(
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `bundle/msi/${info.name}_${info.version}_${arch}_${lang}.msi`,
          ),

          arch,
          bundle: 'msi',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `bundle/msi/${info.name}_${info.version}_${arch}_${lang}.msi.sig`,
          ),

          arch,
          bundle: 'msi',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `bundle/msi/${info.name}_${info.version}_${arch}_${lang}.msi.zip`,
          ),

          arch,
          bundle: 'msi',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `bundle/msi/${info.name}_${info.version}_${arch}_${lang}.msi.zip.sig`,
          ),

          arch,
          bundle: 'msi',
        }),
      );
    });

    winArtifacts.push(
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/nsis/${info.name}_${info.version}_${arch}-setup.exe`,
        ),

        arch,
        bundle: 'nsis',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/nsis/${info.name}_${info.version}_${arch}-setup.exe.sig`,
        ),

        arch,
        bundle: 'nsis',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/nsis/${info.name}_${info.version}_${arch}-setup.nsis.zip`,
        ),

        arch,
        bundle: 'nsis',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/nsis/${info.name}_${info.version}_${arch}-setup.nsis.zip.sig`,
        ),

        arch,
        bundle: 'nsis',
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
        info,
        path: join(
          artifactsPath,
          `bundle/deb/${info.name}_${info.version}_${debianArch}.deb`,
        ),
        arch: debianArch,
        bundle: 'deb',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/deb/${info.name}_${info.version}_${debianArch}.deb.sig`,
        ),
        arch: debianArch,
        bundle: 'deb',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/rpm/${info.name}-${info.version}-${info.rpmRelease}.${rpmArch}.rpm`,
        ),
        arch: rpmArch,
        bundle: 'rpm',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/rpm/${info.name}-${info.version}-${info.rpmRelease}.${rpmArch}.rpm.sig`,
        ),
        arch: rpmArch,
        bundle: 'rpm',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/appimage/${info.name}_${info.version}_${appImageArch}.AppImage`,
        ),
        arch: appImageArch,
        bundle: 'appimage',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/appimage/${info.name}_${info.version}_${appImageArch}.AppImage.sig`,
        ),
        arch: appImageArch,
        bundle: 'appimage',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/appimage/${info.name}_${info.version}_${appImageArch}.AppImage.tar.gz`,
        ),
        arch: appImageArch,
        bundle: 'appimage',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `bundle/appimage/${info.name}_${info.version}_${appImageArch}.AppImage.tar.gz.sig`,
        ),
        arch: appImageArch,
        bundle: 'appimage',
      }),
    ];
  } else if (targetInfo.platform === 'android') {
    const debug = isDebug ? 'debug' : 'release';
    const aabDebug = isDebug ? 'Debug' : 'Release';

    // TODO: detect (un)signed beforehand

    if (!isDebug) {
      // unsigned release apks
      artifacts.push(
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `apk/universal/release/app-universal-release-unsigned.apk`,
          ),
          arch: 'universal',
          bundle: 'apk',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `apk/arm64/release/app-arm64-release-unsigned.apk`,
          ),
          arch: 'arm64',
          bundle: 'apk',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `apk/arm/release/app-arm-release-unsigned.apk`,
          ),
          arch: 'arm',
          bundle: 'apk',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `apk/x86_64/release/app-x86_64-release-unsigned.apk`,
          ),
          arch: 'x86_64',
          bundle: 'apk',
        }),
        createArtifact({
          info,
          path: join(
            artifactsPath,
            `apk/x86/release/app-x86-release-unsigned.apk`,
          ),
          arch: 'x86',
          bundle: 'apk',
        }),
      );
    }

    artifacts.push(
      // signed release apks and debug apks
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `apk/universal/${debug}/app-universal-${debug}.apk`,
        ),
        arch: 'universal',
        bundle: 'apk',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `apk/arm64/${debug}/app-arm64-${debug}.apk`),
        arch: 'arm64',
        bundle: 'apk',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `apk/arm/${debug}/app-arm-${debug}.apk`),
        arch: 'arm',
        bundle: 'apk',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `apk/x86_64/${debug}/app-x86_64-${debug}.apk`,
        ),
        arch: 'x86_64',
        bundle: 'apk',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `apk/x86/${debug}/app-x86-${debug}.apk`),
        arch: 'x86',
        bundle: 'apk',
      }),
      //
      // aabs
      //
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `/bundle/universal${aabDebug}/app-universal-${debug}.aab`,
        ),
        arch: 'universal',
        bundle: 'aab',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `/bundle/arm64${aabDebug}/app-arm64-${debug}.aab`,
        ),
        arch: 'arm64',
        bundle: 'aab',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `/bundle/arm${aabDebug}/app-arm-${debug}.aab`,
        ),
        arch: 'arm',
        bundle: 'aab',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `/bundle/x86_64${aabDebug}/app-x86_64-${debug}.aab`,
        ),
        arch: 'x86_64',
        bundle: 'aab',
      }),
      createArtifact({
        info,
        path: join(
          artifactsPath,
          `/bundle/x86${aabDebug}/app-x86-${debug}.aab`,
        ),
        arch: 'x86',
        bundle: 'aab',
      }),
    );
  } else if (targetInfo.platform === 'ios') {
    // TODO: Confirm that info.name is correct.
    artifacts = [
      createArtifact({
        info,
        path: join(artifactsPath, `x86_64/${info.name}.ipa`),
        arch: 'x86_64',
        bundle: 'ipa',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `arm64/${info.name}.ipa`),
        arch: 'arm64',
        bundle: 'ipa',
      }),
      createArtifact({
        info,
        path: join(artifactsPath, `arm64-sim/${info.name}.ipa`),
        arch: 'arm64-sim',
        bundle: 'ipa',
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
        info,
        path: join(artifactsPath, `${info.mainBinaryName}${ext}`),
        name: 'binary',
        bundle: 'bin',
        arch,
      }),
    );
  }

  console.log(
    `Looking for artifacts in:\n${artifacts.map((a) => a.path).join('\n')}`,
  );
  return artifacts.filter((p) => existsSync(p.path));
}
