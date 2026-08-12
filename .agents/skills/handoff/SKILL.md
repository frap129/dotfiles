---
name: handoff
description: Use when the user requests a handoff for continuing work in a fresh session
---

# Handoff

Write a compact handoff document for a fresh agent.

1. Save it in the OS temporary directory, never the workspace.
2. Tailor it to the next session's stated focus.
3. Include:
   - objective;
   - verified current state;
   - unresolved decisions and blockers;
   - exact next actions;
   - relevant verification commands and results;
   - suggested skills.
4. Reference existing specs, plans, ADRs, issues, commits, and diffs by path,
   URL, or commit hash. Do not duplicate their contents or conversation history.
5. Distinguish verified facts, assumptions, and stale evidence.
6. Redact secrets, credentials, sensitive logs, and personal information.
7. Return only the handoff path and one-sentence purpose.
