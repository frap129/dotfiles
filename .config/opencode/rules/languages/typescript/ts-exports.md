---
globs:
  - '**/*.{ts,tsx,js,jsx,mjs,cjs}'
fileContains:
  - 'export '
  - 'export{'
  - 'module.exports'
  - 'exports.'
  - 'exports['
---

# TypeScript Exports

- Export only symbols used outside the defining file. Keep internal helpers and implementation-only types unexported.
