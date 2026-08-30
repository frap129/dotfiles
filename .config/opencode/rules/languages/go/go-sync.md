---
globs:
  - '**/*.go'
fileContains:
  - 'sync.WaitGroup'
  - 'sync.Once'
  - 'atomic.Load'
  - 'atomic.Store'
  - 'atomic.Add'
  - 'atomic.Swap'
  - 'atomic.CompareAndSwap'
---

# Modern Go: Sync

- (Go 1.25+) Use `wg.Go(func() { ... })` instead of `wg.Add(1)` + `go func() { defer wg.Done(); ... }()` when the goroutine's lifetime is exactly what the WaitGroup tracks.
- (Go 1.21+) Use `sync.OnceFunc(f)` instead of `sync.Once` plus a wrapper closure for one-time actions.
- (Go 1.21+) Use `sync.OnceValue(f)` instead of `sync.Once` plus a result variable and getter for memoizing a computed value.
- (Go 1.19+) Use typed atomics (`atomic.Bool`, `atomic.Int64`, `atomic.Pointer[T]`) instead of untyped `atomic.LoadInt32`-style functions and `unsafe.Pointer` storage.