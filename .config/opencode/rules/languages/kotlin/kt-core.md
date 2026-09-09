---
description: Kotlin core conventions
globs:
  - "**/*.kt"
  - "**/*.kts"
---

# Kotlin Core

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
  - Avoid `Any`; create necessary types.
- Don't leave blank lines within a function.
- Use PascalCase for classes, camelCase for variables and functions, snake_case for file and directory names, UPPERCASE for environment variables.
- Avoid magic numbers; define constants.
- Use complete words instead of abbreviations.
  - Except for standard abbreviations like API, URL.
  - Except for well-known abbreviations: i, j for loop counters, err for errors, ctx for contexts.
- Prefer immutability: `val` over `var`.
