---
globs:
  - "**/tests/**/*.py"
  - "**/test/**/*.py"
  - "**/test_*.py"
  - "**/*_test.py"
keywords:
  - "pytest"
  - "unit test"
  - "integration test"
match: all
---

# Python Tests: Cohesion and Signal

- Keep one behavior axis per test module (e.g., "scheduler edge cases" vs "happy path extraction"). Split mixed-responsibility files.
- Prefer parametrization over copy/paste tests for input matrices.
- Mock only external boundaries (network, clock, filesystem, subprocess). Avoid mocking internal helpers; use fakes/fixtures instead.
- Keep setup close to assertions. If setup is long, extract fixtures/builders so each test reads clearly within 10 lines of the assertion.
- Each test should assert a small, stable contract (avoid over-asserting implementation details).
