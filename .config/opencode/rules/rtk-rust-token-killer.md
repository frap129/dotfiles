# RTK - Rust Token Killer
Token-optimized CLI proxy (60-90% savings on dev operations)

All shell commands are automatically rewritten through RTK by the openrtk plugin.
Example: `git status` becomes `rtk git status` transparently, producing compressed output.

No manual prefixing is needed. Just run commands normally.

If you believe RTK is supressing key output, you may use the following;

```bash
rtk proxy <cmd>       # Execute raw command without filtering (for debugging)
```
