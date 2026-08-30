---
description: Python dependency management with uv
globs:
  - "**/pyproject.toml"
  - "**/uv.lock"
  - "**/requirements*.txt"
  - "**/requirements*.toml"
keywords:
  - "uv"
  - "pip"
  - "poetry"
  - "pip-tools"
  - "pyproject"
  - "venv"
  - "virtualenv"
---

# Package Management with `uv`

- Use `uv` exclusively: all Python dependencies must be installed, synchronized, and locked with `uv`. Never use `pip`, `pip-tools`, or `poetry` directly for dependency management.

```bash
# Add or upgrade dependencies
uv add <package>

# Remove dependencies
uv remove <package>

# Reinstall all dependencies from lock file
uv sync
```