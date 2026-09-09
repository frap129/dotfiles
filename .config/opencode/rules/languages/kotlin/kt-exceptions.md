---
globs:
  - '**/*.{kt,kts}'
fileContains:
  - 'catch '
  - 'catch('
  - 'throw '
  - 'try {'
  - 'try{'
---

# Kotlin Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to fix an expected problem or add context; otherwise, use a global handler.
