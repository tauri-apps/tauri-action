# Changelog

## \[0.1.3]

- Linux: Upload AppImage updater artifacts if available.
  macOS: Replace `[AppName].app.tgz` to `[AppName].app.tar.gz` to align with updater artifacts.
  - [e7266ff](https://www.github.com/tauri-apps/tauri-action/commit/e7266fff1b42c35bfd7ff359d5c6a91ad1308dea) fix(action): Upload AppImage updater artifacts when available ([#163](https://www.github.com/tauri-apps/tauri-action/pull/163)) on 2021-08-31
- Fix incorrect version being used in release names
  - [110a0c6](https://www.github.com/tauri-apps/tauri-action/commit/110a0c6da6de9aa85c8e3186ad642650ebc95ab0) Fix version lookup ([#160](https://www.github.com/tauri-apps/tauri-action/pull/160)) on 2021-09-01

## \[0.1.2]

- Adds `args` option to pass arguments to the tauri command.
  - [f564b01](https://www.github.com/tauri-apps/tauri-action/commit/f564b01e52fbf240e5e5c12577dd10625fe83580) feat: add `args` option, closes [#131](https://www.github.com/tauri-apps/tauri-action/pull/131) ([#134](https://www.github.com/tauri-apps/tauri-action/pull/134)) on 2021-05-13
- Fixes `execCommand` usage.
  - [b4b20f9](https://www.github.com/tauri-apps/tauri-action/commit/b4b20f94709829e5e974255aa8034c78e70bb5d1) fix(core): command execution ([#132](https://www.github.com/tauri-apps/tauri-action/pull/132)) on 2021-05-11
- Include updater artifacts if available.
  - [0e9704e](https://www.github.com/tauri-apps/tauri-action/commit/0e9704eb73bcadd1c6acb3a2e9a73a100465db58) Add updater artifacts when available ([#129](https://www.github.com/tauri-apps/tauri-action/pull/129)) on 2021-05-13

## \[0.1.1]

- Fixes `Artifacts not found` error on Linux when the `productName` is converted to `kebab-case`.
  - [e6aa180](https://www.github.com/tauri-apps/tauri-action/commit/e6aa1807b6d2c80de70f78fb945e11a659037837) fix(core): product name on Linux is converted to kebab-case ([#125](https://www.github.com/tauri-apps/tauri-action/pull/125)) on 2021-04-29

## \[0.1.0]

- Update to Tauri beta release candidate.
  - [b874256](https://github.com/tauri-apps/tauri-action/commit/b87425614119f70be189fddd40a403481b91a328) refactor: rewrite as yarn workspace, add cli as test tool ([#98](https://github.com/tauri-apps/tauri-action/pull/98)) on 2021-04-26
  - [dbbc6b4](https://github.com/tauri-apps/tauri-action/commit/dbbc6b4e604ce66a84108e7441ee1b8f38cb82fe) fix(action): test CI and fixes for usage with tauri beta-rc ([#114](https://github.com/tauri-apps/tauri-action/pull/114)) on 2021-04-28
