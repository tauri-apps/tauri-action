# Tauri GitHub Action

This GitHub Action builds your Tauri application as a native binary for macOS, Linux and Windows and optionally upload it to a GitHub Release.

If your project doesn't include a Tauri project, the action can initialize it for you, so if you don't need to use Tauri's API, you can just ship native apps through this Action without making changes to your web app.

## Usage

**_For more workflow examples, check out the [examples](examples) directory._**

This GitHub Action has three main usages: test the build pipeline of your Tauri app, uploading Tauri artifacts to an existing release, and creating a new release with the Tauri artifacts.

This example shows the most common use case for `tauri-action`. The action will build the app, create a GitHub release itself, and upload the app bundles to the newly created release.

This is generally the simplest way to release your Tauri app.

```yml
name: 'publish'

on:
  push:
    branches:
      - release

# This workflow will trigger on each push to the `release` branch to create or update a GitHub release, build your app, and upload the artifacts to the release.

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest' # for Arm based macs (M1 and above).
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest' # for Intel based macs.
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04' # for Tauri v1 you could replace this with ubuntu-20.04.
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          # Those targets are only used on macos runners so it's in an `if` to slightly speed up windows and linux builds.
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04' # This must match the platform value defined above.
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
        # webkitgtk 4.0 is for Tauri v1 - webkitgtk 4.1 is for Tauri v2.
        # You can remove the one that doesn't apply to your app to speed up the workflow a bit.

      - name: install frontend dependencies
        run: yarn install # change this to npm, pnpm or bun depending on which one you use.

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: app-v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version.
          releaseName: 'App v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

## Inputs

### Project Initialization

These inputs are only used if your GitHub repository does not contain an existing Tauri project and you want the action to initialize it for you.

| Name               |           Required           | Description                                                                         | Type   | Default |
| ------------------ | :--------------------------: | ----------------------------------------------------------------------------------- | ------ | ------- |
| `projectPath`      |            false             | The path to the root of the tauri project relative to the current working directory | string | .       |
| `distPath`         |            false             | Path to the distributable folder with your index.html and JS/CSS                    | string |         |
| `iconPath`         |            false             | path to the PNG icon to use as app icon, relative to the projectPath                | string |         |
| `bundleIdentifier` | yes, if not set via --config | The bundle identifier to inject when initializing the Tauri app                     | string |         |
| `appName`          | yes, if not set via --config | The app name identifier to inject when initializing the Tauri app                   | string |         |
| `appVersion`       | yes, if not set via --config | The app version to inject when initializing the Tauri app                           | string |         |

### Build Options

These inputs allow you to change how your Tauri project will be build.

| Name                       | Required | Description                                                                                                                                                        | Type   | Default                                                                        |
| -------------------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| `projectPath`              |  false   | The path to the root of the tauri project relative to the current working directory                                                                                | string | .                                                                              |
| `includeDebug`             |  false   | whether to include a debug build or not                                                                                                                            | bool   | false                                                                          |
| `includeRelease`           |  false   | whether to include a release build or not                                                                                                                          | bool   | true                                                                           |
| `includeUpdaterJson`       |  false   | whether to upload a JSON file for the updater or not (only relevant if the updater is configured)                                                                  | bool   | true                                                                           |
| `updaterJsonPreferNsis`    |  false   | whether the action will use the NSIS (setup.exe) or WiX (.msi) bundles for the updater JSON if both types exist                                                    | bool   | `false`. May be changed to `true` for projects using `tauri@v2` in the future. |
| `updaterJsonKeepUniversal` |  false   | whether the updater JSON file should include universal macOS builds as darwin-universal on top of using it in the aarch64 and x86_64 fields.                       | bool   | false                                                                          |
| `tauriScript`              |  false   | the script to execute the Tauri CLI. It must not include any args or commands like `build`                                                                         | string | `npm run\|pnpm\|yarn tauri`                                                    |
| `args`                     |  false   | Additional arguments to the current build command                                                                                                                  | string |                                                                                |
| `retryAttempts`            |  false   | The number of times to re-try building the app if the initial build fails. For now this only affects `tauri build` but may include the upload steps in the future. | number | 0                                                                              |

### Release Configuration

These inputs allow you to modify the GitHub release.

| Name                   | Required | Description                                                                                                                                                                                                                                                                                      | Type   | Default                                     |
| ---------------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------- |
| `releaseId`            |  false   | The id of the release to upload artifacts as release assets. If set, `tagName` and `releaseName` will not be considered to find a release.                                                                                                                                                       | number |                                             |
| `tagName`              |  false   | The tag name of the release to upload/create or the tag of the release belonging to `releaseId`                                                                                                                                                                                                  | string |                                             |
| `releaseName`          |  false   | The name of the release to create. Required if there's no existing release for `tagName`                                                                                                                                                                                                         | string |                                             |
| `releaseBody`          |  false   | The body of the release to create                                                                                                                                                                                                                                                                | string |                                             |
| `releaseDraft`         |  false   | Whether the release to find or create is a draft or not                                                                                                                                                                                                                                          | bool   | false                                       |
| `prerelease`           |  false   | Whether the release to create is a prerelease or not                                                                                                                                                                                                                                             | bool   | false                                       |
| `releaseCommitish`     |  false   | Any branch or commit SHA the Git tag is created from, unused if the Git tag already exists.                                                                                                                                                                                                      | string | SHA of current commit                       |
| `generateReleaseNotes` |  false   | Whether to use GitHub's Release Notes API to generate the release title and body. If `releaseName` is set, it will overwrite the generated title. If `releaseBody` is set, it will be pre-pended to the automatically generated notes. This action is not responsible for the generated content. | bool   | false                                       |
| `owner`                |  false   | The account owner of the repository the release will be uploaded to. Requires `GITHUB_TOKEN` in env and a `releaseCommitish` target if it doesn't match the current repo.                                                                                                                        | string | owner of the current repo                   |
| `repo`                 |  false   | The name of the repository the release will be uploaded to. Requires `GITHUB_TOKEN` in env and a `releaseCommitish` target if it doesn't match the current repo.                                                                                                                                 | string | name of the current repo                    |
| `githubBaseUrl`        |  false   | The base URL of the GitHub API to use. This is useful if you want to use a self-hosted GitHub instance or a GitHub Enterprise server.                                                                                                                                                            | string | `$GITHUB_API_URL` or https://api.github.com |
| `isGitea`              |  false   | Whether to run in Gitea compatibility mode. Set this if `githubBaseUrl` targets a Gitea instance, since some API endpoints differ from GitHub.                                                                                                                                                   | bool   | false                                       |
| `assetNamePattern`     |  false   | The naming pattern to use for the uploaded assets. If not set, the names given by Tauri's CLI are kept.                                                                                                                                                                                          | string | none                                        |
| `uploadPlainBinary`    |  false   | Whether to upload the unbundled executable binary or not. Requires Tauri v2+. To prevent issues with Tauri's [`bundle_type`](https://docs.rs/tauri-utils/latest/tauri_utils/platform/fn.bundle_type.html) value this should only be used with the `--no-bundle` flag.                            | bool   | false                                       |

## Outputs

| Name               | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `releaseId`        | The ID of the created release                                      |
| `releaseHtmlUrl`   | The URL users can navigate to in order to view the created release |
| `releaseUploadUrl` | The URL for uploading assets to the created release                |
| `artifactPaths`    | The paths of the generated artifacts                               |
| `appVersion`       | The version of the app                                             |

## Tips and Caveats

- You can use this Action on a repo that doesn't have Tauri configured. We automatically initialize Tauri before building, and configure it to use your Web artifacts.
  - You can configure the project initialization with the `distPath` and `iconPath` options.
  - If you need to further customize the default `tauri.conf.json` file you can add a custom config that will be merged with the default one at build time.
    - `args: --config custom-config.json`
- You can run custom Tauri CLI scripts with the `tauriScript` option. So instead of running `yarn tauri <COMMAND> <ARGS>` or `npm run tauri <COMMAND> <ARGS>`, we'll execute `${tauriScript} <COMMAND> <ARGS>`.
  - Useful when you need custom build functionality when creating Tauri apps e.g. a `desktop:build` script.
  - `tauriScript` can also be an absolute file path pointing to a `tauri-cli` binary. The path currently cannot contain spaces.
- If you want to add additional arguments to the build command, you can use the `args` option. For example, if you're setting a specific target for your build, you can specify `args: --target your-target-arch`.
- When your Tauri app is not in the root of the repo, use the `projectPath` input.
  - Usually it will work without it, but the action will install and use a global `@tauri-apps/cli` installation instead of your project's CLI which can cause issues if you also configured `tauriScript` or if you have multiple `tauri.conf.json` files in your repo.
  - Additionally, relative paths provided via the `--config` flag will be resolved relative to the `projectPath` to match Tauri's behavior.
- If `releaseId` is set, the action will use this release to upload assets to. If `tagName` is set the action will try to find an existing release for that tag. If there's none, the action requires `releaseName` to create a new release for the specified `tagName`.
- If you create the release yourself and provide a `releaseId` but do not set `tagName`, the download url for updater bundles in `latest.json` will point to `releases/latest/download/<bundle>` which can cause issues if your repo contains releases that do not include updater bundles.
- If you provide a `tagName` to an existing release, `releaseDraft` must be set to `true` if the existing release is a draft.
- If you only want to build the app without having the action upload any assets, for example if you want to only use [`actions/upload-artifact`](https://github.com/actions/upload-artifact), simply omit `tagName`, `releaseName` and `releaseId`.
- Only enable `uploadPlainBinary` if you are sure what you're doing since Tauri doesn't officially support a portable mode, especially on platforms other than Windows where standalone binaries for GUI applications basically do not exist.
- `assetNamePattern` offers a few variables that will be replaced automatically if encapsulated in `[]`. Currently available variables are: `[name]`, `[version]`, `[platform]`, `[arch]`, `[mode]`, `[setup]`, `[_setup]`, `[ext]`.
  - `[mode]` will be replaced with `debug` or `release`, depending on `includeDebug` and `includeRelease`.
  - `[setup]` will be replaced with `-setup` which can be used to differenciate between the NSIS installer and the binary from `uploadPlainBinary`. For all other bundle types it will be an empty string.
  - `[_setup]` behaves like `[setup]` but with `_setup` instead of `-setup`.
- Gitea support is experimental. It was implemented and tested solely by the community.

## Partners

<table>
  <tbody>
    <tr>
      <td align="center" valign="middle">
        <a href="https://crabnebula.dev" target="_blank">
          <img src=".github/sponsors/crabnebula.svg" alt="CrabNebula" width="283">
        </a>
      </td>
    </tr>
  </tbody>
</table>

For the complete list of sponsors please visit our [website](https://tauri.app#sponsors) and [Open Collective](https://opencollective.com/tauri).
