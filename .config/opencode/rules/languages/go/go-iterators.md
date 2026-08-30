---
globs:
  - '**/*.go'
fileContains:
  - ', 0, len('
---

# Modern Go: Iterators

- (Go 1.23+) Range over `maps.Keys(m)` or `maps.Values(m)` directly instead of collecting into a slice first.
- (Go 1.23+) Use `slices.Collect(maps.Keys(m))` when a slice is actually required; prefer ranging over the iterator directly.
- (Go 1.23+) Use `slices.Sorted(maps.Keys(m))` to collect and sort in one step for deterministic output from unordered sources.