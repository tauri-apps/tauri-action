---
"action": patch
---

Uploaded assets break when `data` receives `fs.readFileSync(assetPath).toString()` even though types suggest it. Giving it a Buffer fixes the issue.
