---
name: install-update
description: Rebuilds and reinstalls the Disk Janitor .app into /Applications/. TRIGGER when the user asks to "update the installed app", "reinstall", "atualizar o app", or wants their code changes reflected in the app launched from Launchpad/Spotlight. Not for iterating (use `pnpm dev` for that).
---

# Update installed Disk Janitor.app

This runs the full pipeline: kill running instance → build → sign → deploy.

## Preflight

1. Confirm you're at `~/disk-janitor`. If not, `cd` there first.
2. Ask the user to save any in-progress work (the app will close mid-flow).

## Run

```bash
cd ~/disk-janitor
pkill -f "Disk Janitor" 2>/dev/null ; sleep 1
pnpm dist
codesign --deep --force --sign - "dist/mac-arm64/Disk Janitor.app"
ditto "dist/mac-arm64/Disk Janitor.app" "/Applications/Disk Janitor.app"
open "/Applications/Disk Janitor.app"
```

Step by step:

1. **`pkill`** — closes any running instance (the app was running from `/Applications/`, needs to be closed to overwrite).
2. **`pnpm dist`** — runs `pnpm build` (electron-vite) then `electron-builder --mac --arm64 --dir` → produces `dist/mac-arm64/Disk Janitor.app`.
3. **`codesign --deep --force --sign -`** — ad-hoc signature. **Required on Apple Silicon** or the .app fails to launch with "damaged" error. electron-builder doesn't do this automatically when `identity: null`.
4. **`ditto`** — macOS-safe recursive copy (better than `cp -R` for preserving metadata/attrs). Overwrites the previous install.
5. **`open`** — verifies the new binary launches.

## Verify

- Dock icon should be Disk Janitor's blue ring (no white halo — dev-mode artifact).
- Window should reflect any UI changes.
- If launched from Spotlight or Launchpad after this, will use the new binary.

## When it fails

- **"cannot verify developer" from Gatekeeper**: only happens if the .app was AirDropped/downloaded. Since it was built locally, no quarantine attribute. If it does happen: `xattr -dr com.apple.quarantine "/Applications/Disk Janitor.app"`.
- **`pnpm dist` fails on typecheck**: run `pnpm typecheck` first and fix errors.
- **`.app` won't launch**: check `codesign -dv "/Applications/Disk Janitor.app"` — should say `Signature=adhoc`. If not, re-run the codesign step.

## Report back

- Show the size of the deployed `.app` (`du -sh`)
- Confirm process is running (`ps aux | grep "Disk Janitor" | grep -v grep | wc -l` should be ≥1)
