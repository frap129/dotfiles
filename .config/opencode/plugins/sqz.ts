/**
 * sqz — OpenCode plugin for transparent context compression.
 *
 * Intercepts shell commands and pipes output through sqz for token savings.
 * Install: copy to ~/.config/opencode/plugins/sqz.ts
 * Config:  add "plugin": ["sqz"] to opencode.json or opencode.jsonc
 */

export const SqzPlugin = async (ctx: any) => {
  const SQZ_PATH = "/var/home/joe/.cargo/bin/sqz";

  // Commands that should not be intercepted.
  const INTERACTIVE = new Set([
    "vim", "vi", "nano", "emacs", "less", "more", "top", "htop",
    "ssh", "python", "python3", "node", "irb", "ghci",
    "psql", "mysql", "sqlite3", "mongo", "redis-cli",
  ]);

  function isInteractive(cmd: string): boolean {
    const base = cmd.split(/\s+/)[0]?.split("/").pop() ?? "";
    if (INTERACTIVE.has(base)) return true;
    if (cmd.includes("--watch") || cmd.includes("run dev") ||
        cmd.includes("run start") || cmd.includes("run serve")) return true;
    return false;
  }

  function shouldIntercept(tool: string): boolean {
    return ["bash", "shell", "terminal", "run_shell_command"].includes(tool.toLowerCase());
  }

  // Detect that a command has already been wrapped by sqz. Before this
  // guard was in place OpenCode could call the hook twice on the same
  // command (for retried tool calls, or when a previous rewrite was
  // echoed back to the agent and the agent re-submitted it) and each
  // pass would prepend another `SQZ_CMD=$base` prefix, producing monsters
  // like `SQZ_CMD=SQZ_CMD=ddev SQZ_CMD=ddev ddev exec ...` (reported as
  // a follow-up to issue #5). We skip if any of these markers appear:
  //   * the case-insensitive substring "sqz_cmd=" or "sqz compress"
  //     (covers the tail of prior wraps regardless of case)
  //   * a leading `VAR=` assignment that starts with SQZ_
  //     (defensive catch-all for exotic wrap variants)
  //   * the base command itself is sqz or sqz-mcp (running sqz directly
  //     — compressing sqz's own output is pointless and causes loops)
  function isAlreadyWrapped(cmd: string): boolean {
    const lowered = cmd.toLowerCase();
    if (lowered.includes("sqz_cmd=")) return true;
    if (lowered.includes("sqz compress")) return true;
    if (lowered.includes("| sqz ") || lowered.includes("| sqz\t")) return true;
    if (/^\s*SQZ_[A-Z0-9_]+=/.test(cmd)) return true;
    const base = extractBaseCmd(cmd);
    if (base === "sqz" || base === "sqz-mcp" || base === "sqz.exe") return true;
    return false;
  }

  // Extract the base command name defensively. If the command has
  // leading env-var assignments (VAR=val VAR2=val2 actual_cmd arg1),
  // skip past them so the base is `actual_cmd` — not `VAR=val`.
  function extractBaseCmd(cmd: string): string {
    const tokens = cmd.split(/\s+/).filter(t => t.length > 0);
    for (const tok of tokens) {
      // A token is an env assignment if it matches NAME=VALUE where NAME
      // is a valid env var identifier. Skip it and keep looking.
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;
      return tok.split("/").pop() ?? "unknown";
    }
    return "unknown";
  }

  return {
    "tool.execute.before": async (input: any, output: any) => {
      const tool = input.tool ?? "";
      if (!shouldIntercept(tool)) return;

      const cmd = output.args?.command ?? "";
      if (!cmd || isAlreadyWrapped(cmd) || isInteractive(cmd)) return;

      // Rewrite: pipe through sqz compress
      const base = extractBaseCmd(cmd);
      output.args.command = `SQZ_CMD=${base} ${cmd} 2>&1 | ${SQZ_PATH} compress`;
    },
  };
};
