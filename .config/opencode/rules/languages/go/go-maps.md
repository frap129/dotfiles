---
globs:
  - '**/*.go'
fileContains:
  - 'delete('
  - 'for k, v := range '
---

# Modern Go: Maps

- (Go 1.21+) Use `maps.Clone(src)` instead of a manual copy loop; it preserves nil maps.
- (Go 1.21+) Use `maps.Copy(dst, src)` instead of `for k, v := range src { dst[k] = v }`.
- (Go 1.21+) Use `maps.DeleteFunc(m, pred)` instead of a delete loop with an if condition.
- (Go 1.21+) Use `clear(m)` instead of a delete-all loop.