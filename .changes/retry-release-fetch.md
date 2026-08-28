---
action: patch
---

`retryAttempts` now also covers fetching/creating the GitHub release. Previously this was the only GitHub API call that was never retried, so a single transient network failure (e.g. a connect timeout) could fail the job after a successful build.
