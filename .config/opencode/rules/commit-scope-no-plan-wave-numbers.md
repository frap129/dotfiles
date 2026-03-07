# Commit Scope Must Not Use Planning Identifiers

- Do not use plan numbers, phase numbers, wave numbers, or other planning artifact identifiers as the Conventional Commit scope.
- If a scope is used, make it describe the affected product area, subsystem, or feature (for example `config`, `cli`, `build`, `tests`), not execution metadata.
- Invalid examples: `feat(plan-3): ...`, `fix(wave-2): ...`, `refactor(phase-01): ...`.
- Valid examples: `feat(cli): ...`, `fix(config): ...`, `refactor(build): ...`.
