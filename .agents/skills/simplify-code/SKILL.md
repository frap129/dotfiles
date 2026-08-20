---
name: simplify-code
description: Use when settled, recently changed code may be unnecessarily complex, duplicated, large, or inefficient and behavior must remain unchanged.
argument-hint: "[blank to simplify current branch changes, or describe what to simplify]"
---

# Simplify Code

Use deterministic, language-specific analysis to select simplification candidates. Human review may explain or fix a measured candidate; visual density, taste, and reviewer preference may not create one.

## Setup

Run once at the start, before analysis or subagent dispatch. Replace only the path placeholder, then run the fence unfiltered. If only one of the `=== skill context` and `CE_CONTEXT_END` markers appears, rerun the resolved fence verbatim once. Otherwise never rerun it during this invocation. Continue unchanged if Node is unavailable.

```bash
SKILL_DIR="<absolute path of the directory containing the SKILL.md you just read>";
NODE="$(for c in node nodejs; do command -v "$c" >/dev/null 2>&1 && "$c" -e '' >/dev/null 2>&1 && { echo "$c"; break; }; done)";
if [ -n "$NODE" ]; then
"$NODE" "$SKILL_DIR/scripts/context.mjs" || echo "context script failed; continue with the skill's normal behavior";
else
echo "no Node runtime; continue with the skill's normal behavior";
fi
```

## 1. Resolve scope

Use the first non-empty source:

1. User-named files or directories; never widen them.
2. Current git branch versus its base; without a usable base, `git diff HEAD`.
3. Files edited earlier in the conversation.

If none exists, ask what to simplify. Exclude documentation, generated or vendored code, dependencies, lockfiles, and mechanical churn. Stop if no human-authored code remains.

## 2. Measure before reviewing

Read `references/language-tools.md`. Group scoped files by language. Measure every supported signal—cyclomatic complexity, cognitive complexity, function size, and duplication—choosing a tool separately for each signal in this order:

1. Repository-configured analyzer and threshold for that signal.
2. Already-installed language-specific analyzer.
3. Ephemeral language-specific analyzer from the reference, pinned to an explicit version when the package manager supports it. Do not modify manifests or lockfiles.

Run analyzers against the resolved files, not the whole repository unless the tool cannot scope input. Capture machine-readable output when available. Record the tool, version, command, thresholds, and result.

A changed function or clone is a **candidate** only when it crosses a configured threshold, or these defaults when none is configured:

| Signal | Default candidate threshold |
|---|---:|
| Cyclomatic complexity | `> 10` |
| Cognitive complexity | `> 15` |
| Function size | `> 50` analyzer-reported lines or statements |
| Duplication | analyzer reports a clone of at least 5 lines and 50 tokens |

Default comparisons are strict: equality does not qualify. Repository-configured comparison semantics remain authoritative. Use only metrics the selected analyzer actually computes. Do not manually estimate scores, substitute indentation or branch counts, invent results, or treat lint success as complexity analysis. If one signal is unavailable, continue measuring the others. If no listed analyzer supports any signal for a scoped language, report it as unsupported and do not select candidates for that language by inspection.

Save the baseline results. If no threshold-crossing candidates exist, report the measurements, state that reviewers and verification were not run because the deterministic gate found no candidates, and stop without edits.

## 3. Review measured candidates

Limit review and edits to reported functions, clone regions, and their necessary in-scope seams.

Dispatch the code-reuse and efficiency reviewers in parallel where subagents are available. Read and pass each full prompt asset verbatim with the candidate locations, analyzer evidence, and relevant code:

- `references/personas/code-reuse-reviewer.md`
- `references/personas/efficiency-reviewer.md`

If dispatch is unavailable or fails after correcting the invocation once, run that pass inline and disclose the substitution. A concurrency limit is backpressure: queue the pass until a slot frees. Inherit the parent model unless the harness exposes a valid mid-tier override. Omit permission-mode overrides.

Reviewer findings cannot widen the candidate set. Apply a change only when it:

- reduces or removes at least one triggering metric or clone;
- preserves outputs, errors, side effects, and ordering;
- fits the user-named mutation boundary; and
- does not remove trust-boundary validation, data-loss protection, security checks, or accessibility behavior.

Skip findings that fail any condition. Preserve deliberate structural decisions supplied by the caller.

## 4. Verify

Rerun the same analyzers with the same versions, commands, and thresholds. The triggering measurement must improve and no scoped metric may regress past a threshold. A duplication fix must remove the reported clone.

Run project lint and typecheck, plus tests matched to the blast radius. Fix simplification-caused failures or revert the responsible change; never weaken types, assertions, or tests. State explicitly when a check is not configured.

## 5. Report

Report:

- analyzer, version, command, and threshold per language;
- before/after metrics for every edited candidate;
- unsupported languages and unavailable metrics;
- applied and skipped reviewer findings; and
- lint, typecheck, and test outcomes.

If nothing changed, say so. Do not use lines removed or subjective readability as the success metric.
