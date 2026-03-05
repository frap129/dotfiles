---
globs:
  - '**/*.py'
---

# Python Exception Hygiene

- Never write silent handlers: `except ...: pass`, `except ...: continue`, or bare `except:` without an explicit, intentional outcome.
- Catch the narrowest exception type you can. `except Exception` is allowed only at explicit process boundaries (CLI entrypoints, daemon/task roots) to add context, log, and then re-raise/exit.
- If you recover from an exception, do one of:
  - return an explicit fallback value documented in the function contract
  - raise a domain-specific exception (`raise X(...) from exc`)
  - schedule a bounded retry (cap attempts or total time) and surface degraded state to the caller
- When recovering, log structured context (event name + key/value fields). Avoid embedding values in the message via f-strings.
- In async code, never swallow cancellations; always re-raise `asyncio.CancelledError`.
- Do not mix fail-open and fail-fast policies in the same layer unless you add a short comment explaining the policy boundary.
