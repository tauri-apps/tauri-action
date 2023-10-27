---
'action': patch
---

If the action initializes the tauri project it will now clear the `beforeBuildCommand` to fix a panic when there was no `build` npm command available.
