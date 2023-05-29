---
action: patch:bug
---

Read config after `tauri init` command and without hardcoding the `tauri.conf.json` path, fixes action failures without error messages on repos without an existing Tauri project.
