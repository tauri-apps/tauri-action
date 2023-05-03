---
'action': patch
---

Correctly handle universal macOS builds in the updater JSON file. The action will now fill out the darwin-aarch64 and darwin-x86_64 fields with the universal builds. It will always prefer native targets for the respective fields if they exist. Additionaly there's a config to tell the updater to also include a separate darwin-universal field on top of the native fields.
