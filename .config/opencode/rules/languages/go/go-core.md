---
globs:
  - '**/go.mod'
fileContains: 'go 1.'
---

# Modern Go: Version Discipline

- Detect the project's Go version from the `go` and `toolchain` directives in go.mod before writing Go code in this project.
- Use only language features and stdlib additions available up to and including that version.
- Prefer the modern idioms from the `go-*` rules even when surrounding code uses older patterns. Skip a modern idiom only if it would not compile or would change behavior.