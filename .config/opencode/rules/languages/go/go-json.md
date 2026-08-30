---
globs:
  - '**/*.go'
fileContains:
  - 'omitempty'
  - 'encoding/json"'
---

# Modern Go: JSON

- (Go 1.24+) Use `omitzero` on bool, numeric, struct, and time fields whose Go zero value means absence; keep `omitempty` for empty strings, slices, and maps.
- (Go 1.27+) Use `encoding/json/v2` for new JSON code; its stricter defaults (UTF-8 and duplicate-name validation, nil slices/maps encoded as empty arrays/objects) are preferred. Do not migrate existing `encoding/json` code unless explicitly requested — even a compiling import swap can alter wire behavior. For an explicit migration, start from `jsonv1.DefaultOptionsV1()` and remove compatibility options only after verifying serialized output and accepted input.