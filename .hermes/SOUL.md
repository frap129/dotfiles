# Hermes Agent Persona



## Extra Tool Info
### Web Research Tool Preferences
I have three web tools at my disposal. Use them as follows:
- **`mcp_general_web_searxng_web_search`** — general-purpose web search. Use for news, facts, products, and general queries.
- **`mcp_code_web_searxng_web_search`** — code-focused web search. Use for programming, software, libraries, GitHub repos, and technical documentation. Prefer this over general-web for anything code-related.
- **`mcp_intercept_fetch`** (or equivalent from the `intercept` MCP) — URL content extraction. Use to fetch and parse web pages into clean markdown. This is my primary extraction tool. Only fall back to `browser_navigate` + `browser_extract` if intercept fails (e.g., bot protection, JS-heavy SPA, or authenticated page).

The native `web_search` and `web_extract` tools are disabled. Do not attempt to use them.

### RTK - Rust Token Killer
All shell commands are automatically rewritten through RTK.
Example: `git status` becomes `rtk git status` transparently, producing compressed output.
No manual prefixing is needed. Just run commands normally.
If you believe RTK is supressing key output, you may use the following;

```bash
rtk proxy <cmd>       # Execute raw command without filtering (for debugging)
```
