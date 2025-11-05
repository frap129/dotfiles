# Claude Code: Conventional Commits Guide

When making git commits, follow the Conventional Commits specification using this format:

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

## Types (Required)
- **`feat`** - New feature
- **`fix`** - Bug fix  
- **`refactor`** - Code restructuring without behavior changes
- **`perf`** - Performance improvements
- **`style`** - Code style changes (formatting, whitespace)
- **`test`** - Adding or correcting tests
- **`docs`** - Documentation changes
- **`build`** - Build system, dependencies, CI/CD changes
- **`ops`** - Infrastructure, deployment, operations
- **`chore`** - Miscellaneous changes

## Description (Required)
- Use imperative, present tense: "add" not "added"
- Don't capitalize first letter
- Don't end with period
- Keep concise (1-100 characters)

## Optional Elements
- **Scope**: Context in parentheses `feat(auth): add OAuth support`
- **Breaking Changes**: Add `!` before colon + `BREAKING CHANGE:` in footer
- **Body**: Explain motivation, use imperative tense, separate with blank line
- **Footer**: Issue references (`Closes #123`) or breaking change descriptions

## Examples

```
feat: add email notifications
fix: prevent crash when input is empty
feat(auth): add two-factor authentication
fix(cart): prevent ordering empty cart
feat(api)!: remove deprecated endpoint

BREAKING CHANGE: Use /api/v2/users instead of /api/users
```

## Validation Checklist
- [ ] Type is valid
- [ ] Description uses imperative mood
- [ ] Description doesn't end with period  
- [ ] Breaking changes marked with `!` and documented
- [ ] Issue references properly formatted

Write commits as if explaining to a future developer what this change accomplishes.