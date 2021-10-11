# Tauri GitHub Action

This GitHub Action builds your Web application as a Tauri native binary for MacOS, Linux and Windows.
If your project doesn't include the Tauri files, we create it at compile time, so if you don't need to use Tauri's API, you can just ship native apps through this Action.

# Usage

This GitHub Action has three main usages: test the build pipeline of your Tauri app, uploading Tauri artifacts to an existing release, and creating a new release with the Tauri artifacts.

## Testing the Build

```yml
name: "test-on-pr"
on: [pull_request]

jobs:
  test-tauri:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
    - uses: actions/checkout@v2
    - name: setup node
      uses: actions/setup-node@v1
      with:
        node-version: 12
    - name: install Rust stable
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    - name: install webkit2gtk (ubuntu only)
      if: matrix.platform == 'ubuntu-latest'
      run: |
        sudo apt-get update
        sudo apt-get install -y webkit2gtk-4.0
    - name: install app dependencies and build it
      run: yarn && yarn build
    - uses: tauri-apps/tauri-action@v0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Creating a release and uploading the Tauri bundles

```yml
name: "publish"
on:
  push:
    branches:
      - release

jobs:
  publish-tauri:
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
    - uses: actions/checkout@v2
    - name: setup node
      uses: actions/setup-node@v1
      with:
        node-version: 12
    - name: install Rust stable
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    - name: install webkit2gtk (ubuntu only)
      if: matrix.platform == 'ubuntu-latest'
      run: |
        sudo apt-get update
        sudo apt-get install -y webkit2gtk-4.0
    - name: install app dependencies and build it
      run: yarn && yarn build
    - uses: tauri-apps/tauri-action@v0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tagName: app-v__VERSION__ # the action automatically replaces \_\_VERSION\_\_ with the app version
        releaseName: "App v__VERSION__"
        releaseBody: "See the assets to download this version and install."
        releaseDraft: true
        prerelease: false
```

## Uploading the artifacts to a release

Note that `actions/create-release` isn't maintained so you should find an alternative or let the Tauri Action handle the release.

```yml
name: "test-on-pr"
on: [pull_request]

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      RELEASE_UPLOAD_ID: ${{ steps.create_release.outputs.id }}

    steps:
      - uses: actions/checkout@v2
      - name: setup node
        uses: actions/setup-node@v1
        with:
          node-version: 12
      - name: get version
        run: echo "PACKAGE_VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_ENV
      - name: create release
        id: create_release
        uses: actions/create-release@v1.1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: app-v${{ env.PACKAGE_VERSION }}
          release_name: "Desktop app v${{ env.PACKAGE_VERSION }}"
          body: "See the assets to download this version and install."
          draft: true
          prerelease: false
  build-tauri:
    needs: create-release
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}
    steps:
    - uses: actions/checkout@v2
    - name: setup node
      uses: actions/setup-node@v1
      with:
        node-version: 12
    - name: install Rust stable
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    - name: install webkit2gtk (ubuntu only)
      if: matrix.platform == 'ubuntu-latest'
      run: |
        sudo apt-get update
        sudo apt-get install -y webkit2gtk-4.0
    - name: install app dependencies and build it
      run: yarn && yarn build
    - uses: tauri-apps/tauri-action@v0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        releaseId: ${{ needs.create-release.outputs.RELEASE_UPLOAD_ID }}
```

## Inputs

| Name               | Required | Description                                                                                 | Type   | Default               |
| ------------------ | :------: | ------------------------------------------------------------------------------------------- | ------ | --------------------- |
| `projectPath`      |  false   | Path to the root of the project that will be built                                          | string | .                     |
| `configPath`       |  false   | Path to the tauri.conf.json file if you want a configuration different from the default one | string | tauri.conf.json       |
| `distPath`         |  false   | Path to the distributable folder with your index.html and JS/CSS                            | string |                       |
| `releaseId`        |  false   | The id of the release to upload artifacts as release assets                                 | string |                       |
| `tagName`          |  false   | The tag name of the release to create                                                       | string |                       |
| `releaseName`      |  false   | The name of the release to create                                                           | string |                       |
| `releaseBody`      |  false   | The body of the release to create                                                           | string |                       |
| `releaseDraft`     |  false   | Whether the release to create is a draft or not                                             | bool   | false                 |
| `prerelease`       |  false   | Whether the release to create is a prerelease or not                                        | bool   | false                 |
| `releaseCommitish` |  false   | Any branch or commit SHA the Git tag is created from, unused if the Git tag already exists  | string | SHA of current commit |
| `iconPath`         |  false   | path to the PNG icon to use as app icon, relative to the projectPath                        | string |                       |
| `includeDebug`     |  false   | whether to include a debug build or not                                                     | bool   |                       |
| `npmScript`        |  false   | the package.json script to run to build the Tauri app                                       | string |                       |

## Outputs

| Name               | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `releaseId`        | The ID of the created release                                      |
| `releaseHtmlUrl`   | The URL users can navigate to in order to view the created release |
| `releaseUploadUrl` | The URL for uploading assets to the created release                |

# Caveats

- You can use this Action on a repo that doesn't have Tauri configured. We automatically initialize Tauri before building, and configure it to use your Web artifacts.
  - You can configure Tauri with the `configPath`, `distPath` and `iconPath` options.
- You can run custom NPM scripts with the `npmScript` option. So instead of running `yarn tauri build` or `npx tauri build`, we'll execute `yarn ${npmScript}`.
  - Useful when you need custom build functionality when creating Tauri apps e.g. a `desktop:build` script.
- When your app isn't on the root of the repo, use the `projectPath` input.
