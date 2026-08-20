# Deterministic Analyzer Selection

Prefer repository-configured tools. Otherwise use the first available analyzer in the matching row. Pin ephemeral package versions and avoid commands that update project manifests or lockfiles.

| Language | Complexity and size | Cognitive complexity | Duplication |
|---|---|---|---|
| JavaScript / TypeScript | ESLint `complexity` and `max-lines-per-function`; use the repository parser/config | ESLint SonarJS `cognitive-complexity` when already configured or available ephemerally | `jscpd` |
| Python | `lizard` for cyclomatic complexity and function size; honor configured Radon results | `complexipy` when configured or available ephemerally | `jscpd` |
| Go | `gocyclo` and `gocognit`; function size from configured `golangci-lint` `funlen` | `gocognit` | `jscpd` |
| Ruby | RuboCop `Metrics/CyclomaticComplexity`, `Metrics/PerceivedComplexity`, and `Metrics/MethodLength` | Use configured analyzer; `PerceivedComplexity` is not cognitive complexity | `jscpd` |
| Java / Kotlin | PMD complexity and method-size rules | Sonar analyzer when configured; otherwise unavailable | PMD CPD or `jscpd` |
| C / C++ / C# / PHP / Rust / Swift | `lizard` for cyclomatic complexity and function size | Use a configured analyzer; otherwise unavailable | `jscpd` |

## Execution rules

- Record exact versions (`--version` or package-manager equivalent).
- For an ephemeral tool, resolve a concrete release from the package registry, run that exact version, and record it. Never use an unversioned `latest` invocation.
- Use analyzer-native machine output such as JSON, XML, or CSV where supported.
- Restrict reports to functions and clones intersecting changed lines. A pre-existing violation outside changed code is not a candidate.
- A changed function remains eligible when the edit increased an already-over-threshold metric or left it over threshold.
- A parse error makes only that analyzer's signals unavailable. Try the next analyzer for those signals and continue other measurements; errors never authorize manual scoring.
- If an ephemeral install requires network access that is unavailable, try the next listed installed/configured analyzer, then report unsupported.
- Never install globally, add dependencies, or persist analyzer configuration solely for this pass.
