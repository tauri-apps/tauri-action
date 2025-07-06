---
action: patch
---

Added the `assetNamePattern` config that allows setting a template specifying how uploaded assets will be named in the release.
**BREAKING CHANGE:** The default naming scheme will now have the `-debug` suffix at the end (before the extension) on all assets.
