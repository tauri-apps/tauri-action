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
  create-release:
    runs-on: ubuntu-latest
    outputs:
      RELEASE_UPLOAD_URL: ${{ steps.create_tauri_release.outputs.upload_url }}

    steps:
      - uses: actions/checkout@v2
      - name: setup node
        uses: actions/setup-node@v1
        with:
          node-version: 12
      - name: get version
        run: echo ::set-env name=PACKAGE_VERSION::$(node -p "require('./package.json').version")
      - name: create release
        id: create_tauri_release
        uses: jbolda/create-release@v1.1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: example-v${{ env.PACKAGE_VERSION }}
          release_name: "Desktop app v${{ env.PACKAGE_VERSION }}"
          body: "See the assets to download this version and install."
          draft: true
          prerelease: false

  build:
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
        uploadUrl: ${{ needs.create-release.outputs.RELEASE_UPLOAD_URL }}
```

## Inputs

| Name          | Required | Description                                                                                 | Type   | Default         |
| ------------- | :------: | ------------------------------------------------------------------------------------------- | ------ | --------------- |
| `projectPath` |  false   | Path to the root of the project that will be built                                          | string | .               |
| `configPath`  |  false   | Path to the tauri.conf.json file if you want a configuration different from the default one | string | tauri.conf.json |
| `distPath`    |  false   | Path to the distributable folder with your index.html and JS/CSS                            | string |                 |
| `releaseId`   |  false   | The id of the release to upload the assets                                                  | number |                 |
| `uploadUrl`   |  false   | The URL for uploading assets to the release                                                 | string |                 |
