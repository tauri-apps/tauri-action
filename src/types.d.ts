import { Runner } from './runner';

export interface Application {
  tauriPath: string;
  runner: Runner;
  name: string;
  version: string;
  wixLanguage: string | string[] | { [language: string]: unknown };
}

export interface Asset {
  downloadUrl: string;
  assetName: string;
  path: string;
  arch: string;
  bundle: string;
}

export interface Artifact {
  path: string;
  name: string;
  mode: 'debug' | 'release';
  platform: Exclude<TargetPlatform, 'macos'> | 'darwin';
  arch: string;
  bundle: string;
  ext: string;
  version: string;
  setup: '-setup' | '';
  _setup: '_setup' | '';
}

export interface BuildOptions {
  tauriScript: string | null;
  args: string[] | null;
}

export interface InitOptions {
  distPath: string | null;
  iconPath: string | null;
  bundleIdentifier: string | null;
  appVersion: string | null;
  appName: string | null;
}

export interface CargoManifestBin {
  name: string;
}

export interface CargoManifest {
  workspace?: { package?: { version?: string; name?: string } };
  package: { version: string; name: string; 'default-run': string };
  bin: CargoManifestBin[];
}

export interface Info {
  tauriPath: string | null;
  name: string;
  // already falls back to cargo's package name in getInfo
  mainBinaryName: string;
  version: string;
  wixLanguage: string | string[] | { [language: string]: unknown };
  wixAppVersion: string;
  rpmRelease: string;
  unzippedSigs: boolean;
}

export type TargetPlatform = 'android' | 'ios' | 'macos' | 'linux' | 'windows';
export interface TargetInfo {
  arch: string;
  platform: TargetPlatform;
}

export interface TauriConfigV1 {
  package?: {
    productName?: string;
    version?: string;
  };
  build?: {
    distDir?: string;
    beforeBuildCommand?: string;
  };
  tauri?: {
    bundle?: {
      identifier: string;
      rpm?: {
        release?: string;
      };
      windows?: {
        wix?: {
          language?: string | string[] | { [language: string]: unknown };
        };
      };
    };
  };
}

export interface TauriConfigV2 {
  identifier: string;
  productName?: string;
  version?: string;
  mainBinaryName?: string;
  build?: {
    frontendDist?: string;
    beforeBuildCommand?: string;
  };
  bundle?: {
    createUpdaterArtifacts?: boolean | 'v1Compatible';
    linux?: {
      rpm?: {
        release?: string;
      };
    };
    windows?: {
      wix?: {
        language?: string | string[] | { [language: string]: unknown };
      };
    };
  };
}

export interface CargoConfig {
  build?: {
    target?: string;
    'target-dir'?: string;
  };
}
