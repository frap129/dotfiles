# Workflow Overview

## Purpose

This is a high-capability, low-ceremony OpenCode workflow. Routine work stays direct; explicit spec, planning, and delegated execution workflows are reserved for work that benefits from them.

## Origins

The workflow began as an OpenCode adaptation of [obra/superpowers](https://github.com/obra/superpowers). It retains Superpowers' core progression:

```text
design -> plan -> execute -> review -> verify
```

The local version is selectively synchronized with upstream rather than installed as a complete pack. Upstream text is preserved where practical, with changes for local skill names, OpenCode agents, `.opencode/plans/`, and intentionally different workflow policy.

## Workflow Lanes

### Routine direct work

```text
user -> main agent -> implementation -> verification
```

Clear, limited requests do not require the full design and planning sequence. The main agent works directly, keeps edits within the explicit request, and runs applicable verification.

### Planned work

The user manually invokes the outer workflow when higher assurance is warranted:

```text
spec-development -> writing-plans -> execution choice
                                      |-> executing-plans
                                      `-> subagent-driven-development
```

#### 1. `spec-development`

The local name for upstream `brainstorming`. It explores context, asks one question at a time, compares approaches, applies YAGNI, presents the design for approval, and writes the spec under `.opencode/plans/`.

The written spec receives independent document review. Blocking issues are fixed and re-reviewed for at most three attempts; unresolved issues then return to the user. The user reviews the final written spec before planning begins.

#### 2. `writing-plans`

Converts the approved spec into an implementation-ready plan with:

- global constraints copied exactly from the spec;
- independently testable task boundaries;
- exact files, interfaces, code, commands, and expected results;
- no placeholders or undefined cross-task contracts;
- self-review followed by one independent whole-plan review;
- plan-defined atomic commit groups, each with included tasks, verification,
  staging paths, and an imperative commit subject.

After approval, it offers two execution paths and recommends one based on plan size and coupling.

#### 3a. `executing-plans`

For small, tightly coupled plans that fit comfortably in one modern model's context window. One agent critically reviews the plan, executes its tasks in order, tracks progress, stops on ambiguity, and performs fresh final verification.

#### 3b. `subagent-driven-development`

For larger plans with independently reviewable tasks. The controller sends each fresh programmer the complete current task, relevant global constraints, and only the prior interfaces it needs. It does not paste accumulated history or run parallel implementers.

Execution follows:

```text
programmer -> task spec review -> task code-quality review -> stage task
atomic boundary -> verify complete staged group -> controller commit
```

Programmers never commit. The controller owns SDD commits; the current agent owns direct-execution commits. Each task passes spec and code-quality review before staging. A commit is created only after every included task is approved and the complete staged group passes fresh verification. Review fixes remain inside the same atomic commit.

The programmer owning affected code handles review fixes. A `NEEDS_CONTEXT` report pauses review; the controller resolves it from authoritative context or asks the user, then resumes that programmer with only the answer and relevant context. A final whole-implementation review follows all tasks.

## Inner Engineering Skills

Implementation agents selectively use focused disciplines rather than another outer workflow:

- `test-driven-development` — red-green-refactor and behavior-focused test design;
- `systematic-debugging` — root-cause investigation before fixes;
- `verification-before-completion` — fresh evidence before success claims;
- `security-review` — security-sensitive changes;
- `code-architecture-wrong-abstraction` — abstraction decisions;
- `naming-cheatsheet` — naming quality.

Other local utilities include `absolute-simplify`, `writing-skills`, and `using-mnemosyne-memory`.

## Intentional Divergence from Upstream Superpowers

| Area | Local workflow | Upstream Superpowers |
|---|---|---|
| Activation | User manually invokes the outer spec/plan/SDD workflow | `using-superpowers` strongly promotes automatic model invocation |
| Default lane | Direct work through `main` remains available | Skills more aggressively route work into prescribed workflows |
| Design name | `spec-development` with an intentionally narrow trigger | `brainstorming` |
| Artifact location | `.opencode/plans/` | `docs/superpowers/specs/` and `docs/superpowers/plans/` |
| Spec review | Independent document reviewer, maximum three attempts, then user escalation | Current upstream uses its own evolving review/self-review flow |
| Visual design | Visual Companion omitted | Browser-based Visual Companion is available upstream |
| Plan review | One calibrated whole-plan review | Kept close to current upstream, with local agent/path substitutions |
| Execution choice | Direct execution is recommended for small/tightly coupled plans; SDD for larger/independent plans | Offers SDD and executing-plans, generally preferring subagents when available |
| Direct execution | Same-session, no mandatory worktree or branch-finishing skill | Requires worktree setup and `finishing-a-development-branch` |
| SDD state | Compact inline handoffs and reports | Uses workspace scripts, briefs, reports, ledgers, and review packages |
| SDD review | Separate task-scoped spec and code-quality reviews | Current upstream combines both phases sequentially in one task reviewer |
| Commit ownership | Plans define atomic groups; execution controller verifies, stages, reviews, and commits | Upstream implementers commit individual tasks |
| Context escalation | `NEEDS_CONTEXT` goes through the controller and user, then resumes the same programmer | Upstream assumes a different subagent interaction model |
| Skill references | Local unnamespaced names; no `@` force-loading | Uses `superpowers:` names and runtime-specific references |
| Optional upstream skills | Worktrees, branch finishing, visual companion, receiving review, and parallel dispatch omitted | Included in the complete upstream collection |

## Selectively Imported Upstream Improvements

The local skills retain upstream improvements that add capability without importing the full machinery, including:

- plan task right-sizing, global constraints, explicit interfaces, placeholder checks, and self-review;
- calibrated whole-plan and spec-document review prompts;
- `writing-good-tests` guidance for observable behavior, boundaries, mocks, side effects, and mutation checks;
- robust test-polluter glob handling and explicit completion verification;
- skill-authoring guidance for matching instruction form to failure type and micro-testing wording;
- read-only, precisely scoped code-review dispatch;
- lean SDD statuses, context-efficient dispatch, and same-programmer continuation;
- plan-defined atomic commits containing individually reviewed tasks.

## Deliberately Omitted

- the automatic `using-superpowers` bootstrap;
- the complete upstream SDD workspace/ledger/script protocol;
- mandatory worktrees and branch-finishing workflow;
- Visual Companion browser/server assets;
- `receiving-code-review` and `dispatching-parallel-agents`;
- complete Matt Pocock or Addy Osmani skill packs.

## Pending Workflow Changes

These decisions are not yet implemented:

1. Make inner-skill activation deterministic without turning the outer workflows automatic.
2. Evaluate narrow additions from Matt Pocock and Addy Osmani after the Superpowers adaptation is complete.

This document describes the workflow policy; each skill's `SKILL.md` remains authoritative for executable instructions.
