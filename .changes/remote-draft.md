---
'action': patch
---

Fix incorrect querying of remote repos to prevent duplicate draft releases. This was only an issue if the `owner` and `repo` configs added in v0.4.1 were set to a different repository than the one the action runs in and if `draftRelease` was set to `true`.
