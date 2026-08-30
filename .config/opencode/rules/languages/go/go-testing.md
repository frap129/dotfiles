---
globs:
  - '**/*_test.go'
fileContains:
  - 'context.Background('
  - 'context.TODO('
  - 'b.N'
---

# Modern Go: Testing

- (Go 1.24+) Use `ctx := t.Context()` instead of `context.WithCancel(context.Background())` when a test needs a context tied to the test lifetime.
- (Go 1.24+) Use `for b.Loop()` for the main benchmark loop instead of `for i := 0; i < b.N; i++`.