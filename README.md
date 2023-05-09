# Tauri GitHub Action

This GitHub Action builds your Web application as a Tauri native binary for macOS, Linux and Windows.
If your project doesn't include the Tauri files, we create it at compile time, so if you don't need to use Tauri's API, you can just ship native apps through this Action.

# Usage

This GitHub Action has three main usages: test the build pipeline of your Tauri app, uploading Tauri artifacts to an existing release, and creating a new release with the Tauri artifacts.

## Testing the Build

```yml
name: 'test-on-pr'
on: [pull_request]

jobs:
  test-tauri:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - name: setup node
        uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-20.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      - name: install frontend dependencies
        run: yarn install # change this to npm or pnpm depending on which one you use
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Creating a release and uploading the Tauri bundles

In this example `tauri-action` will create the GitHub release itself. It will build and upload the app bundles to the newly created release.

This is generally the simplest way to release your Tauri app.

```yml
name: 'publish'
on:
  push:
    branches:
      - release

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - name: setup node
        uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-20.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      - name: install frontend dependencies
        run: yarn install # change this to npm or pnpm depending on which one you use
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: app-v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version
          releaseName: 'App v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
```

## Uploading the artifacts to a release

`tauri-action` can also upload app bundles to an existing GitHub release. This workflow uses different actions to create and publish the release. `tauri-action` will only build and upload the app bundles to the specified release.

```yml
name: 'publish'

on: pull_request

jobs:
  create-release:
    permissions:
      contents: write
    runs-on: ubuntu-20.04
    outputs:
      release_id: ${{ steps.create-release.outputs.result }}

    steps:
      - uses: actions/checkout@v3
      - name: setup node
        uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: get version
        run: echo "PACKAGE_VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_ENV
      - name: create release
        id: create-release
        uses: actions/github-script@v6
        with:
          script: |
            const { data } = await github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: `app-v${process.env.PACKAGE_VERSION}`,
              name: `Desktop App v${process.env.PACKAGE_VERSION}`,
              body: 'Take a look at the assets to download and install this app.',
              draft: true,
              prerelease: false
            })
            return data.id

  build-tauri:
    needs: create-release
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-20.04, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - name: setup node
        uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-20.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      - name: install frontend dependencies
        run: yarn install # change this to npm or pnpm depending on which one you use
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}

  publish-release:
    permissions:
      contents: write
    runs-on: ubuntu-20.04
    needs: [create-release, build-tauri]

    steps:
      - name: publish release
        id: publish-release
        uses: actions/github-script@v6
        env:
          release_id: ${{ needs.create-release.outputs.release_id }}
        with:
          script: |
            github.rest.repos.updateRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              release_id: process.env.release_id,
              draft: false,
              prerelease: false
            })
```

## Inputs

### Project Initialization

These inputs are _typically_ only used if your GitHub repo does not contain an existing Tauri project and you want the action to initialize it for you.

| Name               |           Required           | Description                                                                         | Type   | Default |
| ------------------ | :--------------------------: | ----------------------------------------------------------------------------------- | ------ | ------- |
| `projectPath`      |            false             | The path to the root of the tauri project relative to the current working directory | string | .       |
| `distPath`         |            false             | Path to the distributable folder with your index.html and JS/CSS                    | string |         |
| `iconPath`         |            false             | path to the PNG icon to use as app icon, relative to the projectPath                | string |         |
| `bundleIdentifier` | yes, if not set via --config | the bundle identifier to inject when initializing the Tauri app                     | string |         |

### Build Options

These inputs allow you to change how your Tauri project will be build.

| Name                       | Required | Description                                                                                                                                  | Type   | Default                                       |
| -------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| `projectPath`              |  false   | The path to the root of the tauri project relative to the current working directory                                                          | string | .                                             |
| `includeDebug`             |  false   | whether to include a debug build or not                                                                                                      | bool   | false                                         |
| `includeRelease`           |  false   | whether to include a release build or not                                                                                                    | bool   | true                                          |
| `includeUpdaterJson`       |  false   | whether to upload a JSON file for the updater or not (only relevant if the updater is configured)                                            | bool   | true                                          |
| `updaterJsonPreferNsis`    |  false   | whether the action will use the NSIS (setup.exe) or WiX (.msi) bundles for the updater JSON if both types exist                              | bool   | `false` for Tauri v1 and `true` for Tauri v2+ |
| `updaterJsonKeepUniversal` |  false   | whether the updater JSON file should include universal macOS builds as darwin-universal on top of using it in the aarch64 and x86_64 fields. | bool   | false                                         |
| `tauriScript`              |  false   | the script to execute the Tauri CLI. It must not include any args or commands like `build`                                                   | string | `npm run\|pnpm\|yarn tauri`                   |
| `args`                     |  false   | Additional arguments to the current build command                                                                                            | string |                                               |

### Release Configuration

These inputs allow you to modify the GitHub release.

| Name               | Required | Description                                                                                                                                                      | Type   | Default               |
| ------------------ | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------- |
| `releaseId`        |  false   | The id of the release to upload artifacts as release assets                                                                                                      | string |                       |
| `tagName`          |  false   | The tag name of the release to create or the tag of the release belonging to `releaseId`                                                                         | string |                       |
| `releaseName`      |  false   | The name of the release to create                                                                                                                                | string |                       |
| `releaseBody`      |  false   | The body of the release to create                                                                                                                                | string |                       |
| `releaseDraft`     |  false   | Whether the release to create is a draft or not                                                                                                                  | bool   | false                 |
| `prerelease`       |  false   | Whether the release to create is a prerelease or not                                                                                                             | bool   | false                 |
| `releaseCommitish` |  false   | Any branch or commit SHA the Git tag is created from, unused if the Git tag already exists                                                                       | string | SHA of current commit |
| `owner`            |  false   | parameter to replace owner, needed to upload the release to another repository, required GITHUB_TOKEN in env and releaseCommitish(target repo, main for example) | string |                       |
| `repo`             |  false   | parameter to replace repo, needed to upload the release to another repository, required GITHUB_TOKEN in env and releaseCommitish(target repo, main for example)  | string |                       |

## Outputs

| Name               | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `releaseId`        | The ID of the created release                                      |
| `releaseHtmlUrl`   | The URL users can navigate to in order to view the created release |
| `releaseUploadUrl` | The URL for uploading assets to the created release                |
| `artifactPaths`    | The paths of the generated artifacts                               |

# Caveats

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
- If you create the release yourself and provide a `releaseId` but do not set `tagName`, the download url for updater bundles in `latest.json` will point to `releases/latest/download/<bundle>` which can cause issues if your repo contains releases that do not include updater bundles.
