---
globs:
  - '**/*.go'
fileContains:
  - '++ {'
  - '++{'
  - 'go func('
---

# Modern Go: Loops

- (Go 1.22+) Use `for i := range n` instead of `for i := 0; i < n; i++`. Keep the classic form only for non-zero starts, custom steps, or changing bounds.
- (Go 1.22+) Each loop iteration has its own variables. Do not add defensive copies (`v := v`) before closures, goroutines, deferred calls, or appending `&v`. Use `&slice[i]` only when a pointer to the actual slice element is required.