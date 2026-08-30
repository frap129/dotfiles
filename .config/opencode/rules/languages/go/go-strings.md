---
globs:
  - '**/*.go'
fileContains:
  - 'strings.Index('
  - 'bytes.Index('
  - 'strings.LastIndex('
  - 'bytes.LastIndex('
  - 'strings.TrimPrefix('
  - 'strings.TrimSuffix('
  - 'range strings.Split('
  - 'range strings.Fields('
  - 'range bytes.Split('
  - 'range bytes.Fields('
  - 'string([]byte('
  - 'append([]byte(nil),'
  - '[]byte(fmt.Sprintf('
---

# Modern Go: Strings and Bytes

- (Go 1.18+) Use `strings.Cut(s, sep)` / `bytes.Cut(b, sep)` instead of `Index` plus manual slicing.
- (Go 1.27+) Use `strings.CutLast(s, sep)` / `bytes.CutLast(b, sep)` instead of `LastIndex` plus slicing.
- (Go 1.20+) Use `strings.CutPrefix` / `strings.CutSuffix` instead of `HasPrefix` followed by `TrimPrefix` (or the suffix pair).
- (Go 1.24+) Iterate split results with `range strings.SplitSeq(...)` / `strings.FieldsSeq` / `bytes.SplitSeq` / `bytes.FieldsSeq` instead of allocating via `Split`/`Fields`.
- (Go 1.18+) Use `strings.Clone(s)` instead of `string([]byte(s))` when copying a small string out of a larger one to release backing memory.
- (Go 1.20+) Use `bytes.Clone(b)` instead of `append([]byte(nil), b...)`.
- (Go 1.19+) Use `buf = fmt.Appendf(buf, "x=%d", x)` instead of `append(buf, []byte(fmt.Sprintf(...))...)`.