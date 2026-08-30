---
globs:
  - '**/*.go'
fileContains:
  - '== Err'
  - '== os.Err'
  - '== io.EOF'
  - '== io.E'
  - '== sql.Err'
  - '== context.Canceled'
  - '== context.Deadline'
  - '!= sql.Err'
  - 'errors.As('
  - '%v; %w'
  - '%w; %w'
---

# Modern Go: Errors

- (Go 1.13+) Use `errors.Is(err, target)` / `errors.Is(err, os.ErrNotExist)` instead of `err == target` so wrapped errors are matched correctly.
- (Go 1.20+) Use `errors.Join(err1, err2)` to combine non-nil errors; it returns nil when all arguments are nil and preserves `errors.Is`/`errors.As` matching.
- (Go 1.26+) Use `if v, ok := errors.AsType[T](err); ok` instead of `errors.As` with a pointer-to-target when checking whether an error matches a specific type.