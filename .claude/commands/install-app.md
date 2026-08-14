---
description: Rebuild and reinstall Disk Janitor.app to /Applications
---

Invoke the `install-update` skill to rebuild the app and deploy it to /Applications. The skill handles: kill running instance → pnpm dist → ad-hoc sign → ditto → verify.
