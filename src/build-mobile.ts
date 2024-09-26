import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getRunner } from './runner';
import { getInfo } from './utils';

import type { Artifact, BuildOptions } from './types';

export async function buildProject(
  root: string,
  android: boolean,
  buildOpts: BuildOptions,
): Promise<Artifact[]> {
  const runner = await getRunner(root, buildOpts.tauriScript);

  const tauriArgs = buildOpts.args ?? [];

  const configArgIdx = [...tauriArgs].findIndex(
    (e) => e === '-c' || e === '--config',
  );
  const configArg =
    configArgIdx >= 0 ? [...tauriArgs][configArgIdx + 1] : undefined;

  const info = getInfo(
    root,
    { arch: 'mobile', platform: android ? 'android' : 'ios' },
    configArg,
  );

  if (!info.tauriPath) {
    throw Error("Couldn't detect path of tauri app");
  }

  await runner.execTauriCommand(
    [android ? 'android' : 'ios', 'build'],
    [...tauriArgs],
    root,
  );

  let artifacts: Artifact[] = [];

  if (android) {
    const artifactPaths = join(
      info.tauriPath,
      'gen/android/app/build/outputs/',
    );
    artifacts = [
      // unsinged release apks
      join(artifactPaths, 'apk/universal/release/app-universal-unsigned.apk'),
      join(artifactPaths, 'apk/arm64/release/app-arm64-unsigned.apk'),
      join(artifactPaths, 'apk/arm/release/app-arm-unsigned.apk'),
      join(artifactPaths, 'apk/x86_64/release/app-x86_64-unsigned.apk'),
      join(artifactPaths, 'apk/x86/release/app-x86-unsigned.apk'),
      // signed release apks
      join(artifactPaths, 'apk/universal/release/app-universal-release.apk'),
      join(artifactPaths, 'apk/arm64/release/app-arm64-release.apk'),
      join(artifactPaths, 'apk/arm/release/app-arm-release.apk'),
      join(artifactPaths, 'apk/x86_64/release/app-x86_64-release.apk'),
      join(artifactPaths, 'apk/x86/release/app-x86-release.apk'),
      // release aabs
      join(artifactPaths, 'bundle/universalRelease/app-universal-release.aab'),
      join(artifactPaths, 'bundle/arm64Release/app-arm64-release.aab'),
      join(artifactPaths, 'bundle/armRelease/app-arm-release.aab'),
      join(artifactPaths, 'bundle/x86_64Release/app-x86_64-release.aab'),
      join(artifactPaths, 'bundle/x86Release/app-x86-release.aab'),
      // debug apks
      join(artifactPaths, 'apk/universal/debug/app-universal-debug.apk'),
      join(artifactPaths, 'apk/arm64/debug/app-arm64-debug.apk'),
      join(artifactPaths, 'apk/arm/debug/app-arm-debug.apk'),
      join(artifactPaths, 'apk/x86_64/debug/app-x86_64-debug.apk'),
      join(artifactPaths, 'apk/x86/debug/app-x86-debug.apk'),
      // debug aabs
      join(artifactPaths, 'bundle/universalDebug/app-universal-debug.aab'),
      join(artifactPaths, 'bundle/arm64Debug/app-arm64-debug.aab'),
      join(artifactPaths, 'bundle/armDebug/app-arm-debug.aab'),
      join(artifactPaths, 'bundle/x86_64Debug/app-x86_64-debug.aab'),
      join(artifactPaths, 'bundle/x86Debug/app-x86-debug.aab'),
    ].map((path) => ({ path, arch: 'mobile' }));
  } else {
    const artifactPaths = join(info.tauriPath, 'gen/apple/app/build/arm64/');
    // TODO: Confirm where the iOS project name actually comes from. it may be time for a glob pattern here to get the ipa without knowing the name.
    artifacts = [join(artifactPaths, `${info.cargoName}.ipa`)].map((path) => ({
      path,
      arch: 'mobile',
    }));
  }

  console.log(
    `Looking for artifacts in:\n${artifacts.map((a) => a.path).join('\n')}`,
  );
  return artifacts.filter((p) => existsSync(p.path));
}
