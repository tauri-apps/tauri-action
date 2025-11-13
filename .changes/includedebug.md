---
action: major
---

**Breaking Change**: Remove `includeRelease` and `includeDebug`. You can switch to debug builds via `args: --debug`. To upload release _and_ debug builds, run `tauri-action` twice, preferably in a job matrix for concurrent builds.
