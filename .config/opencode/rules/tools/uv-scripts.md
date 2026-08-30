---
description: PEP 723 inline script metadata managed with uv
globs:
  - "**/*.py"
fileContains: "# /// script"
---

# uv Script Dependencies (PEP 723)

Manage inline script metadata with the uv CLI:

```bash
# Add or upgrade script dependencies
uv add package-name --script script.py

# Remove script dependencies
uv remove package-name --script script.py

# Reinstall all script dependencies from lock file
uv sync --script script.py
```

Run scripts with `uv run script.py` so the declared dependencies are used.