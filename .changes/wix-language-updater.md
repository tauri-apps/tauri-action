---
action: patch
---

Fixed an issue that caused the action sometimes use a different `.msi` language in `x86_64-windows` and `x86_64-windows-msi` in `latest.json` when multiple WiX languages were enabled in Tauri's `bundle.windows.wix.language` config.
