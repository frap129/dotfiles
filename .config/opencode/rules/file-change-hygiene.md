# File Change Hygiene

- Read the target file before patching it.
- Preserve surrounding style and indentation exactly.
- Use enough unique surrounding context in a patch to make the target region unambiguous.
- Do not issue overlapping parallel edits to the same file.
- Prefer focused patches over broad rewrites unless the task clearly requires a larger replacement.
