# Changelog

## [0.0.5]

-   Adds support to tauri listed as a dev dependency on package.json.
    -   [a14bbef](https://github.com/tauri-apps/tauri-action/commit/a14bbefa2fd178a3a3e5621316aeda4124b91440) feat(action) add support to devDependencies' tauri on 2020-07-12
-   Fixes the macOS .app compression to tar when using includeDebug.
    -   [52c88ce](https://github.com/tauri-apps/tauri-action/commit/52c88ce6cfcd8e951b027cd1aadba562c93befe7) fix(action) macOS .app compression with `includeDir`= true on 2020-07-12

## [0.0.4]

-   Fixes the action build script.
    -   [981f369](https://github.com/tauri-apps/tauri-action/commit/981f3691972cad500eaa5a2b7a1c8c30e8537c79) fix(action) build script on 2020-07-12

## [0.0.3]

-   Build action on preversion so we can't forget to build when a version is updated.
    -   [af79aee](https://github.com/tauri-apps/tauri-action/commit/af79aee2e0022f4402f619d1177e63596f8c950c) chore: build action on version ([#7](https://github.com/tauri-apps/tauri-action/pull/7)) on 2020-07-12
-   Adds an option to run a custom package.json script with the npmScript input.
    -   [f91ad8d](https://github.com/tauri-apps/tauri-action/commit/f91ad8dc315e9d911f3351bead517b35b89a1e6f) feat(action) add option to run custom package.json script ([#8](https://github.com/tauri-apps/tauri-action/pull/8)) on 2020-07-12
-   Adds an option to include a debug build with the includeDebug (bool) input.
    -   [a6b824c](https://github.com/tauri-apps/tauri-action/commit/a6b824c578593003332957fa899c354c40e20df5) feat(action) add option to include a debug build ([#6](https://github.com/tauri-apps/tauri-action/pull/6)) on 2020-07-12

## [0.0.2]

-   Implement covector for change management and git tag creation.
    -   [f6ce359](https://github.com/tauri-apps/tauri-action/commit/f6ce3599bee8d42f16c605e00e56c37d05847187) change file on 2020-07-11
