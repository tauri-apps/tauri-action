import { writeFileSync } from 'fs';
import { join } from 'path';

import { getConfig, isV2Config } from './config';
import { Runner } from './runner';
import { getTauriDir } from './utils';

import type { InitOptions, TauriConfigV1, TauriConfigV2 } from './types';

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

  const config = getConfig(tauriPath);

  if (isV2Config(config)) {
    initV2(config, options, tauriPath);
  } else {
    initV1(config, options, tauriPath);
  }

  if (options.iconPath) {
    await runner.execTauriCommand(
      ['icon', join(root, options.iconPath)],
      [],
      root,
    );
  }
}

function initV1(
  config: TauriConfigV1,
  options: InitOptions,
  tauriPath: string,
) {
  console.log(
    `Replacing tauri.conf.json config - package.version=${options.appVersion}`,
  );
  const pkgConfig = {
    ...config.package,
    version: options.appVersion ?? undefined,
  };

  console.log(
    `Replacing tauri.conf.json config - package.productName=${options.appName}`,
  );
  pkgConfig.productName = options.appName ?? undefined;
  config.package = pkgConfig;

  if (options.bundleIdentifier) {
    console.log(
      `Replacing tauri.conf.json config - tauri.bundle.identifier=${options.bundleIdentifier}`,
    );
    config.tauri = {
      ...config.tauri,
      bundle: {
        ...config.tauri?.bundle,
        identifier: options.bundleIdentifier,
      },
    };
  }

  if (options.distPath) {
    console.log(
      `Replacing tauri.conf.json config - build.distDir=${options.distPath}`,
    );
    config.build = {
      ...config.build,
      distDir: options.distPath,
    };
  }

  // `tauri init` defaults to npm run dev/build but we can't assume that here.
  config.build = {
    ...config.build,
    beforeBuildCommand: '',
  };

  const configPath = join(tauriPath, 'tauri.conf.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function initV2(
  config: TauriConfigV2,
  options: InitOptions,
  tauriPath: string,
) {
  console.log(
    `Replacing tauri.conf.json config - version=${options.appVersion}`,
  );
  config = {
    ...config,
    version: options.appVersion ?? undefined,
  };

  console.log(
    `Replacing tauri.conf.json config - productName=${options.appName}`,
  );
  config = {
    ...config,
    productName: options.appName ?? undefined,
  };

  if (options.bundleIdentifier) {
    console.log(
      `Replacing tauri.conf.json config - identifier=${options.bundleIdentifier}`,
    );
    config = {
      ...config,
      identifier: options.bundleIdentifier ?? undefined,
    };
  }

  if (options.distPath) {
    console.log(
      `Replacing tauri.conf.json config - build.frontendDist=${options.distPath}`,
    );
    config.build = {
      ...config.build,
      frontendDist: options.distPath,
    };
  }

  // `tauri init` defaults to npm run dev/build but we can't assume that here.
  config.build = {
    ...config.build,
    beforeBuildCommand: '',
  };

  const configPath = join(tauriPath, 'tauri.conf.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}
