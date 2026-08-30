---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx}"
  - "**/__tests__/**"
---

# Test Maintainability

- Prefer typed fixtures, builders, and `Partial<T>` helpers over `any` and `as any`.
- Use `as unknown as T` only for intentional invalid-input tests, and add a short rationale.
- Split oversized test suites by feature or module before adding unrelated new scenarios.
- Extract repeated setup and mock wiring into shared test helpers.
