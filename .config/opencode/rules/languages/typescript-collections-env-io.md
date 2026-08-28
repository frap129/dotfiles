---
globs:
  - "**/*.{ts,tsx,js,mjs,cjs}"
---

# TypeScript Collections, Env, and IO

- Always pass an explicit comparator to `.sort(...)`.
- For env var booleans, use a semantic parser helper. Do not use bare `Boolean(env.X)`.
- Avoid pre-check filesystem calls (`stat`, `access`, `exists`) before the real operation. Perform the operation and handle ENOENT in one catch path.
- Keep error handling deterministic and single-pass; do not add redundant filesystem round-trips.
