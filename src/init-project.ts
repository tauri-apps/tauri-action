import { join } from 'path';

import { TauriConfig } from './config';
import { Runner } from './runner';
import { getTauriDir } from './utils';

import type { InitOptions } from './types';

export async function initProject(
  root: string,
  runner: Runner,
  options: InitOptions,
) {
  await runner.execTauriCommand(['init'], ['--ci'], root);

  const tauriPath = getTauriDir(root);

  if (tauriPath === null) {
    console.error('Failed to resolve Tauri path');
    process.exit(1);
  }

  const config = TauriConfig.fromBaseConfig(tauriPath);

  config.version = options.appVersion ?? undefined;
  config.productName = options.appName ?? undefined;

  if (options.bundleIdentifier) {
    config.identifier = options.bundleIdentifier ?? undefined;
  }

  if (options.distPath) {
    config.frontendDist = options.distPath ?? undefined;
  }

  // `tauri init` defaults to npm run dev/build but we can't assume that here.
  config.beforeBuildCommand = '';

  console.log(
    `Updating tauri.conf.json file according to these configurations: ${JSON.stringify(config)}`,
  );
  config.updateConfigFile(tauriPath);

  if (options.iconPath) {
    await runner.execTauriCommand(
      ['icon', join(root, options.iconPath)],
      [],
      root,
    );
  }
}
