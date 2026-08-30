---
globs:
  - '**/*.go'
fileContains:
  - 'func Ptr['
  - 'func Pointer['
  - 'func ToPtr('
  - 'math.Max('
  - 'math.Min('
  - 'os.Getenv('
  - 'github.com/google/uuid'
  - 'github.com/gofrs/uuid'
---

# Modern Go: Utilities

- (Go 1.26+) Use `new(value)` for pointer fields and arguments (`Timeout: new(30)`) instead of pointer helper functions like `Ptr`/`Pointer`/`ToPtr` or temporary variables used only for `&value`.
- (Go 1.21+) Use built-in `min(a, b)` / `max(a, b)` instead of handwritten comparisons or `math.Max`/`math.Min`.
- (Go 1.22+) Use `cmp.Or(a, b, c)` for the first-non-zero fallback chain; all arguments are evaluated before the call.
- (Go 1.27+) Use the standard `uuid` package (`uuid.New()`, `uuid.Parse(raw)`) instead of third-party `github.com/google/uuid` or `gofrs/uuid`.