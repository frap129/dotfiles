---
globs:
  - '**/*.go'
fileContains:
  - 'time.Now().Sub('
  - 'Sub(time.Now())'
  - 'time.NewTicker('
---

# Modern Go: Time

- Use `time.Since(start)` instead of `time.Now().Sub(start)`.
- (Go 1.8+) Use `time.Until(deadline)` instead of `deadline.Sub(time.Now())`.
- (Go 1.23+) Use `for range time.Tick(d)` for simple forever loops; unreferenced tickers are now GC-recoverable. Use `time.NewTicker` when you need `Stop` or `Reset`.