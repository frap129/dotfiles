---
globs:
  - '**/*.go'
fileContains:
  - 'interface{}'
  - 'reflect.TypeOf((*'
---

# Modern Go: Types

- (Go 1.18+) Use `any` instead of `interface{}` for unconstrained values and type parameters.
- (Go 1.22+) Use `reflect.TypeFor[T]()` instead of `reflect.TypeOf((*T)(nil)).Elem()`.
- (Go 1.27+) Use generic methods on the owning type (`func (s Set[T]) Map[U any](f func(T) U) []U`) instead of package-level generic helper functions when the operation naturally belongs to the type.
- (Go 1.27+) In keyed struct literals, set promoted fields directly (`CreatedBy: "alice"`) instead of constructing the embedded struct (`AuditInfo: AuditInfo{...}`). Do not mix a promoted field with the embedded field that promotes it; pointer-embedded paths are unsupported.