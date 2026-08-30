---
globs:
  - '**/*.go'
fileContains:
  - '.Done()'
  - 'context.WithCancel('
  - 'context.WithTimeout('
  - 'context.WithDeadline('
---

# Modern Go: Context

- (Go 1.21+) Use `context.AfterFunc(ctx, cleanup)` instead of a goroutine that only waits on `<-ctx.Done()` before running cleanup. Call and defer the returned stop function.
- (Go 1.20+) Use `context.WithCancelCause(parent)` and `cancel(cause)` so callers can inspect the reason with `context.Cause(ctx)`.
- (Go 1.21+) Use `context.WithTimeoutCause` / `context.WithDeadlineCause(parent, d, errCause)` when callers need to distinguish timeout from other cancellation reasons.