---
description: Implement an approved OpenSpec change with subagents and keep tasks in sync.
---

The user has requested to implement the following change proposal. Find the change proposal and follow the instructions below. If you're not sure or if ambiguous, ask for clarification from the user.
<UserRequest>
$ARGUMENTS
</UserRequest>

<!-- OPENSPEC:START -->

# Guardrails

- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.
- NEVER batch or group tasks. Every single task MUST be completed independently with a fresh subagent.

# The Process

Track these steps as TODOs and complete them one by one.

## 1. Load Plan

Read plan file, create TodoWrite with all tasks.

**Example TODO list**

```
[X] Task 1: Example task
[X] Task 1: Review
[x] Task 1: Fixes
[x] Task 2: Review fixes
[] Task 1: Mark as complete
[] Task 2: Another task
[] Task 2: Review
[] Task 2: Mark as complete
[] Final Review
[] Complete Development
```

## 2. Execute Task with Subagent

For each task:

**Dispatch fresh subagent:**

```
Task tool (programmer):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].

    CRITICAL: You MUST call the skills_test_driven_development tool before starting your implementation work.

    Read that task carefully. Your job is to:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Report back

    Work from: [directory]

    Report: What you implemented, what you tested, test results, files changed, any issues
```

IMPORTANT: If the task should be completed with TDD, you MUST explicitly instruct the subagent to call skills_test_driven_development.

**Subagent reports back** with summary of work.

## 3. Review Subagent's Work

**Dispatch code-reviewer subagent:**

```
Task tool (code-reviewer):

  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from subagent's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment

## 4. Apply Review Feedback

**If issues found:**

- Fix Critical issues immediately
- Fix Important issues before next task
- Note Minor issues, fix before next task if they add value

**Dispatch follow-up subagent if needed:**

```
"Fix issues from code review: [list issues]"
```

## 5. Mark Complete, Next Task

- Mark task as completed in TodoWrite
- Mark task as completed in `changes/<id>/tasks.md`
- Move to next task
- Repeat steps 2-5

## 6. Final Review

After all tasks complete, dispatch final code-reviewer:

- Reviews entire implementation
- Checks all plan requirements met
- Validates overall architecture

## 7. Complete Development

After final review passes:

- Verify all tests pass by running them
- Ensure all changes are commited
- Review `changes/<id>/tasks.md` and ensure each are marked as completed
- Reference `openspec show <id>` to verify tasks are complete.

## Red Flags

**Never:**

- Skip code review between tasks
- Proceed with unfixed Critical issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Implement without reading plan task

**If subagent fails task:**

- Dispatch fix subagent with specific instructions
- Do NOT try to fix it yourself (context pollution)

## Integration

**Required workflow skills:**

- **skills_requesting_code_review** - REQUIRED: Review after each task (see Step 3)

**Subagents must use:**

- **skills_test_driven_development** - Subagents follow TDD for each task

**Steps**
Track these steps as TODOs and complete them one by one.

1. Read `openspec/changes/<id>/proposal.md`, `design.md` (if present), `tasks.md`, and `plan.md` (if present) to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Update the checklist after all work is done so each task is marked `- [x]` and reflects reality.

**Reference**

- Use `openspec show <id> --json --deltas-only` if you need additional context from the proposal while implementing.
- Reference `openspec list` or `openspec show <item>` when additional context is required.
<!-- OPENSPEC:END -->
