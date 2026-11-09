---
action: patch
---

Fixed an issue that caused the action sometimes use a different `.msi` language in `windows-x86_64` and `windows-x86_64-msi` in `latest.json` when multiple WiX languages were enabled in Tauri's `bundle.windows.wix.language` config.
