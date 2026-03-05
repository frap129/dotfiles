---
globs:
  - '**/*.py'
---

# Python Typing Discipline

- Add type annotations to all new/changed public functions, methods, and class attributes.
- Avoid `Any` and bare containers (`dict`, `list`, `set`) in signatures. Prefer concrete parameterized types (`dict[str, Foo]`, `Sequence[Foo]`, `Mapping[str, Foo]`).
- For structured payloads with more than a few fields, prefer `dataclass`, `TypedDict`, or a validation model over ad-hoc dicts.
- Validators/parsers should accept `object`, narrow with `isinstance`, and raise `TypeError` for unexpected types.
- Imports used only for typing go under `if TYPE_CHECKING:`. Do not use deferred imports by default; only use them for a real cycle/perf/heavy-dependency reason, and add a one-line justification comment.
- If `None` is a sentinel return value, reflect it in the type (`Foo | None`) and require callers to handle it.
