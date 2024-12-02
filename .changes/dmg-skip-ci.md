---
action: patch
---

The action will now set `TAURI_BUNDLER_DMG_IGNORE_CI: true` by default on tauri cli versions 2.2.0 and above. See https://github.com/tauri-apps/tauri-action/issues/740 for context. This can be disabled by explicitly setting `TAURI_BUNDLER_DMG_IGNORE_CI: false` yourself.
