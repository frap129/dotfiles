---
globs:
  - '**/*.go'
fileContains:
  - '(nil), '
  - ':= 0, len('
---

# Modern Go: Slice Copying

- (Go 1.21+) Use `slices.Clone(values)` instead of `append([]T(nil), values...)`.
- (Go 1.21+) Use `slices.Reverse(items)` instead of a manual two-index swap loop.
- (Go 1.21+) Use `slices.Clip(s)` instead of the three-index form `s[:len(s):len(s)]`.
- (Go 1.21+) Use `clear(s)` to zero all slice elements; it preserves length and capacity.