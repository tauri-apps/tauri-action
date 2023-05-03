---
'action': patch
---

Correctly handle universal macOS builds in the updater JSON file. Unless disabled it will add the universal builds to the darwin-aarch64 and darwin-x86_64 fields instead of darwin-universal. It will always prefer native targets for the respective fields if they exist.
