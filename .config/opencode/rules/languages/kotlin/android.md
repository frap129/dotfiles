---
description: Android app architecture conventions
globs:
  - "**/*.kt"
  - "**/*.kts"
fileContains:
  - "import androidx"
  - "import com.android"
---

# Android

- Use clean architecture; use the repository pattern for data persistence.
- Use Flow to manage UI state.
- Use Material 3 for the UI.
- Use integration tests for each API module.