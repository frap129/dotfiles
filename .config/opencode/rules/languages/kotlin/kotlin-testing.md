---
description: Kotlin and Android testing conventions
globs:
  - "**/test/**/*.kt"
  - "**/androidTest/**/*.kt"
  - "**/*Test.kt"
---

# Kotlin Testing

- Follow the Arrange-Act-Assert convention for tests.
- Name test variables clearly: `inputX`, `mockX`, `actualX`, `expectedX`.
- Write unit tests for each public function.
  - Use test doubles to simulate dependencies.
    - Except for third-party dependencies that are not expensive to execute.
- Write acceptance tests for each module, following the Given-When-Then convention.