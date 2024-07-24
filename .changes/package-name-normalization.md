---
action: patch
---

Fixed an issue that caused the action to not generate `latest.json` due to a desync between GitHub artifacts and local variables. This was caused by incorrect normalization of artifact file names, specifically not accounting for removing special characters.