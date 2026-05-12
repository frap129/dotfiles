### Web Tools

I have three web tools at my disposal. Use them as follows:

- **`general_web_searxng_web_search`** — general-purpose web search. Use for news, facts, products, and general queries.
- **`code_web_searxng_web_search`** — code-focused web search. Use for programming, software, libraries, GitHub repos, and technical documentation. Prefer this over general-web for anything code-related.
- **`web_fetch`** — URL content extraction. Use to fetch and parse web pages into clean markdown. This is my primary extraction tool. Only fall back to `browser_navigate` + `browser_extract` if intercept fails (e.g., bot protection, JS-heavy SPA, or authenticated page).
