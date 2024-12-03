# Changelog

## \[0.5.16]

- [`acdef25`](https://www.github.com/tauri-apps/tauri-action/commit/acdef251b8450d568e025c512753e61ef582fa8f) ([#949](https://www.github.com/tauri-apps/tauri-action/pull/949) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) The action will now set `TAURI_BUNDLER_DMG_IGNORE_CI: true` by default on tauri cli versions 2.2.0 and above. See https://github.com/tauri-apps/tauri-action/issues/740 for context. This can be disabled by explicitly setting `TAURI_BUNDLER_DMG_IGNORE_CI: false` yourself.

## \[0.5.15]

- [`f575715`](https://www.github.com/tauri-apps/tauri-action/commit/f575715ef970f081f9942c4867a8657d6d6dbfc1) ([#929](https://www.github.com/tauri-apps/tauri-action/pull/929) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) The action will now try to check for the tauri version before installing the tauri cli fallback (if no tauri cli was found) instead of always installing the latest stable version.

## \[0.5.14]

- [`9387d95`](https://www.github.com/tauri-apps/tauri-action/commit/9387d95d400af0a0c6c4199962a962e93d13cb4d) ([#908](https://www.github.com/tauri-apps/tauri-action/pull/908) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) The action will now only use the signature file for unzipped bundles if `createUpdaterArtifacts` in tauri.conf.json is set to `true`.

## \[0.5.13]

- [`3b72cab`](https://www.github.com/tauri-apps/tauri-action/commit/3b72cab93fb2fbac61fc5b91cbede2fee647dd82) ([#893](https://www.github.com/tauri-apps/tauri-action/pull/893) by [@Muska-Ami](https://www.github.com/tauri-apps/tauri-action/../../Muska-Ami)) Use Bun for the build when the `bun.locb` file is found.

## \[0.5.12]

- [`93d570b`](https://www.github.com/tauri-apps/tauri-action/commit/93d570b03af965a5751e2079c1b3d264b451f300) ([#863](https://www.github.com/tauri-apps/tauri-action/pull/863) by [@tobyspark](https://www.github.com/tauri-apps/tauri-action/../../tobyspark)) Reduces memory consumption when uploading successfully built releases, by passing a file stream object rather than reading the entire file into a buffer and then passing that. Empirically, this has stopped the action from failing on GitHub's Windows runners, with apps approaching 2GB in size.

## \[0.5.11]

- [`70f5023`](https://www.github.com/tauri-apps/tauri-action/commit/70f50235fd767d6357440bc26d78fe6a0fe02545) ([#873](https://www.github.com/tauri-apps/tauri-action/pull/873) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) Support new RPM file name that was fixed in tauri-cli@2.0.0-beta.21.

## \[0.5.10]

- [`f876b0d`](https://www.github.com/tauri-apps/tauri-action/commit/f876b0d6a0b9306a8030e98b0b9dda2fb231059e) ([#861](https://www.github.com/tauri-apps/tauri-action/pull/861) by [@vdemcak](https://www.github.com/tauri-apps/tauri-action/../../vdemcak)) Fixed an issue that caused the action to not generate `latest.json` due to a desync between GitHub artifacts and local variables. This was caused by incorrect normalization of artifact file names, specifically not accounting for removing special characters.

## \[0.5.9]

- [`ff07d2a`](https://www.github.com/tauri-apps/tauri-action/commit/ff07d2a6ce69514dddf7cde3ba0b866dad1e07e0) ([#849](https://www.github.com/tauri-apps/tauri-action/pull/849) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) Fixed an issue that caused the action to fail to upload some assets to existing releases if the workflow built the app for many architectures and debug + release mode.

## \[0.5.8]

- [`621de48`](https://www.github.com/tauri-apps/tauri-action/commit/621de481ebf76558785277c9654f3befeaf0bd35) ([#845](https://www.github.com/tauri-apps/tauri-action/pull/845) by [@Legend-Master](https://www.github.com/tauri-apps/tauri-action/../../Legend-Master)) Fix can't find updater file name with spaces in them and can't pick up unzipped updater signatures

## \[0.5.7]

- [`f8044a1`](https://www.github.com/tauri-apps/tauri-action/commit/f8044a1d9fa468d71dd285d9f17b467dc8c9b334) ([#837](https://www.github.com/tauri-apps/tauri-action/pull/837) by [@FabianLars](https://www.github.com/tauri-apps/tauri-action/../../FabianLars)) Fixed an issue that caused the action to be unable to pick up the app bundles if the `productName` contained any of these characters: `()[]{}`.
- [`edd3869`](https://www.github.com/tauri-apps/tauri-action/commit/edd386979eff0987d210b7043491b7b3fef906b4) ([#766](https://www.github.com/tauri-apps/tauri-action/pull/766) by [@Legend-Master](https://www.github.com/tauri-apps/tauri-action/../../Legend-Master)) Support non zipped updater for Windows and Linux

## \[0.5.6]

- [`d80ec2c`](https://www.github.com/tauri-apps/tauri-action/commit/d80ec2ce013f37a16774e5dfe5ca51d3fb12ef1a) ([#821](https://www.github.com/tauri-apps/tauri-action/pull/821) by [@pewsheen](https://www.github.com/tauri-apps/tauri-action/../../pewsheen)) Fixed an issue that the action can't find aarch64 rpm package.

## \[0.5.5]

- [`10eca12`](https://www.github.com/tauri-apps/tauri-action/commit/10eca12d4b7138e3c7dca7bccaa170a8784ea3f5) ([#810](https://www.github.com/tauri-apps/tauri-action/pull/810)) The action can now detects Linux bundles with the new naming convention added in tauri cli 2.0.0-beta.19

## \[0.5.4]

- [`ec3a63a`](https://www.github.com/tauri-apps/tauri-action/commit/ec3a63a669b74a6069703e9dc1c3e0bd72abad62)([#799](https://www.github.com/tauri-apps/tauri-action/pull/799)) Fixed an issue that caused the action to not detect ARM AppImages.

## \[0.5.3]

- [`6c3f5cf`](https://www.github.com/tauri-apps/tauri-action/commit/6c3f5cf8dbe7410537547f57aef00238e53e931f)([#779](https://www.github.com/tauri-apps/tauri-action/pull/779)) Fixed an issue that caused `tauri-action` to not detect `build.target` in `.cargo/config.toml` if the app was part of a cargo workspace.

## \[0.5.2]

- [`14e3c6c`](https://www.github.com/tauri-apps/tauri-action/commit/14e3c6c0d54349a0fe1eb576b560883744c07303)([#776](https://www.github.com/tauri-apps/tauri-action/pull/776)) Fixed an issue causing x86\_64 artifacts to be handled as aarch64 on GitHub's new M1 runners.

## \[0.5.1]

- [`f2abe36`](https://www.github.com/tauri-apps/tauri-action/commit/f2abe36fa8a59765d670b75f823b2ed3e93b40ab)([#711](https://www.github.com/tauri-apps/tauri-action/pull/711)) tauri-action can now successfully build binaries even if they don't have any artifacts (`bundle.active: false`)
- [`f1b5af3`](https://www.github.com/tauri-apps/tauri-action/commit/f1b5af3268dd7853edbef9a055dd9e9d051de9e1)([#724](https://www.github.com/tauri-apps/tauri-action/pull/724)) The action now correctly ignores the `[build.target]` value in `.cargo/config.toml` if the `--target` arg is set.
- [`901a25d`](https://www.github.com/tauri-apps/tauri-action/commit/901a25d04f844266e79c65414f31b34d52089219)([#713](https://www.github.com/tauri-apps/tauri-action/pull/713)) Fixed an issue that caused the action to not merge user and platform configs into the base tauri config correctly.

## \[0.5.0]

- [`d618a42`](https://www.github.com/tauri-apps/tauri-action/commit/d618a422b9e0fbca4fd2436be4f6368453c45a7e)([#645](https://www.github.com/tauri-apps/tauri-action/pull/645)) The action added `appVersion` parameter to facilitate easy access to the current application version in action output.
- [`cb393bf`](https://www.github.com/tauri-apps/tauri-action/commit/cb393bfe3b4fb834693989499769ff8fc24ada26)([#611](https://www.github.com/tauri-apps/tauri-action/pull/611)) **Breaking:** The action no longer supports `vue-cli-plugin-tauri` since it was deprecated like `vue-cli` itself. Please migrate to `@tauri-apps/cli`.
- [`b87a544`](https://www.github.com/tauri-apps/tauri-action/commit/b87a544c7a8ad25f6ff41f0a4a20b8f711056008)([#626](https://www.github.com/tauri-apps/tauri-action/pull/626)) The action now correctly handles glob patterns in the workspace.members config (example: `members = ["bin/*"]`).
- [`0ae6017`](https://www.github.com/tauri-apps/tauri-action/commit/0ae60177b83b43bbaa0da921afe7262787a0441a)([#684](https://www.github.com/tauri-apps/tauri-action/pull/684)) The action now correctly handles the wix version after the build of the app in case the version includes a `+` or `-` character.
- [`b862ca0`](https://www.github.com/tauri-apps/tauri-action/commit/b862ca088ab308dee6bf035f4003f1f446e11438)([#602](https://www.github.com/tauri-apps/tauri-action/pull/602)) **Breaking:** The action no longer tries to read a package.json file for the app name and version when initializing a tauri app. Use the `appName` and `appVersion` input arguments or the `--config` flag.
- [`1fb5053`](https://www.github.com/tauri-apps/tauri-action/commit/1fb5053d19d6a3c1c5a2b1d39e3d5ce2bf448ca5)([#657](https://www.github.com/tauri-apps/tauri-action/pull/657)) The action now always packages the macOS `.app` bundle into a `.tar.gz` archive even if the action is not configured to upload anything.
- [`27089ad`](https://www.github.com/tauri-apps/tauri-action/commit/27089ade7a1c5a985c91b23424bd5017b8148595)([#659](https://www.github.com/tauri-apps/tauri-action/pull/659)) The action now reads `build.target` from `.cargo/config` toml to get the correct `target` directory.
- [`37e9ece`](https://www.github.com/tauri-apps/tauri-action/commit/37e9ece68aebd830aaa7c14c7602d700d8513f6a)([#651](https://www.github.com/tauri-apps/tauri-action/pull/651)) Add support for RPM bundle artifacts, introduced in tauri-bundler@2.0.0-alpha.14
- [`81921ba`](https://www.github.com/tauri-apps/tauri-action/commit/81921ba9d3c8163235d21b262dd0c3ad3fb19029)([#702](https://www.github.com/tauri-apps/tauri-action/pull/702)) Add support for Tauri's new config structure introduced in `2.0.0-beta.0`.

## \[0.4.5]

- [`2b7cd25`](https://www.github.com/tauri-apps/tauri-action/commit/2b7cd25a7d13b4d3bb90a8b0d4423686466120d4)([#598](https://www.github.com/tauri-apps/tauri-action/pull/598)) Fix path resolution for `build.target-dir` if the `.cargo` folder is not in the current working dir.

## \[0.4.4]

- [`9df5eca`](https://www.github.com/tauri-apps/tauri-action/commit/9df5eca322fa3298954fb973a68c65cf2b48aebd) Fixed an issue where the distPath config was not applied after initializing the tauri project.
- [`d9623e3`](https://www.github.com/tauri-apps/tauri-action/commit/d9623e36cbe6b2668d8abc98677e9113a6ace705)([#556](https://www.github.com/tauri-apps/tauri-action/pull/556)) Fixes the artifacts search path when a custom `--profile` is used.
- [`802a179`](https://www.github.com/tauri-apps/tauri-action/commit/802a179bc09148fdf618276fc9f2945ac3797ed2)([#594](https://www.github.com/tauri-apps/tauri-action/pull/594)) If the action initializes the tauri project it will now clear the `beforeBuildCommand` to fix a panic when there was no `build` npm command available.
- [`d00117a`](https://www.github.com/tauri-apps/tauri-action/commit/d00117a2e07c81cc900146e07064ff4b2a8782db)([#558](https://www.github.com/tauri-apps/tauri-action/pull/558)) Fixed an issue reading the app version if it relied on cargo's workspace inheritance feature.

## \[0.4.3]

- [`c87af54`](https://www.github.com/tauri-apps/tauri-action/commit/c87af545bb34bb0b5d981811497ede8d99f5ebd8)([#502](https://www.github.com/tauri-apps/tauri-action/pull/502)) While looking for the tauri directory the action will now respect all gitignore files and not just the one in the root dir.
- [`8e6f88e`](https://www.github.com/tauri-apps/tauri-action/commit/8e6f88e39f9947e2d20a1a23632f93b84e913acb)([#499](https://www.github.com/tauri-apps/tauri-action/pull/499)) The action now prefers release builds for the latest.json file if both, release and debug releases are enabled.
- [`36a1260`](https://www.github.com/tauri-apps/tauri-action/commit/36a12601f6d5fcfbcea27f53a8bb5379327c2a19)([#490](https://www.github.com/tauri-apps/tauri-action/pull/490)) Correctly detect self-hosted macOS-arm64 runners.
- [`8d5274b`](https://www.github.com/tauri-apps/tauri-action/commit/8d5274b2b3f1e03582a13e1d216003a91170b366)([#477](https://www.github.com/tauri-apps/tauri-action/pull/477)) Read config after `tauri init` command and without hardcoding the `tauri.conf.json` path, fixes action failures without error messages on repos without an existing Tauri project.
- [`c87af54`](https://www.github.com/tauri-apps/tauri-action/commit/c87af545bb34bb0b5d981811497ede8d99f5ebd8)([#502](https://www.github.com/tauri-apps/tauri-action/pull/502)) While looking for the tauri directory the action will now consistently prefer files further up in the directory levels.
- [`a21f29a`](https://www.github.com/tauri-apps/tauri-action/commit/a21f29abc6b81c17f754eb105763499be54a1e14)([#516](https://www.github.com/tauri-apps/tauri-action/pull/516)) Fix detection of windows arm64 bundles.

## \[0.4.2]

- [`2eff2b4`](https://www.github.com/tauri-apps/tauri-action/commit/2eff2b4cc16cf4137d15f997a010f7c781c6276b)([#469](https://www.github.com/tauri-apps/tauri-action/pull/469)) Fix incorrect querying of remote repos to prevent duplicate draft releases. This was only an issue if the `owner` and `repo` configs added in v0.4.1 were set to a different repository than the one the action runs in and if `draftRelease` was set to `true`.

## \[0.4.1]

- [`683dc86`](https://www.github.com/tauri-apps/tauri-action/commit/683dc8624e3ea009c0f35ddfb419a40d08718d01)([#457](https://www.github.com/tauri-apps/tauri-action/pull/457)) Add support for modifying the target repo for the release.

## \[0.4.0]

- Add the paths of generated artifacts as an action output.
  - [40e660a](https://www.github.com/tauri-apps/tauri-action/commit/40e660a8ca7dc5e7f5f67710a0212887163c5450) add artifact paths to action output ([#343](https://www.github.com/tauri-apps/tauri-action/pull/343)) on 2022-12-15
- **Breaking change**: Remove broken `configPath` argument in favor of `--config` flag.
  - [240732d](https://www.github.com/tauri-apps/tauri-action/commit/240732d2e73e8144d86d386f61a1a27662710a07) fix!: remove broken `configPath` option ([#428](https://www.github.com/tauri-apps/tauri-action/pull/428)) on 2023-04-30
- Correctly handle `--target` option in `args` input.
  - [a99d0ba](https://www.github.com/tauri-apps/tauri-action/commit/a99d0bae58a558b23da95394a2a38122574b0f78) feat: Support `--target` input in `args` ([#301](https://www.github.com/tauri-apps/tauri-action/pull/301)) on 2022-10-31
  - [c5c0e27](https://www.github.com/tauri-apps/tauri-action/commit/c5c0e27d68a6b6fe1781c02001eaf1596bebe07b) refactor: Merge workspace into single package. ([#362](https://www.github.com/tauri-apps/tauri-action/pull/362)) on 2023-02-06
- Automatically generate `latest.json` file for Tauri's updater using the GitHub release as a CDN.
  - [2846fa8](https://www.github.com/tauri-apps/tauri-action/commit/2846fa8fccaf00cb3d9b3433d18dd7bde8006a22) fix: Replace spaces in asset name with dots, fixes [#345](https://www.github.com/tauri-apps/tauri-action/pull/345) ([#374](https://www.github.com/tauri-apps/tauri-action/pull/374)) on 2023-02-06
- Replace `_` and `.` with `-` in the product name on Linux.
  - [87ceccd](https://www.github.com/tauri-apps/tauri-action/commit/87ceccdc2e3b936d18cefef2ef03c96361b353ce) fix: fileAppName on Linux. Extends [#293](https://www.github.com/tauri-apps/tauri-action/pull/293) ([#310](https://www.github.com/tauri-apps/tauri-action/pull/310)) on 2022-10-08
  - [c5c0e27](https://www.github.com/tauri-apps/tauri-action/commit/c5c0e27d68a6b6fe1781c02001eaf1596bebe07b) refactor: Merge workspace into single package. ([#362](https://www.github.com/tauri-apps/tauri-action/pull/362)) on 2023-02-06
- The action will now use `npm run tauri` instead of `npx tauri` to prevent issues in npm workspaces.
  - [a778402](https://www.github.com/tauri-apps/tauri-action/commit/a778402ba7c66b8a6c7c3ce0a6b9978e867936b5) fix: switch from npx to npm run, closes [#367](https://www.github.com/tauri-apps/tauri-action/pull/367) ([#387](https://www.github.com/tauri-apps/tauri-action/pull/387)) on 2023-03-08
- Fixes usage with `vue-cli-plugin-tauri`.
  - [f7dcc97](https://www.github.com/tauri-apps/tauri-action/commit/f7dcc97c2dbce3e806c3e72c34ff08fd31dd191e) fix(core): vue-cli-plugin-tauri usage, closes [#288](https://www.github.com/tauri-apps/tauri-action/pull/288) ([#289](https://www.github.com/tauri-apps/tauri-action/pull/289)) on 2022-07-05
  - [c5c0e27](https://www.github.com/tauri-apps/tauri-action/commit/c5c0e27d68a6b6fe1781c02001eaf1596bebe07b) refactor: Merge workspace into single package. ([#362](https://www.github.com/tauri-apps/tauri-action/pull/362)) on 2023-02-06
- Correctly handle universal macOS builds in the updater JSON file. The action will now fill out the darwin-aarch64 and darwin-x86\_64 fields with the universal builds. It will always prefer native targets for the respective fields if they exist. Additionaly there's a config to tell the updater to also include a separate darwin-universal field on top of the native fields.
  - [91a6560](https://www.github.com/tauri-apps/tauri-action/commit/91a6560a1665d2cdeaa2964a42b41b8b811f6b88) feat: Handle universal macos in updater json, closes [#444](https://www.github.com/tauri-apps/tauri-action/pull/444) ([#447](https://www.github.com/tauri-apps/tauri-action/pull/447)) on 2023-05-03
  - [fa82b53](https://www.github.com/tauri-apps/tauri-action/commit/fa82b5395accba7944d99014e1a1486b6f084ae3) fix(json): always fill out native macos fields on 2023-05-03
- Add support for the NSIS bundle type introduced in Tauri v1.3. Add setting to switch between nsis and msi in the updater json file.
  - [0ba09ea](https://www.github.com/tauri-apps/tauri-action/commit/0ba09ea554502706c8860b6b2b433a3c42a4d559) feat: Handle nsis builds, closes [#436](https://www.github.com/tauri-apps/tauri-action/pull/436) ([#446](https://www.github.com/tauri-apps/tauri-action/pull/446)) on 2023-05-03
- Automatically read platform specific tauri config files.
  - [4c72e78](https://www.github.com/tauri-apps/tauri-action/commit/4c72e78a8e3c6cd564986c6cec3f2a437ee9c1d1) feat: read platform specific tauri configs ([#399](https://www.github.com/tauri-apps/tauri-action/pull/399)) on 2023-03-21
- Automatically read configs provided via the `-c`/`--config` argument.
  - [2a4a05a](https://www.github.com/tauri-apps/tauri-action/commit/2a4a05a57f182af4b91357d151349822961d45c2) feat: Read --config arg, closes [#346](https://www.github.com/tauri-apps/tauri-action/pull/346) ([#422](https://www.github.com/tauri-apps/tauri-action/pull/422)) on 2023-03-29
- Add support for Tauri's toml-based config (`Tauri.toml`).
  - [06b006d](https://www.github.com/tauri-apps/tauri-action/commit/06b006d1096e9dfb763fea30f206284f909e01a2) feat: Add support for `Tauri.toml` config ([#375](https://www.github.com/tauri-apps/tauri-action/pull/375)) on 2023-02-22
- Add `includeRelease` option to allow disabling release builds.
  - [5ae9606](https://www.github.com/tauri-apps/tauri-action/commit/5ae96069898c22a98adf95be6472516e102cd14d) feat: Add `includeRelease` option to allow for disabling release builds ([#365](https://www.github.com/tauri-apps/tauri-action/pull/365)) on 2023-02-06

## \[0.3.1]

- Added the `bundleIdentifier` input to modify Tauri's default bundle identifier when initializing a new Tauri app.
  - [743a37f](https://www.github.com/tauri-apps/tauri-action/commit/743a37fd53cbdd122910b818b9bef7b7aa019134) feat(core): add bundle identifier option ([#263](https://www.github.com/tauri-apps/tauri-action/pull/263)) on 2022-05-11
- Added support to loading version from JSON file in `tauri.conf.json > package > version`.
  - [16a8f02](https://www.github.com/tauri-apps/tauri-action/commit/16a8f02ad9b4cff2a0ed6205c7418c36f3e49fd0) build(action): rebuild after fixing version parse error ([#268](https://www.github.com/tauri-apps/tauri-action/pull/268)) on 2022-05-28

## \[0.3.0]

- Delete assets from existing release, allowing running the action twice for the same version if an error happens.
  - [1205112](https://www.github.com/tauri-apps/tauri-action/commit/1205112d89ee510722927a791d4d460f9419c71d) fix: workflow fails whenever there's asset with same build name attached on the draft ([#208](https://www.github.com/tauri-apps/tauri-action/pull/208)) on 2022-02-20
- Added support to JSON5 on `tauri.conf.json[5]`.
  - [b9ce5d7](https://www.github.com/tauri-apps/tauri-action/commit/b9ce5d7dc68082d21d30a60103b0ab8c5ddae3a1) feat: add JSON5 support ([#229](https://www.github.com/tauri-apps/tauri-action/pull/229)) on 2022-02-20
- Update to Tauri release candidate.
  - [4d70258](https://www.github.com/tauri-apps/tauri-action/commit/4d7025802c5238ef60a62d33ef8c5378637948bb) fix: Change msi naming scheme for recent Tauri upgrades ([#227](https://www.github.com/tauri-apps/tauri-action/pull/227)) on 2022-02-20
- Added support to Cargo workspaces.
  - [8e430cc](https://www.github.com/tauri-apps/tauri-action/commit/8e430cc7b0fab28f0a7768f2157933c94f8724f6) feat: cargo workspace support, closes [#196](https://www.github.com/tauri-apps/tauri-action/pull/196) ([#198](https://www.github.com/tauri-apps/tauri-action/pull/198)) on 2021-12-10

## \[0.2.0]

- Removed the `preferGlobal` and `npmScript` inputs and added a `tauriScript` option.
  - [a1050c9](https://www.github.com/tauri-apps/tauri-action/commit/a1050c9ec8903fc5c43696da7f07dcfc89475104) refactor: add `tauriScript` input, remove `preferGlobal` and `npmScript` ([#183](https://www.github.com/tauri-apps/tauri-action/pull/183)) on 2021-11-01

## \[0.1.5]

- Fix action bundle.
  - [a226a3d](https://www.github.com/tauri-apps/tauri-action/commit/a226a3da1dfa61b5c4cb764c250224ed5a8a52b8) fix: rebuild github action bundle ([#166](https://www.github.com/tauri-apps/tauri-action/pull/166)) on 2021-09-01

## \[0.1.4]

- Fix `.app` tar being nested in folders
  - [2a35a8a](https://www.github.com/tauri-apps/tauri-action/commit/2a35a8a0243d33e1afc9f197601be3db187826d7) Fix `.app` tar being nested in folders ([#158](https://www.github.com/tauri-apps/tauri-action/pull/158)) on 2021-09-01
- Linux: Upload AppImage updater artifacts if available.
  macOS: Replace `[AppName].app.tgz` to `[AppName].app.tar.gz` to align with updater artifacts.
  - [e7266ff](https://www.github.com/tauri-apps/tauri-action/commit/e7266fff1b42c35bfd7ff359d5c6a91ad1308dea) fix(action): Upload AppImage updater artifacts when available ([#163](https://www.github.com/tauri-apps/tauri-action/pull/163)) on 2021-08-31
- Fix incorrect version being used in release names
  - [110a0c6](https://www.github.com/tauri-apps/tauri-action/commit/110a0c6da6de9aa85c8e3186ad642650ebc95ab0) Fix version lookup ([#160](https://www.github.com/tauri-apps/tauri-action/pull/160)) on 2021-09-01

## \[0.1.3]

- Fixes execution of the `tar` command on `macOS` when the application name has spaces.
  - [b4b20f9](https://www.github.com/tauri-apps/tauri-action/commit/b4b20f94709829e5e974255aa8034c78e70bb5d1) fix(core): command execution ([#132](https://www.github.com/tauri-apps/tauri-action/pull/132)) on 2021-05-11
- Adds `args` option to pass arguments to the tauri command.
  - [f564b01](https://www.github.com/tauri-apps/tauri-action/commit/f564b01e52fbf240e5e5c12577dd10625fe83580) feat: add `args` option, closes [#131](https://www.github.com/tauri-apps/tauri-action/pull/131) ([#134](https://www.github.com/tauri-apps/tauri-action/pull/134)) on 2021-05-13
- Include updater artifacts if available.
  - [0e9704e](https://www.github.com/tauri-apps/tauri-action/commit/0e9704eb73bcadd1c6acb3a2e9a73a100465db58) Add updater artifacts when available ([#129](https://www.github.com/tauri-apps/tauri-action/pull/129)) on 2021-05-13

## \[0.1.2]

- Fixes `Artifacts not found` error on Linux when the `productName` is converted to `kebab-case`.
  - [e6aa180](https://www.github.com/tauri-apps/tauri-action/commit/e6aa1807b6d2c80de70f78fb945e11a659037837) fix(core): product name on Linux is converted to kebab-case ([#125](https://www.github.com/tauri-apps/tauri-action/pull/125)) on 2021-04-29

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
