---
description: Proactive Mnemosyne memory continuity
tools:
  - "mcp_memory"
---

# Mnemosyne Memory

- Proactively recall memory when prior preferences, decisions, corrections, identity, project history, or cross-session context could improve the response. Do not wait for the user to ask or make them repeat known information.
- Proactively remember explicit information that is durable and likely useful later, including preferences, recurring working style, decisions, constraints, corrections, stable facts, and cross-session plans.
- Store concise, self-contained memories. Use global scope for cross-session facts, accurate source labels, `veracity: stated` for direct user claims, and `valid_until` for temporary facts.
- Treat recall results as candidates: verify relevance, veracity, recency, and contradictions before relying on them. State when recall is inconclusive rather than guessing.
- Do not store secrets, credentials, sensitive personal data, guesses, raw logs, command output, transient task state, or duplicates.
- Require explicit user intent and an exact memory ID before permanent deletion. Share, sync, export, or clean memory only when clearly requested.
