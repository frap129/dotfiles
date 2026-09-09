---
globs:
  - '**/*.py'
fileContains:
  - 'async def '
  - 'asyncio.'
---

# Python Async Cancellation

- In async code, never swallow cancellations; always re-raise `asyncio.CancelledError`.
