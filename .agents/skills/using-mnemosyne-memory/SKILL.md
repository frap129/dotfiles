---
name: using-mnemosyne-memory
description: Use when prior preferences, decisions, corrections, identity, project history, or cross-session context could improve the response, or when new durable information may be useful in future conversations
---

# Using Mnemosyne Memory

## Overview

Use Mnemosyne proactively for continuity across conversations. The user should not need to say “remember” or “recall.”

**Core principle:** Recall when past context could matter; remember explicit durable information when future work could benefit.

## Automatic Recall

Call `mnemosyne_recall` before acting when the request:

- Refers to prior work, discussions, decisions, preferences, or “the usual” approach
- Depends on user identity, established conventions, or project history not visible now
- Would benefit from continuity or avoiding a repeated question
- Conflicts with, updates, or may be constrained by earlier information

Query narrowly. Check relevance, veracity, recency, and contradictions; use `mnemosyne_get` when exact content matters. Apply only reliable memories.

## Automatic Remembering

Call `mnemosyne_remember` without waiting to be asked when the user directly states information that is both durable and likely useful later:

- Preferences and recurring working style
- Decisions, constraints, and corrections that should guide future work
- Stable identity, environment, or project facts
- Explicit plans or commitments spanning sessions

Before storing, ask: **Would this still be useful after the current task or improvement effort is complete?** If not, keep it only in conversation context or the task list. Do not use `scope: session` as a substitute for task state.

Never store:

- The current session's execution order, next steps, todo items, or progress
- Temporary sequencing such as “first X, then Y” or “hold off until X is done”
- Decisions that apply only while completing the current effort
- Restatements of context already preserved in the conversation, plan, or task list

Messages may mix durable preferences with transient instructions. Split them: store only the independently reusable rule, and omit its current-session sequencing and status. When durability is ambiguous, do not store it.

Use `scope: global`, an accurate `source`, and `veracity: stated` for durable direct claims. Keep memories concise; use `valid_until` only for genuinely time-bound facts that must persist across sessions.

Do not automatically store secrets, credentials, sensitive personal data, guesses, raw logs, command output, transient task state, or facts already represented accurately. Never turn an inference into a stated fact.

## Quick Reference

| Need | Tool | Rule |
|---|---|---|
| Find relevant history | `mnemosyne_recall` | Search proactively and narrowly |
| Inspect candidate | `mnemosyne_get` | Use the recalled ID |
| Save durable fact | `mnemosyne_remember` | Must outlive the current effort |
| Update/supersede | `mnemosyne_update` / `mnemosyne_invalidate` | Require an exact ID |
| Delete | `mnemosyne_forget` | Require explicit intent and exact ID |
| Share, sync, export, clean | Matching tool | Only when clearly needed or requested |

## Example

User: “Set this project up the way I usually like it. We discussed testing and package managers before.”

Recall both preferences automatically and apply reliable results before asking the user to repeat them.

User: “From now on, use pnpm and prefer integration tests over mocks.”

Apply the preferences now and store concise global memories automatically with `source: preference` and `veracity: stated`.

## Common Mistakes

| Mistake or excuse | Correction |
|---|---|
| “The user did not explicitly ask.” | Explicit wording is unnecessary for recall and safe durable capture. |
| Asking the user to repeat prior context first | Recall before asking. |
| Waiting until session end to save preferences | Store durable facts when stated. |
| Saving everything | Store only durable, useful, safe information. |
| Saving the current plan “for continuity” | Keep it in conversation, todos, or plan artifacts—not memory. |
| Using `scope: session` for task state | Do not store task state in Mnemosyne at all. |
| Accepting the first semantic match | Verify relevance and contradictions. |
| Storing an inference as fact | Skip it or mark it `inferred`. |
| Deleting a likely match | Require explicit intent and exact ID. |

## Red Flags — Stop and Correct

- “Memory calls are overhead”
- “I can ask the user again instead”
- “I will remember it later”
- Guessing despite available recall
- Persisting secrets, noise, or uncertain claims
- Persisting execution order, progress, or temporary deferrals
- Treating weak or contradictory recall as authoritative

The first four mean use Mnemosyne now. The last two mean narrow, verify, or skip the unsafe memory operation.
