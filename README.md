# Tauri GitHub Action

This GitHub Action builds your Web application as a Tauri native binary for MacOS, Linux and Windows.
If your project doesn't include the Tauri files, we create it at compile time, so if you don't need to use Tauri's API, you can just ship native apps through this Action.

# Example workflow

This workflow builds `Tauri` desktop apps and uploads the artifacts to a GitHub Release.

```yml
name: "publish"
on:
  push:
    branches:
      - latest

jobs:
  build:
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
    - name: install tauri bundler
      run: cargo install tauri-bundler --force
    - name: install webkit2gtk (ubuntu only)
      if: matrix.platform == 'ubuntu-latest'
      run: |
        sudo apt-get update
        sudo apt-get install -y webkit2gtk-4.0
    - name: build action
      run: |
        yarn
        yarn build
    - name: install app dependencies and build it
      run: yarn && yarn build
    - uses: tauri-apps/tauri-action
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with: 
        tagName: app-v__VERSION__
        releaseName: "App v__VERSION__"
        releaseBody: "See the assets to download this version and install."
        releaseDraft: true
        prerelease: false
```

## Inputs

| Name               | Required | Description                                                                                 | Type   | Default               |
| ------------------ | :------: | ------------------------------------------------------------------------------------------- | ------ | --------------------- |
| `projectPath`      |  false   | Path to the root of the project that will be built                                          | string | .                     |
| `configPath`       |  false   | Path to the tauri.conf.json file if you want a configuration different from the default one | string | tauri.conf.json       |
| `distPath`         |  false   | Path to the distributable folder with your index.html and JS/CSS                            | string |                       |
| `uploadUrl`        |  false   | The URL for uploading assets to the release                                                 | string |                       |
| `tagName`          |  false   | The tag name of the release to create                                                       | string |                       |
| `releaseName`      |  false   | The name of the release to create                                                           | string |                       |
| `releaseBody`      |  false   | The body of the release to create                                                           | string |                       |
| `releaseDraft`     |  false   | Whether the release to create is a draft or not                                             | bool   | false                 |
| `prerelease`       |  false   | Whether the release to create is a prerelease or not                                        | bool   | false                 |
| `releaseCommitish` |  false   | Any branch or commit SHA the Git tag is created from, unused if the Git tag already exists  | string | SHA of current commit |
| `iconPath`         |  false   | path to the PNG icon to use as app icon, relative to the projectPath                        | string |                       |

## Outputs

| Name               | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `releaseId`        | The ID of the created release                                      |
| `releaseHtmlUrl`   | The URL users can navigate to in order to view the created release |
| `releaseUploadUrl` | The URL for uploading assets to the created release                |
