# Tauri GitHub Action

This GitHub Action builds your Tauri application as a native binary for macOS, Linux and Windows and optionally upload it to a GitHub Release.

## Example

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
          - platform: 'ubuntu-22.04'
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
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: install frontend dependencies
        run: yarn install # change this to npm, pnpm or bun depending on which one you use.

      - uses: tauri-apps/tauri-action@v1
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

## Usage

```yml
- uses: tauri-apps/tauri-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    # The id of the release to upload artifacts as release assets.
    # If set, `tagName` and `releaseName` will NOT be considered to find a release.
    #
    # default: unset
    releaseId: ''

    # The tag name of the release to upload/create or the tag of the release belonging to `releaseId`.
    # If this points to an existing release `releaseDraft` must match the status of that release.
    # If `releaseId` is set but this is not, the `latest.json` file will
    # point to `releases/latest/download/<bundle>` instead of the tag.
    #
    # default: unset
    tagName: ''

    # The name of the release to create.
    # Required if `releaseId` is not set and there's no existing release for `tagName`.
    #
    # default: ""
    releaseName: ''

    # The body of the release to create.
    #
    # default: ""
    releaseBody: ''

    # Any branch or commit SHA the Git tag is created from, unused if the Git tag already exists.
    #
    # default: SHA of current commit
    releaseCommitish: ''

    # Whether the release to find or create is a draft or not.
    #
    # default: false
    releaseDraft: false

    # Whether the release to create is a prerelease or not.
    #
    # default: false
    prerelease: false

    # Whether to use GitHub's Release Notes API to generate the release title and body.
    # If `releaseName` is set, it will overwrite the generated title.
    # If `releaseBody` is set, it will be pre-pended to the automatically generated notes.
    # This action is not responsible for the generated content.
    #
    # default: false
    generateReleaseNotes: false

    # The account owner of the repository the release will be uploaded to.
    # Requires `GITHUB_TOKEN` in env and a `releaseCommitish` target if it doesn't match the current repo.
    #
    # default: owner of the current repo
    owner: ''

    # The name of the repository the release will be uploaded to.
    # Requires `GITHUB_TOKEN` in env and a `releaseCommitish` target if it doesn't match the current repo.
    #
    # default: name of the current repo
    repo: ''

    # The base URL of the GitHub API to use.
    # This is useful if you want to use a self-hosted GitHub instance or a GitHub Enterprise server.
    #
    # default: $GITHUB_API_URL or "https://api.github.com"
    githubBaseUrl: ''

    # Whether to run in Gitea compatibility mode. Set this if `githubBaseUrl` targets a Gitea instance,
    # since some API endpoints differ from GitHub.
    # Gitea support is experimental. It was implemented and tested solely by the community.
    #
    # default: false
    isGitea: false

    # The path to the root of the tauri project relative to the current working directory.
    # It must NOT be gitignored. Please open an issue if this causes problems.
    #
    # Relative paths provided via the `--config` flag will be resolved relative to this path.
    #
    # default: ./
    projectPath: ''

    # The number of times to re-try building the app if the initial build fails or uploading assets if the upload fails.
    # Some small internal steps may be re-tried regardless of this config.
    #
    # default: 0
    retryAttempts: 0

    # Whether to upload a JSON file for the updater or not (only relevant if the updater is configured).
    # This file assume you're using the GitHub Release as your updater endpoint.
    #
    # default: true
    uploadUpdaterJson: true

    # Whether the action will use the NSIS (setup.exe) or WiX (.msi) bundles for the updater JSON if both types exist.
    #
    # default: false (for legacy reasons)
    updaterJsonPreferNsis: false

    # The script to execute the Tauri CLI. It must not include any args or commands like `build`.
    # It can also be an absolute path without spaces pointing to a `tauri-cli` binary.
    #
    # default: "npm|pnpm|yarn|bun tauri" or "tauri" if the action had to install the CLI.
    tauriScript: ''

    # Additional arguments to the current tauri build command.
    # Relative paths in the `--config` flag will be resolved relative to `projectPath`.
    #
    # default: ""
    args: ''

    # The naming pattern to use for the uploaded assets.
    #
    # Currently available variables are:
    # - `[name]`: base filename / appname (Product Name)
    # - `[version]`: app version
    # - `[platform]`: target platform (OS)
    # - `[arch]`: target architecture - format differs per platform
    # - `[ext]`: file extension (`.app`, `.dmg`, `.msi`, `.exe`, `.AppImage`, `.deb`, `.rpm`, `.apk`, `.aab`, `.ipa`)
    # - `[mode]`: `debug` or `release` depending on the use of the `--debug` flag.
    # - `[setup]`: `-setup` for the NSIS installer or an empty string for all other types.
    # - `[_setup]`: `_setup` for the NSIS installer or an empty string for all other types.
    # - `[bundle]`: one of `app`, `dmg`, `msi`, `nsis`, `appimage`, `deb`, `rpm`, `apk`, `aab`, `ipa`, `bin`.
    #
    # default: If not set, the names given by Tauri's CLI are kept.
    releaseAssetNamePattern: ''

    # Whether to upload the unbundled executable binary or not. Requires Tauri v2+.
    # To prevent issues with Tauri's `bundle_type` value (used by e.g. the updater) this
    # should only be used with the `--no-bundle` flag.
    # ONLY ENABLE THIS IF YOU KNOW WHAT YOU'RE DOING since Tauri does NOT officially support a portable mode,
    # especially on platforms other than Windows where
    # standalone binaries for GUI applications do not exist.
    #
    # Ref: https://docs.rs/tauri-utils/latest/tauri_utils/platform/fn.bundle_type.html
    #
    # default: false
    uploadPlainBinary: false

    # Whether to upload the bundles and executables as "workflow artifacts".
    # Independent from the release configs.
    # Affected by `uploadPlainBinary`.
    #
    # Ref: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
    #
    # default: false
    uploadWorkflowArtifacts: false

    # The naming pattern to use for uploaded "workflow artifacts".
    # Ignored if `uploadWorkflowArtifacts` is not enabled.
    #
    # See `releaseAssetNamePattern` for a list of replacement variables.
    #
    # Ref: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
    #
    # default: "[platform]-[arch]-[bundle]"
    workflowArtifactNamePattern: ''

    # Whether to upload the .sig files generated by Tauri.
    # Does not affect the `latest.json` generator.
    #
    # default: true
    uploadUpdaterSignatures: true

    # EXPERIMENTAL - Whether to build for mobile or desktop.
    #
    # Effectively changes the build command from `${tauriScript} build`
    # to `${tauriScript} android build` / ` ${tauriScript}ios build`
    #
    # Note that you have to install system dependencies (Xcode, SDKs, etc) yourself.
    # Furthermore, the action does not upload the app to the App Store or Play Store.
    # The .apk and .ipa files can be uploaded to the release or as workflow artifcats, but
    # plain .ipa files are generally useless so uploading them to a release is not recommended.
    #
    # - Can be set to "android" to build for Android. This works on all runners but other
    # required actions typically only work on Ubuntu so we recommend Ubuntu as well.
    # - Can be set to "ios` to build for iOS. This only works on macOS runners.
    # - Any other value will be ignored.
    #
    # default: unset
    mobile: ''
