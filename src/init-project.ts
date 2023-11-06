import { writeFileSync } from 'fs';
import { join } from 'path';

import { getConfig } from './config';
import { Runner } from './runner';
import { getTauriDir } from './utils';

import type { InitOptions } from './types';

export async function initProject(
  root: string,
  runner: Runner,
  { iconPath, bundleIdentifier, distPath, appName, appVersion }: InitOptions,
) {
  await runner.execTauriCommand(['init'], ['--ci'], root);

  const tauriPath = getTauriDir(root);

  if (tauriPath === null) {
    console.error('Failed to resolve Tauri path');
    process.exit(1);
  }

  const config = getConfig(tauriPath);

  console.log(
    `Replacing tauri.conf.json config - package.version=${appVersion}`,
  );
  const pkgConfig = {
    ...config.package,
    version: appVersion ?? undefined,
  };
  console.log(
    `Replacing tauri.conf.json config - package.productName=${appName}`,
  );
  pkgConfig.productName = appName ?? undefined;
  config.package = pkgConfig;

  if (bundleIdentifier) {
    console.log(
      `Replacing tauri.conf.json config - tauri.bundle.identifier=${bundleIdentifier}`,
    );
    config.tauri = {
      ...config.tauri,
      bundle: {
        ...config.tauri?.bundle,
        identifier: bundleIdentifier,
      },
    };
  }
  if (distPath) {
    console.log(`Replacing tauri.conf.json config - build.distDir=${distPath}`);
    config.build = {
      ...config.build,
      distDir: distPath,
    };
  }

  // `tauri init` defaults to npm run dev/build but we can't assume that here.
  config.build = {
    ...config.build,
    beforeBuildCommand: '',
  };

  const configPath = join(tauriPath, 'tauri.conf.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  if (iconPath) {
    await runner.execTauriCommand(['icon', join(root, iconPath)], [], root);
  }
}
