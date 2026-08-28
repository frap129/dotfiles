---
tools:
  - lsp
---
# LSP
Use LSP for precise semantic navigation instead of text-based searches.

## When to Use LSP
**ALWAYS use LSP for:**
- Finding the definition of a symbol
- Finding all usages/references of a function, variable, or type
- Understanding call hierarchies and dependencies
- Navigating to interface implementations
- Getting type information and documentation

**Use Grep/Glob ONLY when:**
- Searching for non-symbol text (comments, strings, config values)
- Searching across multiple file types simultaneously
- LSP returns no results (server not configured for that file type)

## Guidelines
- Combine with Read: use LSP to find the location, then Read to view context
- For refactoring: use `findReferences` before renaming to understand impact
- Use `incomingCalls`/`outgoingCalls` to understand dependency flow before modifying functions
