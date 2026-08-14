---
name: add-category
description: Guides adding a new cleanup category to disk-janitor. TRIGGER when the user asks to "add a category", "add cleanup for X", "add support for cleaning Y", or similar. The single extension point is src/main/domain/categories.ts — no UI/IPC/preload changes needed.
---

# Add a category to disk-janitor

Adding a category is **one file change** in most cases: `src/main/domain/categories.ts`. The UI, IPC, and preload are all data-driven.

## Decide the tier

Ask the user (or infer):

- 🟢 `safe` — cache or regenerable data. No login lost. No user files.
- 🟡 `caution` — may invalidate local sessions or offline caches. User data at risk only if they trash the wrong item.
- 🔴 `review` — involves user's own files. Item-by-item selection required.

## Decide the scan strategy

Which fits?

- **Fixed paths** (like Spotify cache, npm cache): reuse `measureTargets(TARGETS)` with a `Target[]` const.
- **Enumeration** (like `/Applications/*.app` or `~/Downloads/*.dmg`): write a scanner in `src/main/infra/<name>.ts` returning `ScanItem[]`.
- **External tool** (like `docker system df` or `mdfind`): wrap the tool in `src/main/infra/<name>.ts`.

## Decide the clean strategy

- **Trash children of a dir**: `cleanItem: (item) => trashChildren(item.path)` (works for cache dirs)
- **Trash single file**: `cleanItem: (item) => trashPath(item.path)` (works for individual files)
- **External tool**: `cleanItem: async (item) => { ... custom logic ... }` (like Docker's `pruneDocker()`)
- **Filtered iteration**: iterate children, skip some, trash rest (like wallpaper's `activeWallpaperIds` filter)

## Checklist

1. Add scan infra if needed → `src/main/infra/<name>.ts`
2. Import in `src/main/domain/categories.ts`
3. Add entry to `CATEGORIES` array:
   ```ts
   {
     meta: {
       id: '<kebab-case-id>',
       label: '<Nome em pt-BR>',
       description: '<Descrição curta em pt-BR>',
       tier: 'safe' | 'caution' | 'review',
       icon: '<lowercase-key>',
     },
     scan: () => scanFn(),
     cleanItem: (item) => cleanFn(item),
   }
   ```
4. If new icon needed, add to `ICONS` map in `src/renderer/components/CategoryCard.tsx` (import from `lucide-react`).
5. Verify:
   - `pnpm typecheck`
   - Restart `pnpm dev` (main process needs reload) and open the new category card

## Safety reminders (CLAUDE.md invariants)

- Any `cleanItem` must use `trashPath` / `trashChildren` — never `fs.unlink`, `rimraf`, `rm`.
- If you accept a path from the scan and turn it into a delete call, it's already whitelisted (scan returns paths from your controlled targets). But if you introduce user input, call `assertAllowed(path)` first.
- If you write a new infra module that calls shell, use `run`/`tryRun` from `src/main/infra/shell.ts` (uses `execFile`, not `exec`).

## After adding

Invoke the `safety-reviewer` agent to check the invariants weren't violated.
