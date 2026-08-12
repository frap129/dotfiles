---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**

- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**

- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Define the exact review target:**

```bash
# Committed range
git diff --stat <base>..<head>
git diff <base>..<head>

# Planned atomic commit before commit creation
git diff --cached --stat
git diff --cached
```

Use a commit range for committed work. For a planned atomic commit that has
not been created yet, stage only its intended paths and review `git diff
--cached`; this keeps fixes inside the atomic commit instead of creating
corrective commits.

**2. Dispatch code-reviewer subagent:**

Dispatch a `code-reviewer` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**

- `[DESCRIPTION]` - Brief summary of what you built
- `[PLAN_OR_REQUIREMENTS]` - What it should do
- `[REVIEW_TARGET]` - Exact committed or staged scope
- `[DIFF_COMMANDS]` - Commands exposing exactly that scope

**3. Act on feedback:**

- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

[Dispatch code-reviewer subagent]
  PLAN_OR_REQUIREMENTS: Task 2 from .opencode/plans/deployment-plan.md
  REVIEW_TARGET: commits a7981ec..3df7661
  DIFF_COMMANDS: git diff --stat a7981ec..3df7661; git diff a7981ec..3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'll just review the diff myself instead of dispatching a reviewer" | You're the coordinator — reviewing the diff inline burns the context window you need to keep driving the work. Dispatch a reviewer subagent: the diff and the evaluation live in its context, and only the findings come back to you. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |

## Integration with Workflows

**Subagent-Driven Development:**

- Review each task after its spec-compliance review passes
- Catch issues before they compound
- Fix and re-review before staging the task or moving to the next task

**Executing Plans:**

- Review at plan-defined atomic commit boundaries
- Fix and re-review the complete staged group before committing

**Ad-Hoc Development:**

- Review before merge
- Review when stuck

## Red Flags

**Never:**

- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**

- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)
