import { writeFileSync } from 'fs';
import { join } from 'path';

import { getConfig } from './config';
import { Runner } from './runner';
import { getPackageJson, getTauriDir } from './utils';

import type { Application, BuildOptions, Info } from './types';

export async function initProject(
  root: string,
  runner: Runner,
  info: Info,
  { iconPath, bundleIdentifier }: BuildOptions
): Promise<Application> {
  await runner.execTauriCommand(
    ['init'],
    ['--ci', '--app-name', info.name],
    root
  );

  const packageJson = getPackageJson(root);
  const tauriPath = getTauriDir(root);

  if (tauriPath === null) {
    console.error('Failed to resolve Tauri path');
    process.exit(1);
  }

  const config = getConfig(tauriPath);

  console.log(
    `Replacing tauri.conf.json config - package.version=${info.version}`
  );
  const pkgConfig = {
    ...config.package,
    version: info.version,
  };
  if (packageJson?.productName) {
    console.log(
      `Replacing tauri.conf.json config - package.productName=${packageJson.productName}`
    );
    pkgConfig.productName = packageJson.productName;
  }
  config.package = pkgConfig;

  if (bundleIdentifier) {
    console.log(
      `Replacing tauri.conf.json config - tauri.bundle.identifier=${bundleIdentifier}`
    );
    config.tauri = {
      ...config.tauri,
      bundle: {
        ...config.tauri?.bundle,
        identifier: bundleIdentifier,
      },
    };
  }

  const configPath = join(tauriPath, 'tauri.conf.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  const app = {
    tauriPath,
    runner,
    name: info.name,
    version: info.version,
    wixLanguage: info.wixLanguage,
  };

  if (iconPath) {
    await runner.execTauriCommand(['icon', join(root, iconPath)], [], root);
  }

  return app;
}
