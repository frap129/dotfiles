---
description: Grounded Docs requirements
tools:
  - "mcp_docs"
---

# Grounded Docs

- You MUST use `search_docs` instead of `web_search` for high-value sources: authoritative, substantial documentation likely to be reused across projects or throughout a project. This includes core tech-stack libraries, frameworks, platforms, SDKs, APIs, standards, infrastructure tools, and large knowledge bases.
- Before referencing a documentation site, you MUST use `list_libraries` and `find_version` to confirm that its official documentation and matching version are available. If they are not available, you MUST use `scrape_docs` with a clear library name and version before using `search_docs` or citing the site.
- You MUST use `refresh_version` only when the target version has changed, or when targeting an unpinned latest version whose documentation may have changed.
- Use `web_search` for transient information, broad discovery, news, comparisons, one-off questions, or when `search_docs` is insufficient.
