---
name: executing-plans
description: Use when executing a written, small-scope implementation plan directly without subagents
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

Use this for plans that fit comfortably in the current context and benefit from one agent retaining the whole implementation. Use `subagent-driven-development` for larger plans with independently reviewable tasks or when fresh context per task is valuable.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan

1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create todos for the plan items and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly
3. Run verifications as specified
4. Mark as completed
5. If this closes an atomic commit group, follow Step 3 before continuing

### Step 3: Commit an Atomic Group

The current executing agent owns direct-execution commits. At each boundary
defined by the plan, choosing Direct Execution explicitly authorizes these
plan-defined local commits, but not pushes or other externally visible actions:

1. Confirm every included task is complete and run the group's fresh verification.
2. Review the complete group diff and stage only the plan's listed paths.
3. Inspect status and the staged diff for unrelated changes and secrets.
4. Use `requesting-code-review` to review the complete staged group.
5. Fix all blocking findings, rerun group verification, re-stage only planned
   paths, and resume the same reviewer until approved.
6. Re-inspect status and the final staged diff, then commit using the plan's subject.

Never commit a partial group, split one task across commits, include unrelated
changes, or leave fixes for a later commit. If verification or review fails,
do not commit.

### Step 4: Complete Development

After all tasks complete:
- **REQUIRED SUB-SKILL:** Use `verification-before-completion`
- Run the fresh, complete verification required by the plan and repository
- Check the implementation against the plan before reporting completion

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
