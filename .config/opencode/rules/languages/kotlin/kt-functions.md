---
globs:
  - '**/*.{kt,kts}'
fileContains: 'fun '
---

# Kotlin Functions

- Write short functions with a single purpose (less than 20 instructions).
- Name functions with a verb.
  - Boolean returns: `isX`, `hasX`, `canX`.
  - Unit returns: `executeX`, `saveX`.
- Avoid nesting blocks via early checks and returns, and extraction to utility functions.
- Use higher-order functions (`map`, `filter`, `reduce`) to avoid deep nesting.
  - Use lambda expressions for simple transformations; named functions for anything non-trivial.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters with RO-RO:
  - Use a data class to pass multiple parameters and to return results.
  - Declare types for input arguments and output.
- Use a single level of abstraction.
