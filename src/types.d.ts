import { Runner } from './runner';

export interface Application {
  tauriPath: string;
  runner: Runner;
  name: string;
  version: string;
  wixLanguage: string | string[] | { [language: string]: unknown };
}

export interface Artifact {
  path: string;
  arch: string;
}

export interface BuildOptions {
  distPath: string | null;
  iconPath: string | null;
  tauriScript: string | null;
  args: string[] | null;
  bundleIdentifier: string | null;
}

export interface CargoManifestBin {
  name: string;
}

export interface CargoManifest {
  package: { version: string; name: string; 'default-run': string };
  bin: CargoManifestBin[];
}

export interface Info {
  tauriPath: string | null;
  name: string;
  version: string;
  wixLanguage: string | string[] | { [language: string]: unknown };
}

export type TargetPlatform = 'android' | 'ios' | 'macos' | 'linux' | 'windows';
export interface TargetInfo {
  arch: string;
  platform: TargetPlatform;
}

export interface TauriConfig {
  package?: {
    productName?: string;
    version?: string;
  };
  tauri?: {
    bundle?: {
      identifier: string;
      windows?: {
        wix?: {
          language?: string | string[] | { [language: string]: unknown };
        };
      };
    };
  };
}
