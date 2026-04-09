---
tools:
  - webfetch
---

# WebFetch Safety

- Do not fetch localhost, loopback, private-network, `.local`, `.internal`, or other internal/corporate URLs.
- Do not fetch non-HTTP(S) URLs such as `file://`, `ssh://`, or `ftp://`.
- Do not fetch malformed URLs, temporary/session-token URLs, or creation flows such as GitHub `pull/new/*`.
- Use WebFetch only for URLs the user explicitly provided.
- When the user provides multiple safe URLs, fetch them in parallel.
