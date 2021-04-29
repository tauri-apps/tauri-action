# Changelog

## \[0.1.1]

- Fixes action packaging.
  - [2598dd6](https://www.github.com/tauri-apps/tauri-action/commit/2598dd6f75569cc7d8af81586aaa6c9463775d80) fix(action): runtime issue: tslib not found, use `tauri-apps/tauri-action` as action path ([#119](https://www.github.com/tauri-apps/tauri-action/pull/119)) on 2021-04-28
- Revert action path to `tauri-apps/tauri-action`.
  - [2598dd6](https://www.github.com/tauri-apps/tauri-action/commit/2598dd6f75569cc7d8af81586aaa6c9463775d80) fix(action): runtime issue: tslib not found, use `tauri-apps/tauri-action` as action path ([#119](https://www.github.com/tauri-apps/tauri-action/pull/119)) on 2021-04-28

## \[0.1.0]

- Update to Tauri beta release candidate.
  - [b874256](https://github.com/tauri-apps/tauri-action/commit/b87425614119f70be189fddd40a403481b91a328) refactor: rewrite as yarn workspace, add cli as test tool ([#98](https://github.com/tauri-apps/tauri-action/pull/98)) on 2021-04-26
  - [dbbc6b4](https://github.com/tauri-apps/tauri-action/commit/dbbc6b4e604ce66a84108e7441ee1b8f38cb82fe) fix(action): test CI and fixes for usage with tauri beta-rc ([#114](https://github.com/tauri-apps/tauri-action/pull/114)) on 2021-04-28

## \[0.0.10]

- If vue-cli-plugin-tauri is detected, the tauri:build command will be used.
  - [f043343](https://github.com/tauri-apps/tauri-action/commit/f043343ae7ada30f30f67deeacb29eb9709283c3) feat: add support for building with vue cli ([#60](https://github.com/tauri-apps/tauri-action/pull/60)) on 2021-01-30

## \[0.0.9]

- Add option to elect using an existing globally installed version of Tauri.
  - [a45f21b](https://github.com/tauri-apps/tauri-action/commit/a45f21b1732014a0dabc488197f277ad0cef6b06) feature: add preferGlobal option ([#48](https://github.com/tauri-apps/tauri-action/pull/48)) on 2020-09-02

## \[0.0.8]

- Uploaded assets break when `data` receives `fs.readFileSync(assetPath).toString()` even though types suggest it. Giving it a Buffer fixes the issue.
  - [cf98c66](https://github.com/tauri-apps/tauri-action/commit/cf98c661aea6841d7aff2b5f4df614b36a6f6726) fix: broken asset release upload ([#45](https://github.com/tauri-apps/tauri-action/pull/45)) on 2020-08-23

## \[0.0.7]

- Updates for tauri.js 0.10.0 and tauri-core 0.8.0.
  - [4c37642](https://github.com/tauri-apps/tauri-action/commit/4c37642f0621ad7508f39a40a41d979b41dd6a59) fix(action) update to latest tauri.js and tauri versions on 2020-07-22

## \[0.0.6]

- Fixes the includeDebug input usage.
  - [58d7b86](https://github.com/tauri-apps/tauri-action/commit/58d7b8650a12ffc4a11729ce93d0072e22bc4aaa) fix(action) includeDebug usage on 2020-07-12
- Update @actions/github package version to v4.
  - [2e93aab](https://github.com/tauri-apps/tauri-action/commit/2e93aabc2a786719f0316d0677738d6a9ad06801) refactor(action) update @actions/github to v4 ([#13](https://github.com/tauri-apps/tauri-action/pull/13)) on 2020-07-12

## \[0.0.5]

- Adds support to tauri listed as a dev dependency on package.json.
  - [a14bbef](https://github.com/tauri-apps/tauri-action/commit/a14bbefa2fd178a3a3e5621316aeda4124b91440) feat(action) add support to devDependencies' tauri on 2020-07-12
- Fixes the macOS .app compression to tar when using includeDebug.
  - [52c88ce](https://github.com/tauri-apps/tauri-action/commit/52c88ce6cfcd8e951b027cd1aadba562c93befe7) fix(action) macOS .app compression with `includeDir`= true on 2020-07-12

## \[0.0.4]

- Fixes the action build script.
  - [981f369](https://github.com/tauri-apps/tauri-action/commit/981f3691972cad500eaa5a2b7a1c8c30e8537c79) fix(action) build script on 2020-07-12

## \[0.0.3]

- Build action on preversion so we can't forget to build when a version is updated.
  - [af79aee](https://github.com/tauri-apps/tauri-action/commit/af79aee2e0022f4402f619d1177e63596f8c950c) chore: build action on version ([#7](https://github.com/tauri-apps/tauri-action/pull/7)) on 2020-07-12
- Adds an option to run a custom package.json script with the npmScript input.
  - [f91ad8d](https://github.com/tauri-apps/tauri-action/commit/f91ad8dc315e9d911f3351bead517b35b89a1e6f) feat(action) add option to run custom package.json script ([#8](https://github.com/tauri-apps/tauri-action/pull/8)) on 2020-07-12
- Adds an option to include a debug build with the includeDebug (bool) input.
  - [a6b824c](https://github.com/tauri-apps/tauri-action/commit/a6b824c578593003332957fa899c354c40e20df5) feat(action) add option to include a debug build ([#6](https://github.com/tauri-apps/tauri-action/pull/6)) on 2020-07-12

## \[0.0.2]

- Implement covector for change management and git tag creation.
  - [f6ce359](https://github.com/tauri-apps/tauri-action/commit/f6ce3599bee8d42f16c605e00e56c37d05847187) change file on 2020-07-11
