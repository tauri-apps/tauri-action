---
action: patch
---

Reduces memory consumption when uploading successfully built releases, by passing a file stream object rather than reading the entire file into a buffer and then passing that. Empirically, this has stopped the action from failing on GitHub's Windows runners, with apps approaching 2GB in size.
