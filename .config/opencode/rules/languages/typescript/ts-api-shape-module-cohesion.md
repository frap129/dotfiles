---
globs:
  - "**/*.{ts,tsx,js,mjs,cjs}"
---

# API Shape and Module Cohesion

- Prefer one explicit function contract over compatibility unions like `A | B` for migrated APIs.
- If a function takes more than three parameters and most values come from one source object, pass a typed object instead of many positional args.
- Keep each module cohesive. If new logic belongs to a different responsibility, create a focused module instead of extending a catch-all file.
- Before adding new code to a large utility file, check whether the change should be extracted first.
