---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
fileContains: "process.env"
---

# TypeScript Env Booleans

- For env var booleans, use a semantic parser helper. Do not use bare `Boolean(env.X)`.