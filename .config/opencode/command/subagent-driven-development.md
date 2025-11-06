---
description: Follow subagent driven development workflow
---

<!-- Subagent Driven Development START -->

**Core principle:** Fresh subagent per task + review between tasks = high quality, fast iteration

## The Process

### 1. Load Plan

Read plan file, create TodoWrite with all tasks.

### 2. Execute Task with Subagent

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

### 3. Review Subagent's Work

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

### 4. Apply Review Feedback

**If issues found:**

- Fix Critical issues immediately
- Fix Important issues before next task
- Note Minor issues, fix before next task if they add value

**Dispatch follow-up subagent if needed:**

```
"Fix issues from code review: [list issues]"
```

### 5. Mark Complete, Next Task

- Mark task as completed in TodoWrite
- Move to next task
- Repeat steps 2-5

### 6. Final Review

After all tasks complete, dispatch final code-reviewer:

- Reviews entire implementation
- Checks all plan requirements met
- Validates overall architecture

### 7. Complete Development

After final review passes:

- Verify all tests pass by running them
- Ensure all changes are commited

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

- **skills_writing_plans** - REQUIRED: Creates the plan that this skill executes
- **skills_requesting_code_review** - REQUIRED: Review after each task (see Step 3)

**Subagents must use:**

- **skills_test_driven_development** - Subagents follow TDD for each task

<!-- Subagent Driven Development END -->

Follow the subagent driven development workflow to implement the user's request:
$ARGUMENTS
