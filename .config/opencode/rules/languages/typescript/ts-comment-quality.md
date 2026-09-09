---
globs:
  - '**/*.{ts,tsx,js,jsx,mjs,cjs}'
fileContains:
  - '//'
  - '/*'
---

# Comment Quality

- Comment only the non-obvious: intent, tradeoffs, quirks, constraints, invariants, legacy formats, or why the obvious approach was not taken.
- Delete comments that restate the code. No headers, dividers, step narration, or JSDoc that paraphrases the name.
- When code goes, its comments go with it.
