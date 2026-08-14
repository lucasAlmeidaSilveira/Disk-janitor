---
description: Run pnpm typecheck (main + renderer) and summarize errors
---

Run `pnpm typecheck` from the project root and report:
- ✅ If it passes: one-line confirmation.
- ❌ If it fails: list each error grouped by file, with file:line references and a one-line description. Don't paste raw tsc output.

If errors are in `src/shared/ipc-contract.ts`, also warn that main and renderer both consume it — verify both sides.
