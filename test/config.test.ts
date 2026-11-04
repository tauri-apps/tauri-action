import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';

import { TauriConfig } from '../src/config.ts';

// Every fixture below is a config the Tauri CLI itself accepts. Tauri rejects a
// config that ends up with both spellings of a key (`duplicate field`), and
// rejects kebab-case keys when the base config is JSON/JSON5 (schema check).

const root = mkdtempSync(join(tmpdir(), 'tauri-action-config-'));
after(() => rmSync(root, { recursive: true, force: true }));

let count = 0;
function project(files: Record<string, string>): string {
  const dir = join(root, `p${count++}`);
  mkdirSync(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}

describe('kebab-case keys', () => {
  test('Tauri.toml product-name and main-binary-name', () => {
    const dir = project({
      'Tauri.toml': [
        'identifier = "com.example.app"',
        'product-name = "Kebab App"',
        'main-binary-name = "kebab-bin"',
        'version = "1.2.3"',
      ].join('\n'),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    assert.equal(config.productName, 'Kebab App');
    assert.equal(config.mainBinaryName, 'kebab-bin');
    assert.equal(config.version, '1.2.3');
  });

  test('Tauri.toml build.frontend-dist and build.before-build-command', () => {
    const dir = project({
      'Tauri.toml': [
        'identifier = "com.example.app"',
        '[build]',
        'frontend-dist = "../dist"',
        'before-build-command = "pnpm build"',
      ].join('\n'),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    assert.equal(config.frontendDist, '../dist');
    assert.equal(config.beforeBuildCommand, 'pnpm build');
  });

  test('platform Tauri.<platform>.toml overrides the base config', () => {
    const dir = project({
      'Tauri.toml': [
        'identifier = "com.example.app"',
        'product-name = "Base"',
        'main-binary-name = "base-bin"',
      ].join('\n'),
      'Tauri.linux.toml': [
        'product-name = "Linux Name"',
        'main-binary-name = "linux-bin"',
      ].join('\n'),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergePlatformConfig(dir, 'linux');
    assert.equal(config.productName, 'Linux Name');
    assert.equal(config.mainBinaryName, 'linux-bin');
  });

  test('platform Tauri.<platform>.toml overrides build keys', () => {
    const dir = project({
      'Tauri.toml': [
        'identifier = "com.example.app"',
        '[build]',
        'frontend-dist = "../dist"',
      ].join('\n'),
      'Tauri.windows.toml': [
        '[build]',
        'frontend-dist = "../win-dist"',
        'before-build-command = "pnpm build:win"',
      ].join('\n'),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergePlatformConfig(dir, 'windows');
    assert.equal(config.frontendDist, '../win-dist');
    assert.equal(config.beforeBuildCommand, 'pnpm build:win');
  });

  test('a platform config without the key keeps the base value', () => {
    const dir = project({
      'Tauri.toml': 'identifier = "com.example.app"\nproduct-name = "Base"\n',
      'Tauri.windows.toml': 'version = "9.9.9"\n',
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergePlatformConfig(dir, 'windows');
    assert.equal(config.productName, 'Base');
    assert.equal(config.version, '9.9.9');
  });

  test('--config TOML file overrides the base config', () => {
    const dir = project({
      'Tauri.toml': 'identifier = "com.example.app"\nproduct-name = "Base"\n',
      'release.toml':
        'product-name = "Release Name"\nmain-binary-name = "release-bin"\n',
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergeUserConfig(dir, 'release.toml');
    assert.equal(config.productName, 'Release Name');
    assert.equal(config.mainBinaryName, 'release-bin');
  });

  test('--config JSON file over a Tauri.toml base', () => {
    const dir = project({
      'Tauri.toml': 'identifier = "com.example.app"\nproduct-name = "Base"\n',
      'release.json': JSON.stringify({
        'product-name': 'Json Name',
        'main-binary-name': 'json-bin',
      }),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergeUserConfig(dir, 'release.json');
    assert.equal(config.productName, 'Json Name');
    assert.equal(config.mainBinaryName, 'json-bin');
  });

  test('inline --config JSON over a Tauri.toml base', () => {
    const dir = project({
      'Tauri.toml': 'identifier = "com.example.app"\nproduct-name = "Base"\n',
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergeUserConfig(dir, '{"product-name":"Inline"}');
    assert.equal(config.productName, 'Inline');
  });
});

describe('camelCase keys', () => {
  test('Tauri.toml', () => {
    const dir = project({
      'Tauri.toml': [
        'identifier = "com.example.app"',
        'productName = "Camel App"',
        'mainBinaryName = "camel-bin"',
        '[bundle]',
        'createUpdaterArtifacts = true',
        '[bundle.linux.rpm]',
        'release = "7"',
        '[bundle.windows.wix]',
        'language = ["en-US", "de-DE"]',
      ].join('\n'),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    assert.equal(config.productName, 'Camel App');
    assert.equal(config.mainBinaryName, 'camel-bin');
    assert.equal(config.unzippedSigs, true);
    assert.equal(config.rpmRelease, '7');
    assert.deepEqual(config.wixLanguage, ['en-US', 'de-DE']);
  });

  test('tauri.conf.json', () => {
    const dir = project({
      'tauri.conf.json': JSON.stringify({
        identifier: 'com.example.app',
        productName: 'Json App',
        build: { frontendDist: '../out' },
      }),
    });
    const config = TauriConfig.fromBaseConfig(dir);
    assert.equal(config.productName, 'Json App');
    assert.equal(config.mainBinaryName, undefined);
    assert.equal(config.frontendDist, '../out');
  });

  test('tauri.<platform>.conf.json5 without the key keeps the base value', () => {
    const dir = project({
      'tauri.conf.json5':
        "{ identifier: 'com.example.app', productName: 'Base' }",
      'tauri.windows.conf.json5': "{ version: '9.9.9' }",
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergePlatformConfig(dir, 'windows');
    assert.equal(config.productName, 'Base');
    assert.equal(config.version, '9.9.9');
  });

  test('Tauri.<platform>.toml overrides the base config', () => {
    const dir = project({
      'Tauri.toml': 'identifier = "com.example.app"\nproductName = "Base"\n',
      'Tauri.macos.toml': 'productName = "Mac"\n',
    });
    const config = TauriConfig.fromBaseConfig(dir);
    config.mergePlatformConfig(dir, 'macos');
    assert.equal(config.productName, 'Mac');
  });
});
