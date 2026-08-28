---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---

# Code Hygiene

- Export only symbols used outside the defining file. Keep internal helpers and implementation-only types unexported.
- Remove compatibility code paths once in-repo callers are migrated. Do not keep dead overload signatures.
- If the same extraction or transform appears in multiple places, extract a shared helper in the module that owns the data shape.
- If the same logic appears more than once and differs only by field name or parameter, replace copy/paste with a data-driven loop or shared helper.
- Comments must explain intent, constraints, or tradeoffs. Delete comments that only restate the next line.
