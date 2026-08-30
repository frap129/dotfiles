---
globs:
  - '**/*.py'
---

# Python Function Cohesion

- Separate orchestration from transformation: a function should primarily coordinate calls OR compute/reshape values, not both.
- If a function contains retries/backoff + IO + payload shaping, extract named steps (each testable in isolation).
- After duplicating a guard/fallback pattern twice, extract a helper (avoid copy/paste drift).
- Prefer early returns over deep nesting; keep control-flow simple enough to scan quickly.
- Extract magic numbers (timeouts, thresholds, backoff caps) into named constants near the boundary layer.
