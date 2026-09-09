---
globs:
  - '**/*.py'
fileContains:
  - 'isinstance('
  - 'def parse'
  - 'def validate'
---

# Python Validation

- Validators/parsers should accept `object`, narrow with `isinstance`, and raise `TypeError` for unexpected types.