```

## Outputs

| Name               | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `releaseId`        | The ID of the created release                                      |
| `releaseHtmlUrl`   | The URL users can navigate to in order to view the created release |
| `releaseUploadUrl` | The URL for uploading assets to the created release                |
| `artifactPaths`    | The paths of the generated artifacts                               |
| `appVersion`       | The version of the app                                             |

## Tips and Caveats

- You can run custom Tauri CLI scripts with the `tauriScript` option. So instead of running `yarn tauri <COMMAND> <ARGS>` or `npm run tauri <COMMAND> <ARGS>`, we'll execute `${tauriScript} <COMMAND> <ARGS>`.
  - Useful when you need custom build functionality when creating Tauri apps e.g. a `desktop:build` script or if you use `cargo install tauri-cli`.
  - `tauriScript` can also be an absolute file path pointing to a `tauri-cli` binary. The path currently cannot contain spaces.

- If you want to add additional arguments to the build command, you can use the `args` option. For example, if you're setting a specific target for your build, you can specify `args: --target your-target-arch`.

- When your Tauri app is not in the root of the repo, use the `projectPath` input.
  - Usually it will work without it, but the action will install and use a global `@tauri-apps/cli` installation instead of your project's CLI which can cause issues if you also configured `tauriScript` or if you have multiple `tauri.conf.json` files in your repo.
  - Additionally, relative paths provided via the `--config` flag will be resolved relative to the `projectPath` to match Tauri's behavior.
  - The path must NOT be gitignored. Please open an issue if this causes you problems.

- If `releaseId` is set, the action will use this release to upload assets to. If `tagName` is set the action will try to find an existing release for that tag. If there's none, the action requires `releaseName` to create a new release for the specified `tagName`.

- If you create the release yourself and provide a `releaseId` but do not set `tagName`, the download url for updater bundles in `latest.json` will point to `releases/latest/download/<bundle>` which can cause issues if your repo contains releases that do not include updater bundles.

- If you provide a `tagName` to an existing release, `releaseDraft` must be set to `true` if the existing release is a draft.

- If you only want to build the app without having the action upload any assets, for example if you want to only use [`actions/upload-artifact`](https://github.com/actions/upload-artifact), simply omit `tagName`, `releaseName` and `releaseId`.

- Only enable `uploadPlainBinary` if you are sure what you're doing since Tauri doesn't officially support a portable mode, especially on platforms other than Windows where standalone binaries for GUI applications basically do not exist.

- Gitea support is experimental. It was implemented and tested solely by the community.

- `uploadWorkflowArtifacts` will likely be removed once [actions/upload-artifact#331](https://github.com/actions/upload-artifact/issues/331) lands.

- `[setup]` can be used to differenciate between the NSIS installer and the binary from `uploadPlainBinary` (both have the `.exe` extension).

- `[bundle]` is likely only useful for `workflowArtifactNamePattern` and _not_ for `releaseAssetNamePattern` because of its conflict with `[ext]`.

- The action's iOS and Android support is considered experimental, please report any issues or feedback you may have in this repository.

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
