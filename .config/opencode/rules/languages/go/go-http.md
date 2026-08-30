---
globs:
  - '**/*.go'
fileContains:
  - 'Method == http.Method'
  - 'Method != http.Method'
  - 'http.StripPrefix('
  - 'HandleFunc('
  - 'URL.Path'
  - 'new(url.URL)'
  - 'url.UserPassword('
---

# Modern Go: HTTP and URL

- (Go 1.22+) Use method-aware ServeMux patterns (`mux.HandleFunc("GET /api/{id}", ...)`) and `r.PathValue("id")` instead of manual method checks and path trimming.
- (Go 1.27+) Use `base.Clone()` / `values.Clone()` from `net/url` instead of manual deep-copy code.