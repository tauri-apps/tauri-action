<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Create a JavaScript Action using TypeScript

Use this template to bootstrap the creation of a JavaScript action.:rocket:

This template includes compilication support, tests, a validation workflow, publishing, and versioning guidance.  

If you are new, there's also a simpler introduction.  See the [Hello World JavaScript Action](https://github.com/actions/hello-world-javascript-action)

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      RELEASE_ID: ${{ steps.create_tauri_release.outputs.upload_id }}

Click the `Use this Template` and provide the new repo details for your action

## Code in Master

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
        releaseId: ${{ needs.create-release.outputs.RELEASE_ID }}
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run pack
```

| Name          | Required | Description                                                                                 | Type   | Default         |
| ------------- | :------: | ------------------------------------------------------------------------------------------- | ------ | --------------- |
| `projectPath` |  false   | Path to the root of the project that will be built                                          | string | .               |
| `configPath`  |  false   | Path to the tauri.conf.json file if you want a configuration different from the default one | string | tauri.conf.json |
| `distPath`    |  false   | Path to the distributable folder with your index.html and JS/CSS                            | string |                 |
| `releaseId`   |  false   | The id of the release to upload the assets                                                  | number |                 |

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Change action.yml

The action.yml contains defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your action.

See the [documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

## Change the Code

Most toolkit and CI/CD operations involve async operations so the action is run in an async function.

```javascript
import * as core from '@actions/core';
...

async function run() {
  try { 
      ...
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
```

See the [toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) for the various packages.

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run pack
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Your action is now published! :rocket: 

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml)])

```yaml
uses: ./
with:
  milliseconds: 1000
```

See the [actions tab](https://github.com/actions/javascript-action/actions) for runs of this action! :rocket:

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
