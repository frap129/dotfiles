---
globs:
  - '**/*.go'
fileContains:
  - 'sort.Ints('
  - 'sort.Strings('
  - 'sort.Float64s('
  - 'sort.Sort('
  - 'sort.Slice('
  - '[:0]'
---

# Modern Go: Slice Sorting

- (Go 1.21+) Use `slices.Sort(values)` instead of `sort.Ints`, `sort.Strings`, `sort.Float64s`, `sort.Sort`, and simple `sort.Slice` calls.
- (Go 1.21+) Use `slices.SortFunc(items, func(a, b Item) int { return cmp.Compare(a.X, b.X) })` instead of `sort.Slice` closures that index back into the slice. Use `slices.SortStableFunc` when stability matters.
- (Go 1.21+) Use `slices.Compact(values)` to remove consecutive duplicates in place; sort or group first to remove all duplicates.