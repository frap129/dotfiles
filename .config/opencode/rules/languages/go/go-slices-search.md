---
globs:
  - '**/*.go'
fileContains:
  - " := false\n\tfor _, "
  - " := false\n\t\tfor _, "
  - " := -1\n\tfor "
  - " := -1\n\t\tfor "
  - "= true\n\t\t\tbreak"
  - "= true\n\t\t\t\tbreak"
  - "= i\n\t\t\tbreak"
  - "= i\n\t\t\t\tbreak"
---

# Modern Go: Slice Membership and Index Scans

- (Go 1.21+) Replace a membership scan that sets a bool flag with `slices.Contains(items, x)`.
- (Go 1.21+) Replace an index scan with `slices.Index(items, x)`, or `slices.IndexFunc(items, pred)` when matching on fields or derived values. Both return `-1` when absent.
- (Go 1.21+) Replace a manual min/max scan over a non-empty ordered slice with `slices.Min(values)` / `slices.Max(values)`; keep explicit logic for empty slices or custom comparison rules.