---
globs:
  - '**/*.{kt,kts}'
fileContains:
  - 'class '
  - 'interface '
  - 'object '
  - 'object:'
---

# Kotlin Data and Classes

- Use data classes for data.
- Don't abuse primitive types; encapsulate data in composite types.
- Avoid data validation in functions; use classes with internal validation.
- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose (less than 200 instructions, less than 10 public methods, less than 10 properties).
