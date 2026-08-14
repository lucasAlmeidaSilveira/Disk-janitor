---
description: Add a new cleanup category to disk-janitor
argument-hint: [descrição da categoria]
---

Invoke the `add-category` skill to add a new cleanup category. Use the user's description below to decide the tier (safe/caution/review), scan strategy (fixed paths / enumeration / external tool), and clean strategy (trashChildren / trashPath / custom).

After implementing, invoke the `safety-reviewer` agent to verify the 5 safety invariants weren't violated.

Descrição da categoria: $ARGUMENTS
