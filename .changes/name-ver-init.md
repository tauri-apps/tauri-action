---
action: 'minor'
---

**Breaking:** The action no longer tries to read a package.json file for the app name and version when initializing a tauri app. Use the `appName` and `appVersion` input arguments or the `--config` flag.
