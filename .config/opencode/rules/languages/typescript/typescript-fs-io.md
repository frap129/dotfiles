---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
fileContains:
  - "existsSync"
  - "statSync"
  - "accessSync"
  - "fs.stat"
  - "fs.access"
  - "fs.exists"
---

# TypeScript Filesystem IO

- Avoid pre-check filesystem calls (`stat`, `access`, `exists`) before the real operation. Perform the operation and handle ENOENT in one catch path.
- Keep error handling deterministic and single-pass; do not add redundant filesystem round-trips.