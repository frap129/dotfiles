#!/usr/bin/env node

// src/core/hook.ts
import { existsSync as existsSync2, readFileSync as readFileSync5 } from "fs";

// src/core/bank.ts
import { existsSync } from "fs";
import { homedir as homedir2 } from "os";
import { basename, dirname as dirname3, join as join4, normalize, sep } from "path";

// src/core/diag.ts
import { join as join2 } from "path";

// src/core/log.ts
import { appendFileSync, mkdirSync, renameSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
function logsDir() {
  return join(homedir(), ".hindsight", "coding-agents-logs");
}
var LOG_MAX_BYTES = 10 * 1024 * 1024;
function appendLogLine(file, text) {
  mkdirSync(dirname(file), { recursive: true, mode: 448 });
  try {
    if (statSync(file).size >= LOG_MAX_BYTES) renameSync(file, `${file}.1`);
  } catch {
  }
  appendFileSync(file, text, { mode: 384 });
}
var WEIGHT = { debug: 10, info: 20, warn: 30, error: 40 };
var current = ["debug", "info", "warn", "error"].find(
  (l) => l === process.env.HINDSIGHT_LOG_LEVEL
) ?? "info";
function setLogLevel(level) {
  if (!process.env.HINDSIGHT_LOG_LEVEL) current = level;
}
function logFilePath() {
  return process.env.HINDSIGHT_LOG_FILE || join(logsDir(), "plugin.log");
}
function write(level, scope, msg, extra) {
  if (WEIGHT[level] < WEIGHT[current]) return;
  try {
    appendLogLine(
      logFilePath(),
      `${(/* @__PURE__ */ new Date()).toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}` + (extra && Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : "") + "\n"
    );
  } catch {
  }
}
var log = {
  debug: (scope, msg, extra) => write("debug", scope, msg, extra),
  info: (scope, msg, extra) => write("info", scope, msg, extra),
  warn: (scope, msg, extra) => write("warn", scope, msg, extra),
  error: (scope, msg, extra) => write("error", scope, msg, extra)
};
function describeError(value, maxChars = 200) {
  const parts = [];
  const seen = /* @__PURE__ */ new Set();
  let current2 = value;
  while (current2 && !seen.has(current2)) {
    seen.add(current2);
    const error = current2;
    const text = typeof error.message === "string" ? error.message : String(current2);
    const withCode = error.code ? `${text} (${String(error.code)})` : text;
    if (withCode && parts.at(-1) !== withCode) parts.push(withCode);
    current2 = error.cause;
  }
  return (parts.join(": ") || String(value)).slice(0, maxChars);
}

// src/core/diag.ts
function diagFilePath() {
  return process.env.HINDSIGHT_DIAG_FILE || join2(logsDir(), "diag.jsonl");
}
function diag(harness, event, extra = {}) {
  log.debug(harness, `diag:${event}`, extra);
  try {
    appendLogLine(
      diagFilePath(),
      JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), harness, event, ...extra }) + "\n"
    );
  } catch {
  }
}

// src/core/git-layout.ts
import { lstatSync, readFileSync, realpathSync } from "fs";
import { dirname as dirname2, isAbsolute, join as join3, resolve } from "path";
var TRANSIENT = /* @__PURE__ */ new Set(["EAGAIN", "EMFILE", "ENFILE", "EBUSY", "EINTR", "EIO", "ETIMEDOUT"]);
var ATTEMPTS = 3;
var BACKOFF_MS = 20;
function errorCode(error) {
  return error?.code ?? "";
}
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
var TransientProbeError = class extends Error {
};
function entryKind(path) {
  try {
    const st = lstatSync(path);
    return st.isDirectory() ? "dir" : "file";
  } catch (error) {
    if (TRANSIENT.has(errorCode(error))) throw new TransientProbeError(errorCode(error));
    return "none";
  }
}
function readTextOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (TRANSIENT.has(errorCode(error))) throw new TransientProbeError(errorCode(error));
    return null;
  }
}
function gitDirFromPointer(text, holder) {
  const match = /^\s*gitdir:\s*(.+?)\s*$/m.exec(text);
  if (!match) return null;
  const target = match[1];
  return isAbsolute(target) ? target : resolve(holder, target);
}
function commonDirOf(gitDir) {
  const pointer = entryKind(join3(gitDir, "commondir")) === "file" ? readTextOrNull(join3(gitDir, "commondir"))?.trim() : null;
  if (!pointer) return gitDir;
  return isAbsolute(pointer) ? pointer : resolve(gitDir, pointer);
}
function isBare(commonDir) {
  const config = readTextOrNull(join3(commonDir, "config"));
  return config !== null && /^\s*bare\s*=\s*true\s*$/im.test(config);
}
function looksLikeBareRepository(directory) {
  return entryKind(join3(directory, "HEAD")) === "file" && entryKind(join3(directory, "objects")) === "dir" && entryKind(join3(directory, "refs")) === "dir";
}
function canonical(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
function resolved(commonDir) {
  if (entryKind(commonDir) !== "dir") return null;
  const canonicalDir = canonical(commonDir);
  return { status: "resolved", commonDir: canonicalDir, bare: isBare(canonicalDir) };
}
function probeOnce(directory) {
  let current2 = resolve(directory);
  for (; ; ) {
    const dotGit = join3(current2, ".git");
    const kind = entryKind(dotGit);
    if (kind === "dir") {
      const layout = resolved(commonDirOf(dotGit));
      if (layout) return layout;
    } else if (kind === "file") {
      const text = readTextOrNull(dotGit);
      const gitDir = text ? gitDirFromPointer(text, current2) : null;
      const layout = gitDir ? resolved(commonDirOf(gitDir)) : null;
      if (layout) return layout;
    }
    if (looksLikeBareRepository(current2)) {
      const layout = resolved(current2);
      if (layout) return layout;
    }
    const parent = dirname2(current2);
    if (parent === current2) return { status: "absent" };
    current2 = parent;
  }
}
function probeGitLayout(directory) {
  if (!directory) return { status: "absent" };
  let last = "";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt) sleepSync(BACKOFF_MS * attempt);
    try {
      return probeOnce(directory);
    } catch (error) {
      last = error instanceof TransientProbeError ? error.message : errorCode(error) || "unknown";
    }
  }
  return { status: "failed", reason: last };
}

// src/core/template.ts
var PLACEHOLDER = /\{([a-zA-Z_]+)\}/g;
function applyTemplate(template, resolvers, what) {
  return template.replace(PLACEHOLDER, (_, name) => {
    const resolve3 = resolvers[name];
    if (!resolve3) {
      console.error(
        `hindsight: unknown ${what} placeholder "{${name}}" \u2014 valid: ` + Object.keys(resolvers).sort().map((k) => `{${k}}`).join(", ")
      );
      return "unknown";
    }
    return resolve3();
  });
}

// src/core/bank.ts
var DEFAULT_BANK_NAME = "coding";
var DEFAULT_TEMPLATE = "coding-agent::{gitProject}";
var BankResolutionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "BankResolutionError";
  }
};
function resolveProjectRoot(directory) {
  if (!directory) return { status: "absent" };
  const layout = probeGitLayout(directory);
  if (layout.status !== "resolved") return layout;
  const commonDir = layout.commonDir;
  if (basename(commonDir) === ".git") return { status: "resolved", root: dirname3(commonDir) };
  if (basename(commonDir).startsWith(".") && layout.bare) {
    return { status: "resolved", root: dirname3(commonDir) };
  }
  return { status: "resolved", root: commonDir };
}
function projectNameOf(directory, sessionRoot) {
  return gitProjectName(directory, true, sessionRoot);
}
var PROJECT_ROOT_ENV = ["CLAUDE_PROJECT_DIR"];
function nearestExistingDir(directory) {
  let current2 = directory;
  while (current2) {
    if (existsSync(current2)) return current2;
    const parent = dirname3(current2);
    if (parent === current2) return "";
    current2 = parent;
  }
  return "";
}
function dirName(directory) {
  return directory && basename(directory) || "unknown";
}
function mainWorktreeRoot(directory, sessionRoot = "") {
  const candidates = [
    nearestExistingDir(directory),
    sessionRoot,
    ...PROJECT_ROOT_ENV.map((v) => process.env[v] || "")
  ];
  let failure = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const projectRoot = resolveProjectRoot(candidate);
    if (projectRoot.status === "resolved") return projectRoot;
    if (projectRoot.status === "failed") failure = projectRoot;
  }
  return failure ?? { status: "absent" };
}
function gitProjectName(directory, resolveWorktrees, sessionRoot = "") {
  if (resolveWorktrees) {
    const projectRoot = mainWorktreeRoot(directory, sessionRoot);
    if (projectRoot.status === "resolved") return basename(projectRoot.root);
    if (projectRoot.status === "failed") {
      throw new BankResolutionError(
        `git probe failed for ${directory} (${projectRoot.reason}) \u2014 refusing to guess a bank id`
      );
    }
  }
  return dirName(sessionRoot || directory);
}
function configuredDir(dir) {
  const expanded = dir === "~" || dir.startsWith("~/") ? join4(homedir2(), dir.slice(1)) : dir;
  return normalize(expanded).replace(new RegExp(`\\${sep}+$`), "");
}
function isWithin(directory, configured) {
  return directory === configured || directory.startsWith(configured + sep);
}
function mapLookup(map, directory) {
  const cwd = normalize(directory);
  let best;
  for (const [dir, bank] of Object.entries(map)) {
    const p = configuredDir(dir);
    if (isWithin(cwd, p)) {
      if (!best || p.length > best.len) best = { len: p.length, bank };
    }
  }
  return best?.bank;
}
function lookupDirectories(config, directory, sessionRoot = "") {
  const directories = [normalize(directory)];
  if (config.resolveWorktrees ?? true) {
    const projectRoot = mainWorktreeRoot(directory, sessionRoot);
    const normalizedRoot = projectRoot.status === "resolved" ? normalize(projectRoot.root) : "";
    if (normalizedRoot && normalizedRoot !== directories[0]) directories.push(normalizedRoot);
  }
  return directories;
}
function isOptedIn(config, directory) {
  if (!config.optInOnly) return true;
  if (!directory) return false;
  const directories = lookupDirectories(config, directory);
  if (directories.some(
    (candidate) => (config.optInPaths ?? []).some(
      (configured) => configured && isWithin(candidate, configuredDir(configured))
    )
  ))
    return true;
  const pathMap = config.mapPathToBank;
  return Boolean(pathMap && directories.some((candidate) => mapLookup(pathMap, candidate)));
}
function mappedBank(config, directory, sessionRoot) {
  const pathMap = config.mapPathToBank;
  if (!directory || !pathMap) return void 0;
  return lookupDirectories(config, directory, sessionRoot).map((candidate) => mapLookup(pathMap, candidate)).find((bank) => bank !== void 0);
}
function deriveBankId(config, directory, harness = "coding", sessionRoot) {
  const mapped = mappedBank(config, directory, sessionRoot);
  if (mapped) return mapped;
  const dynamic = config.dynamicBankId ?? !config.bankId;
  if (!dynamic) return config.bankId || DEFAULT_BANK_NAME;
  const resolvers = {
    harness: () => harness,
    project: () => dirName(directory),
    gitProject: () => gitProjectName(directory, config.resolveWorktrees ?? true, sessionRoot),
    channel: () => process.env.HINDSIGHT_CHANNEL_ID || "default",
    user: () => process.env.HINDSIGHT_USER_ID || "anonymous"
  };
  return applyTemplate(config.bankIdTemplate || DEFAULT_TEMPLATE, resolvers, "bankIdTemplate");
}
function deriveBankIdOrSkip(config, directory, harness = "coding", sessionRoot) {
  try {
    return deriveBankId(config, directory, harness, sessionRoot);
  } catch (error) {
    if (!(error instanceof BankResolutionError)) throw error;
    log.warn(harness, "bank unresolved: skipping (repository could not be identified)", {
      directory,
      error: error.message
    });
    diag(harness, "bank_unresolved", { directory, error: error.message });
    return null;
  }
}

// src/core/config.ts
import { readFileSync as readFileSync2 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join7 } from "path";

// src/core/seed.ts
import { spawn as realSpawn } from "child_process";
import { dirname as dirname4, join as join5 } from "path";
import { fileURLToPath } from "url";
var DEFAULT_SEED_LIMIT = 300;
function startBackgroundSeed(repoDir, opts = {}) {
  try {
    const spawnFn = opts.spawn ?? realSpawn;
    const enginePath = opts.enginePath ?? join5(dirname4(fileURLToPath(import.meta.url)), "deepen.js");
    const limit = opts.limit ?? DEFAULT_SEED_LIMIT;
    const child = spawnFn(
      "node",
      [
        enginePath,
        "--repo",
        repoDir,
        "--gitlog-limit",
        String(limit),
        ...opts.harness ? ["--harness", opts.harness] : []
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }
    );
    child.on("error", () => {
    });
    child.unref();
  } catch {
  }
}

// src/core/missions.ts
import { createHash } from "crypto";
var GIT_MISSION = "You are ingesting a single git commit: its message and its full diff. Extract the concrete technical DECISION and the CAUSE/INVARIANT it encodes, bound to the specific code entities (functions, methods, files) and behaviors it changes. Preserve exact identifiers, paths, and literal values verbatim. Preserve the 'REF-ID: <token>' marker verbatim in every fact. Capture both WHAT changed and WHY. Issue/PR references (#123, GH-123, PROJ-123) are load-bearing: keep them VERBATIM in the fact text and emit each as an ENTITY, so a later question about that issue or PR retrieves this decision.";
var GITLOG_MISSION = "You are ingesting an aggregated block of git commit MESSAGES ONLY (no diffs) \u2014 the project's recent commit-message history, newest first. Extract the project's INITIATIVES, FEATURES, ENHANCEMENTS, and notable changes or THEMES over time \u2014 what the project has been working on and how it has evolved. Do NOT extract per-line code detail (there is no diff to draw it from). Group related commits into a coherent initiative/theme where the messages make that clear; preserve exact identifiers and literal values verbatim when quoting a subject line. Keep issue/PR references (#123, GH-123) VERBATIM and emit each as an ENTITY \u2014 they are how future sessions will ask about this work.";
var CONVERSATION_MISSION = `You are ingesting a developer conversation as a JSONL transcript (one {role, content} turn per line): the user's requests, the assistant's narration, and compact 'action' turns naming each tool use and its target (e.g. "Edit boltons/strutils.py") with no arguments or outputs. It may be a SHORT decision chat or a LONG working session \u2014 scale the facts to the substance, never to the message count. Extract the FEWEST facts that capture the OUTCOME: the settled DECISIONS and their exact rules/values (quote literals VERBATIM); concrete CHANGES to specific code entities; problems and how they were resolved; conventions or invariants established; at most one fact for a notable REJECTED alternative ('initially proposed X, changed to Y because Z'). A short decision chat usually yields 1-2 facts; a substantial working session several. CRITICAL: a conversation REVISES itself \u2014 record ONLY the FINAL state as what is in effect; a superseded proposal appears ONLY inside the rejected fact, NEVER as its own 'decided' fact; if the same setting changes several times keep only the LAST, and make unmistakably clear which choice WON. Do NOT emit one fact per message, per intermediate proposal, or per action turn. Keep issue/PR references (#123, GH-123) VERBATIM and emit each as an ENTITY. Preserve the 'REF-ID: <token>' marker verbatim in every fact. Do not invent; capture only what was actually settled.`;
var REFLECT_MISSION = "You are a debugging assistant with the project's past decisions in memory (git rationale and developer chats). Given a bug's SYMPTOM, find the past decision whose rationale explains the ROOT CAUSE \u2014 not one that merely shares vocabulary. Answer with the PRECISE fix: state the EXACT rule and the LITERAL values, identifiers, strings, numbers, or set members that were decided \u2014 quote them VERBATIM, never paraphrase, generalize, or omit them (give the actual decided value, not 'the project standard'). If memories CONFLICT on the same rule, the LATEST decision wins \u2014 prefer facts that explicitly amend or supersede an earlier one, state the superseded rule as no longer in effect, and never present it as the fix. Name the function/file to change and cite the REF-ID(s). If NOTHING in memory genuinely explains THIS symptom, say exactly that in one short sentence \u2014 a wrong-but-confident nearest match is worse than an honest miss; never stretch an unrelated decision to fit.";
var DOCUMENT_MISSION = "You are ingesting a standalone document (notes, docs, or structural findings). Extract the concrete facts, concepts, and structure it describes.";
var OBSERVATIONS_MISSION = "Consolidate durable knowledge about THIS codebase \u2014 recurring patterns, conventions, module responsibilities, and how components relate \u2014 from the ingested commits and conversations. Favor stable structural understanding over one-off details. When a new fact contradicts or supersedes an existing observation, UPDATE that observation to reflect the current state rather than creating a sibling alongside it; note that the rule was revised and when, so the superseded version is visible as history rather than as a competing claim.";
var RETAIN_EXTRACTION_MODES = ["concise", "verbose", "verbatim", "chunks"];
var DEFAULT_RETAIN_EXTRACTION_MODE = "concise";
var RETAIN_STRATEGIES = {
  git: { retain_mission: GIT_MISSION, retain_extraction_mode: DEFAULT_RETAIN_EXTRACTION_MODE },
  // ONE big aggregated document (last N commit messages, no diffs) -> a larger chunk size so it stays
  // in as few chunks as possible and the extractor sees the whole history arc at once.
  gitlog: {
    retain_mission: GITLOG_MISSION,
    retain_extraction_mode: DEFAULT_RETAIN_EXTRACTION_MODE,
    retain_chunk_size: 12e3
  },
  // ONE strategy for ALL developer conversations — backfilled decision chats and live working
  // sessions alike (they are the same content type in the same JSON transcript format; the mission
  // scales extraction to the substance, final-state-wins). Chunk big enough to hold a whole typical
  // conversation in ONE chunk so the extractor sees the full proposal→revision arc (the 3000
  // default SPLIT them into per-chunk fragments); very long sessions still split and fall back to
  // the consolidation layer.
  conversation: {
    retain_mission: CONVERSATION_MISSION,
    retain_extraction_mode: DEFAULT_RETAIN_EXTRACTION_MODE,
    retain_chunk_size: 12e3
  },
  // Structural documents (e.g. the codebase survey's ingested findings) aren't dialogue — the
  // chat strategy's "final decision vs rejected proposal" extraction doesn't apply. A bigger chunk
  // size (documents can run long) keeps the concrete facts/structure together instead.
  document: {
    retain_mission: DOCUMENT_MISSION,
    retain_extraction_mode: DEFAULT_RETAIN_EXTRACTION_MODE,
    retain_chunk_size: 12e3
  },
  // Codebase-SURVEY lifecycle documents, ONE strategy with conditional rules: the survey's
  // internal status markers ("researching…"/"completed" baselines) must yield ZERO memories,
  // while any actual survey findings routed here extract as concrete structural facts.
  survey: {
    retain_extraction_mode: "custom",
    retain_custom_instructions: "This document belongs to the Hindsight codebase-survey lifecycle. Apply ONE of two rules: (1) If the content is an internal status marker \u2014 it says it is an internal marker, or merely announces that a survey started/completed at some commit \u2014 extract NOTHING: return an empty list of facts. (2) Otherwise the content is survey FINDINGS about the codebase: extract the concrete structural facts it states (components and their responsibilities, key concepts, conventions, tech stack), preserving identifiers verbatim.",
    retain_chunk_size: 12e3
  }
};
var KNOWLEDGE_LABELS = {
  key: "knowledge",
  type: "multi-values",
  // 0, 1, or several — empty is normal
  optional: true,
  tag: true,
  // emits knowledge:<value> onto the fact's tags
  description: "Routing labels for this project's Hindsight KNOWLEDGE PAGES \u2014 curated, human-readable summaries of the repo's DURABLE engineering knowledge (architecture, key decisions, conventions, ongoing initiatives), each page rebuilt automatically from the facts labeled for it. Mark a fact only when it is durable, reusable knowledge a developer would still want surfaced in future sessions. IMPORTANT: leave this EMPTY for routine, transient, or operational facts \u2014 a passing test, a one-off command, a status update, a debugging dead-end. MOST facts should get no label here. Assign more than one value only when the fact genuinely fits several.",
  values: [
    {
      value: "feature-work",
      description: "A new feature, initiative, or enhancement being planned or built \u2014 the capability being added and the intent behind it. Not routine bug-fixes or chores."
    },
    {
      value: "decision",
      description: "A technical decision that will constrain future work, with its rationale \u2014 why this approach was chosen over alternatives, or a rule deliberately adopted."
    },
    {
      value: "convention",
      description: "An established way this project does things \u2014 naming, structure, testing, error handling, or another recurring pattern a contributor is expected to follow."
    },
    {
      value: "component",
      description: "What a specific module, file, service, or subsystem is responsible for, or how components depend on and connect to one another."
    },
    {
      value: "concept",
      description: "A domain concept, key abstraction, or piece of project vocabulary a new contributor must understand to work effectively."
    }
  ]
};
function pageScopeRule(project) {
  return ` Scope this page to ${project} ITSELF: the bank also holds facts about external tools, libraries and services that ${project} merely uses, configures, deploys or discusses, and those belong to somebody else's codebase. Include something only when its subject is ${project}'s own code, configuration or process; when it is about a dependency, leave it out however well-evidenced it looks \u2014 including any commit SHA or identifier that belongs to that dependency's repository rather than this one.`;
}
var PAGE_TAXONOMY = [
  {
    name: "Component map",
    source_query: "From this project's commit history and past discussions, what are the main components/modules/subsystems, what is each responsible for, and how do they relate to or depend on one another? Describe the structure and responsibilities.",
    tags: ["knowledge:component"]
  },
  {
    name: "Core concepts",
    source_query: "What are the core concepts, domain abstractions, and key entities in this project \u2014 the vocabulary a developer must understand? For each, explain what it represents and its role, drawn from how they are introduced and discussed across the history and conversations.",
    tags: ["knowledge:concept"]
  },
  {
    name: "Conventions and patterns",
    source_query: "What conventions, idioms, and recurring patterns does this project follow \u2014 its approach to testing, error handling, naming, structure, and how changes are typically made? Describe how THIS project does things, as evidenced across its history and discussions.",
    tags: ["knowledge:convention"]
  },
  {
    name: "Key decisions and rationale",
    source_query: "What are the significant technical decisions made in this project and the rationale behind them \u2014 the durable 'why we do it this way' a developer should know? Summarize the decisions and their reasoning from the commit rationales and past conversations.",
    tags: ["knowledge:decision"]
  },
  {
    name: "Initiatives and enhancements",
    source_query: "Based on this repository's commit history, what are the major initiatives, features, and enhancements the project has worked on? Summarize the themes and notable changes over time. When a source memory's context carries a `[[page:<id>]]` link, repeat that link in the summary of what it describes, so each initiative links to its detailed page.",
    tags: ["knowledge:feature-work"]
  }
];
var PAGE_NAMES = PAGE_TAXONOMY.map((page) => page.name);
function pagesFor(project, pages = {}, customPages = {}) {
  const scope = pageScopeRule(project);
  const byName = new Map(
    Object.entries(pages).map(([name, override]) => [name.trim().toLowerCase(), override])
  );
  const out = [];
  for (const page of PAGE_TAXONOMY) {
    const override = byName.get(page.name.toLowerCase());
    if (override === false) continue;
    out.push({ ...page, source_query: (override?.source_query || page.source_query) + scope });
  }
  for (const [name, page] of Object.entries(customPages)) {
    out.push({ name: name.trim(), source_query: page.source_query + scope, tags: page.tags ?? [] });
  }
  return out;
}
var PAGE_MAX_TOKENS = 4096;
var PAGE_TAGS_MATCH = "all";
var PAGE_FACT_TYPES = ["world", "experience", "observation"];
var DEFAULT_PAGE_TRIGGER_CRON = "H * * * *";
var CRON_FIELD_RANGES = [
  [0, 59],
  // minute
  [0, 23],
  // hour
  [1, 31],
  // day of month
  [1, 12],
  // month
  [0, 6]
  // day of week
];
var HASHED_FIELD = /^H(?:\((\d+)-(\d+)\))?$/;
function isHashedCron(cron) {
  return /(^|\s)H/.test(cron);
}
function parseHashedCron(cron) {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== CRON_FIELD_RANGES.length) return void 0;
  for (const [i, field] of fields.entries()) {
    if (!field.startsWith("H")) continue;
    const m = HASHED_FIELD.exec(field);
    if (!m) return void 0;
    if (m[1] === void 0) continue;
    const [lo, hi] = [Number(m[1]), Number(m[2])];
    const [min, max] = CRON_FIELD_RANGES[i];
    if (lo > hi || lo < min || hi > max) return void 0;
  }
  return fields;
}
function hashedValue(seed, field, lo, hi) {
  const digest = createHash("sha256").update(`${seed}\0${field}`).digest();
  return lo + digest.readUInt32BE(0) % (hi - lo + 1);
}
function expandCronHash(cron, seed) {
  if (!isHashedCron(cron)) return cron;
  const fields = parseHashedCron(cron);
  if (!fields) return cron;
  return fields.map((field, i) => {
    const m = HASHED_FIELD.exec(field);
    if (!m) return field;
    const [lo, hi] = m[1] === void 0 ? CRON_FIELD_RANGES[i] : [Number(m[1]), Number(m[2])];
    return String(hashedValue(seed, i, lo, hi));
  }).join(" ");
}
function pageTriggerFor(trigger, bank, page) {
  const cron = trigger.refresh_cron;
  if (!cron || !isHashedCron(cron)) return trigger;
  return { ...trigger, refresh_cron: expandCronHash(cron, `${bank}\0${page}`) };
}
function buildPageTrigger(cfg = {}) {
  const base = { fact_types: PAGE_FACT_TYPES, tags_match: PAGE_TAGS_MATCH };
  switch (cfg.pageTriggerType) {
    case "auto-refresh":
      return { ...base, refresh_after_consolidation: true };
    case "manual":
      return { ...base, refresh_after_consolidation: false };
    // "cron" and an unset type alike: the default schedule stands in for a missing expression, so
    // a trigger built from a partial config is never a cron trigger with nothing to fire on.
    default:
      return { ...base, refresh_cron: cfg.pageTriggerCron || DEFAULT_PAGE_TRIGGER_CRON };
  }
}
function pageTriggerDrifted(current2, desired) {
  return current2.tags_match !== desired.tags_match || (current2.refresh_cron ?? null) !== (desired.refresh_cron ?? null) || Boolean(current2.refresh_after_consolidation) !== Boolean(desired.refresh_after_consolidation);
}
function pageTriggerPatch(desired) {
  if (desired.refresh_after_consolidation === false) return { ...desired, refresh_cron: null };
  return desired;
}
var CODING_BANK_TEMPLATE = {
  version: "1",
  bank: {
    reflect_mission: REFLECT_MISSION,
    enable_observations: true,
    observations_mission: OBSERVATIONS_MISSION,
    retain_mission: GIT_MISSION,
    retain_extraction_mode: DEFAULT_RETAIN_EXTRACTION_MODE,
    retain_default_strategy: "git",
    retain_strategies: RETAIN_STRATEGIES,
    entity_labels: [KNOWLEDGE_LABELS],
    entities_allow_free_form: true
  }
};
var MISSION_FIELDS = ["reflect_mission", "retain_mission", "observations_mission"];
function isSet(v) {
  if (v === null || v === void 0) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}
function codingBankManifest(overrides, mode = DEFAULT_RETAIN_EXTRACTION_MODE) {
  const current2 = overrides ?? {};
  const template = CODING_BANK_TEMPLATE.bank;
  const bank = {};
  if (!MISSION_FIELDS.some((f) => isSet(current2[f]))) {
    bank.reflect_mission = template.reflect_mission;
    bank.enable_observations = template.enable_observations;
    bank.observations_mission = template.observations_mission;
    bank.retain_mission = template.retain_mission;
    bank.retain_extraction_mode = mode;
  }
  if (!isSet(current2.retain_default_strategy))
    bank.retain_default_strategy = template.retain_default_strategy;
  if (!isSet(current2.entities_allow_free_form))
    bank.entities_allow_free_form = template.entities_allow_free_form;
  const strategies = current2.retain_strategies && typeof current2.retain_strategies === "object" ? current2.retain_strategies : {};
  const updates = {};
  for (const [name, def] of Object.entries(template.retain_strategies)) {
    const synced = def.retain_extraction_mode === "custom" ? {} : { retain_extraction_mode: mode };
    const have = strategies[name];
    if (!have || typeof have !== "object") updates[name] = { ...def, ...synced };
    else if ("retain_extraction_mode" in synced && have.retain_extraction_mode !== mode)
      updates[name] = { ...have, ...synced };
  }
  if (Object.keys(updates).length > 0) bank.retain_strategies = { ...strategies, ...updates };
  const labels = Array.isArray(current2.entity_labels) ? current2.entity_labels : [];
  const [knowledgeGroup] = template.entity_labels;
  if (!labels.some((g) => g?.key === knowledgeGroup.key))
    bank.entity_labels = [...labels, knowledgeGroup];
  return Object.keys(bank).length > 0 ? { version: "1", bank } : void 0;
}

// src/core/util.ts
import { accessSync, constants } from "fs";
import { delimiter, join as join6 } from "path";
function binOnPath(bin) {
  try {
    if (bin.includes("/")) {
      accessSync(bin, constants.X_OK);
      return true;
    }
    for (const dir of (process.env.PATH || "").split(delimiter)) {
      if (!dir) continue;
      try {
        accessSync(join6(dir, bin), constants.X_OK);
        return true;
      } catch {
      }
    }
    return false;
  } catch {
    return false;
  }
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function semverGte(version, min) {
  const parts = (v) => {
    const m = v.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : void 0;
  };
  const a = version ? parts(version) : void 0;
  const b = parts(min);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}
async function pool(items, n, fn, onError, onProgress) {
  let i = 0, done = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        await fn(items[idx], idx);
      } catch (e) {
        onError?.(idx, e);
      }
      onProgress?.(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

// src/core/hindsight.ts
function resolveRetainScopes(tags, configured) {
  if (configured !== "per_source") return configured;
  const sources = [...new Set((tags ?? []).filter((t) => t.startsWith("source:")))].sort();
  return [[], ...sources.map((s) => [s])];
}
var DEFAULT_OBSERVATION_SCOPES = "shared";
var MIN_IDEMPOTENT_RETAIN_VERSION = "0.8.6";
var RateLimitedError = class extends Error {
  constructor(retryAfterMs2) {
    super(`rate limited; retry after ${Math.round(retryAfterMs2 / 1e3)}s`);
    this.retryAfterMs = retryAfterMs2;
    this.name = "RateLimitedError";
  }
  retryAfterMs;
  code = "rate_limited";
};
function retryAfterMs(header) {
  if (!header) return 0;
  const secs = Number(header.trim());
  if (Number.isFinite(secs) && secs >= 0) return secs * 1e3;
  const at = Date.parse(header);
  return Number.isNaN(at) ? 0 : Math.max(0, at - Date.now());
}
var KnowledgePagesUnavailableError = class extends Error {
  code = "knowledge_pages_unavailable";
  constructor() {
    super("Hindsight server does not support knowledge pages");
    this.name = "KnowledgePagesUnavailableError";
  }
};
async function isEndpointMissing(r) {
  try {
    const j = await r.json();
    return String(j?.detail ?? "").trim().toLowerCase() === "not found";
  } catch {
    return true;
  }
}
var TERMINAL = /* @__PURE__ */ new Set(["completed", "failed", "cancelled", "error"]);
var ReflectError = class extends Error {
  constructor(message, status, timedOut, options) {
    super(message, options);
    this.status = status;
    this.timedOut = timedOut;
    this.name = "ReflectError";
  }
  status;
  timedOut;
  /** A timeout or a 5xx means reflect's synthesis (the slow LLM path) broke, while the cheap
   *  retrieval endpoints may still answer — worth falling back. A 4xx will fail the same way on
   *  every endpoint (auth, missing bank), so it is not. */
  get fallbackEligible() {
    return this.timedOut || this.status !== void 0 && this.status >= 500;
  }
};
var DEFAULT_MAX_PARALLEL_RETAINS = 10;
var DEFAULT_PAGE_SEARCH_LIMIT = 10;
var DEFAULT_RECALL_OPTIONS = {
  types: ["observation"],
  budget: "low",
  max_tokens: 2e3,
  include: { entities: null }
};
var POLL_CYCLE_MS = 5e3;
var RETRY_AFTER_FLOOR_MS = 10 * 1e3;
var RETRY_AFTER_CEILING_MS = 60 * 1e3;
var HindsightClient = class {
  apiUrl;
  /** The credential the NEXT request will sign with — NOT the one the config file holds. The two
   *  diverge exactly when #3600 bites, which is why `hindsight_diagnose` reports both. */
  token;
  tokenProvider;
  bank;
  project;
  opIds = [];
  // async operation ids collected by retain(), for drain()
  /** Tri-state capability probe: unknown until the first page request, then cached. */
  knowledgePagesSupported;
  /** Tri-state capability probe: unknown until the first append-mode retain, then cached. */
  idempotentRetain;
  log;
  maxParallelRetains;
  observationScopes;
  pageSearchLimit;
  recallOptions;
  constructor(o) {
    this.apiUrl = o.apiUrl.replace(/\/$/, "");
    this.token = o.apiToken;
    this.tokenProvider = o.tokenProvider;
    this.bank = o.bank;
    this.project = o.project;
    this.log = o.log ?? (() => {
    });
    this.maxParallelRetains = o.maxParallelRetains || DEFAULT_MAX_PARALLEL_RETAINS;
    this.observationScopes = o.observationScopes ?? DEFAULT_OBSERVATION_SCOPES;
    this.pageSearchLimit = o.pageSearchLimit || DEFAULT_PAGE_SEARCH_LIMIT;
    this.recallOptions = { ...DEFAULT_RECALL_OPTIONS, ...o.recallOptions };
  }
  /** The credential in use, for diagnostics. Never log or report the VALUE — booleans only. */
  get apiToken() {
    return this.token;
  }
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }
  /** Re-read the credential from the live config. Returns whether it actually CHANGED — a retry is
   *  only worth sending if it did, so a genuinely wrong key still surfaces as one 401 rather than
   *  doubling every failing request. */
  refreshToken() {
    if (!this.tokenProvider) return false;
    let next;
    try {
      next = this.tokenProvider();
    } catch {
      return false;
    }
    if (next === this.token) return false;
    this.token = next;
    return true;
  }
  /**
   * The ONE place a request is signed. Every fetch goes through it — the generic `req`, the drain
   * poll and `reflect` — because a 401 recovery wired into only one of them leaves the others
   * failing forever, which is how #3600 read from the outside: hooks worked, in-session tools did
   * not.
   *
   * On a 401 the credential is re-resolved and the request replayed ONCE (its body is already a
   * string, so replay is exact). A 401 means the server did nothing, so replaying is side-effect
   * free even for retain. The retry shares the caller's `signal`, deliberately: one deadline still
   * bounds the whole call.
   */
  async fetchWithAuth(url, init) {
    const send = () => fetch(url, { ...init, headers: this.headers() });
    const r = await send();
    if (r.status !== 401 || !this.refreshToken()) return r;
    return send();
  }
  /** A 401 with no `Authorization` header is a different failure from a rejected key, and the
   *  server answers identically for both — only the client knows which it sent. */
  authHint(status) {
    if (status !== 401) return "";
    return this.token ? " (the configured apiToken was rejected \u2014 check ~/.hindsight/coding-agent.json)" : " (no apiToken is configured, so no Authorization header was sent)";
  }
  bankUrl(suffix = "") {
    return `${this.apiUrl}/v1/default/banks/${encodeURIComponent(this.bank)}${suffix}`;
  }
  /** `tolerate` adds statuses that are returned to the caller instead of thrown (404 always is). */
  async req(method, url, body, tolerate = [], timeoutMs = 15e3) {
    const r = await this.fetchWithAuth(url, {
      method,
      body: body ? JSON.stringify(body) : void 0,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (r.status === 429 && !tolerate.includes(429))
      throw new RateLimitedError(retryAfterMs(r.headers.get("retry-after")));
    if (!r.ok && r.status !== 404 && !tolerate.includes(r.status))
      throw new Error(
        `${method} ${url} -> ${r.status} ${await r.text()}${this.authHint(r.status)}`
      );
    return r;
  }
  /** Retain one memory. ALWAYS async: enqueue extraction server-side and collect its op-id for
   *  drain(). Nothing in this plugin can afford to block a coding agent's hook on extraction. */
  async retain(content, context, documentId, tags, strategy, opts = {}) {
    const item = {
      content,
      context,
      document_id: documentId,
      tags,
      strategy,
      // Sent on EVERY retain, including the server default `combined`, so the scoping a bank's
      // observations were built under is a property of the write rather than of whichever server
      // version happened to process it. Servers older than 0.4.15 ignore the field.
      observation_scopes: resolveRetainScopes(tags, this.observationScopes)
    };
    if (opts.timestamp) item.timestamp = opts.timestamp;
    if (opts.metadata) item.metadata = opts.metadata;
    if (opts.updateMode) item.update_mode = opts.updateMode;
    const body = { items: [item], async: true };
    if (opts.operationId) body.operation_id = opts.operationId;
    const r = await this.req("POST", this.bankUrl("/memories"), body);
    try {
      const j = await r.json();
      if (j.operation_id) this.opIds.push(j.operation_id);
    } catch {
    }
  }
  /**
   * Whether this server honours `operation_id` on an async retain, and can therefore be appended to
   * safely (see MIN_IDEMPOTENT_RETAIN_VERSION). Probed once per client via GET /version; anything
   * unreachable, unparseable or older answers "no", which costs efficiency, never correctness.
   */
  async supportsIdempotentRetain() {
    if (this.idempotentRetain === void 0) {
      this.idempotentRetain = await this.probeIdempotentRetain();
      this.log(`server retain idempotency: ${this.idempotentRetain ? "supported" : "unavailable"}`);
    }
    return this.idempotentRetain;
  }
  async probeIdempotentRetain() {
    try {
      const r = await this.req("GET", `${this.apiUrl}/version`);
      if (!r.ok) return false;
      const j = await r.json();
      return semverGte(j.api_version, MIN_IDEMPOTENT_RETAIN_VERSION);
    } catch {
      return false;
    }
  }
  /**
   * Every document_id currently in the bank under a strategy tag (e.g. `source:git`), paginated into a
   * Set. Powers the incremental git-sync's "what's already ingested?" check — since git commits are stored
   * with document_id `git:<sha>`, the returned Set lets a caller diff a ref's commits against memory.
   */
  async listDocumentIds(tag, tagsMatch = "all") {
    const ids = /* @__PURE__ */ new Set();
    const limit = 500;
    for (let offset = 0; ; offset += limit) {
      const q = `?tags=${encodeURIComponent(tag)}&tags_match=${tagsMatch}&limit=${limit}&offset=${offset}`;
      const r = await this.req("GET", this.bankUrl(`/documents${q}`));
      let items = [];
      let total = 0;
      try {
        const j = await r.json();
        items = j.items || [];
        total = j.total ?? 0;
      } catch {
        break;
      }
      for (const it of items) if (it.id) ids.add(it.id);
      if (items.length < limit || ids.size >= total) break;
    }
    return ids;
  }
  /** Configure the bank: POST the coding bank manifest to /import (missions, retain strategies,
   *  entity labels), then seed knowledge pages when the server supports them. Both halves are
   *  idempotent and ADDITIVE — nothing the bank already says is overwritten (#3927), bar the
   *  extraction mode of the plugin's own strategies, which follows its config (#4560) — so
   *  the deepen engine can re-run this every pass. Creates the bank if missing; legacy servers
   *  continue with the template-only path.
   *
   *  `manage: false` skips the config half entirely, for a bank whose owner shapes it themselves.
   *  That bank should then define the strategies this plugin writes under (`git`, `gitlog`,
   *  `conversation`, `document`, `survey`): an unknown strategy name is not an error server-side,
   *  it just falls back to the bank's own config, so the miss is silent. */
  async configureBank(opts = {}) {
    if (opts.reset) {
      await this.req("DELETE", this.bankUrl());
      this.log(`[bank] reset ${this.bank}`);
    }
    if (opts.manage === false) {
      this.log(`[bank] manageBankConfig: false \u2014 leaving ${this.bank}'s configuration alone`);
    } else {
      const manifest = codingBankManifest(
        opts.reset ? void 0 : await this.readBankOverrides(),
        opts.extractionMode
      );
      if (!manifest) {
        this.log(`[bank] ${this.bank} already carries the coding structure \u2014 nothing to apply`);
      } else {
        await this.req("POST", this.bankUrl("/import"), manifest);
        this.log(`[bank] applied to ${this.bank}: ${Object.keys(manifest.bank).sort().join(", ")}`);
      }
    }
    await this.seedPages(opts.pageTrigger, opts.pages, opts.customPages);
  }
  /**
   * This bank's own config OVERRIDES, or undefined when there are none to read.
   *
   * Deliberately the overrides and not the resolved config: an inherited global default is not
   * something this bank's owner chose, so it must not read as "already set". `undefined` means the
   * bank does not exist yet, or the deployment has the bank-config API switched off — in neither
   * case can anything have been customised, so the caller seeds the full template.
   */
  async readBankOverrides() {
    try {
      const r = await this.req("GET", this.bankUrl("/config"));
      if (!r.ok) return void 0;
      const j = await r.json();
      return j.overrides ?? {};
    } catch {
      return void 0;
    }
  }
  /** Explicitly delete one document (and its cascaded memory units/links). Background sync must
   *  never use this as a cleanup primitive: a document id alone does not prove repository ownership. */
  async deleteDocument(documentId) {
    await this.req("DELETE", this.bankUrl(`/documents/${encodeURIComponent(documentId)}`));
  }
  /** Count of operations still ACTIVE on this bank — the list includes terminal ops (completed/
   *  failed/cancelled), so filter by status. Powers syncStatus's "extractions drained" check. */
  async activeOperations() {
    const r = await this.req("GET", this.bankUrl("/operations"));
    try {
      const j = await r.json();
      const ops = j.operations ?? j.items ?? [];
      return ops.filter((o) => !TERMINAL.has((o?.status || "").toLowerCase())).length;
    } catch {
      return 0;
    }
  }
  /**
   * Poll each enqueued operation by id until terminal. LIST only shows active ops, so per-id GET is reliable.
   *
   * Concurrency is capped at `maxParallelRetains` (the API rate-limits bursts, not single
   * requests — a 200 to a lone GET with 429s under `Promise.all` over every pending op). A 429
   * leaves the op pending and backs the next cycle off by its `Retry-After` (10s floor) instead
   * of hammering the next cycle 5s later.
   */
  async drain(ids, label, maxMs = 60 * 60 * 1e3) {
    if (!ids.length) return;
    this.log(`[wait] draining ${ids.length} ${label} operations \u2026`);
    const start = Date.now();
    const pending = new Set(ids);
    let failed = 0;
    while (pending.size && Date.now() - start < maxMs) {
      let backoffMs = POLL_CYCLE_MS;
      await pool([...pending], this.maxParallelRetains, async (id) => {
        try {
          const r = await this.fetchWithAuth(this.bankUrl(`/operations/${id}`), { method: "GET" });
          if (r.status === 429) {
            backoffMs = Math.min(
              RETRY_AFTER_CEILING_MS,
              Math.max(backoffMs, RETRY_AFTER_FLOOR_MS, retryAfterMs(r.headers.get("retry-after")))
            );
            return;
          }
          if (!r.ok) return;
          const st = ((await r.json()).status || "").toLowerCase();
          if (TERMINAL.has(st)) {
            pending.delete(id);
            if (st !== "completed") failed++;
          }
        } catch {
        }
      });
      if (pending.size) {
        this.log(`  \u2026 ${pending.size}/${ids.length} ${label} ops pending`);
        await sleep(backoffMs);
      }
    }
    this.log(
      `[wait] ${label} drained \u2014 ${ids.length - pending.size} done, ${failed} failed` + (pending.size ? `, ${pending.size} still pending at timeout` : "")
    );
  }
  /**
   * Reflect: synthesized, root-cause answer over the bank. Bounded so a slow server never hangs a
   * caller — but `timeoutMs` is REQUIRED, deliberately: the right deadline differs by an order of
   * magnitude between the automatic hook (20s, to fit the host's window) and the agent-invoked
   * tool (minutes, on a populated bank). This used to default to 120s, which silently overrode the
   * tool's configured window and aborted every high-budget synthesis mid-flight (#3590).
   */
  async reflect(query, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const resp = await this.fetchWithAuth(this.bankUrl("/reflect"), {
        method: "POST",
        body: JSON.stringify({ query, budget: opts.budget ?? "high" }),
        signal: ctrl.signal
      });
      if (!resp.ok)
        throw new ReflectError(
          `reflect ${resp.status} ${(await resp.text()).slice(0, 1e3)}${this.authHint(resp.status)}`,
          resp.status,
          false
        );
      const data = await resp.json();
      return (data.text || "").trim();
    } catch (e) {
      if (ctrl.signal.aborted)
        throw new ReflectError(`reflect timed out after ${opts.timeoutMs}ms`, void 0, true, {
          cause: e
        });
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  /**
   * Raw recall with no LLM in the loop, so it still answers when reflect's synthesis times out or
   * 5xxs. The body is `recallOptions` (consolidated observations by default) — a bank that grows
   * no observations widens it rather than getting nothing back. Returns the texts in rank order.
   *
   * The name predates `recallOptions` (the observation type used to be hardcoded here) and is
   * kept deliberately: this is the client's published surface, so renaming it would break
   * importers for a cosmetic gain. The doc above is the contract, not the name.
   */
  async recallObservations(query, opts) {
    const r = await this.req(
      "POST",
      this.bankUrl("/memories/recall"),
      // `query` is applied AFTER the spread: everything else is the caller's to override, but a
      // config that could replace the goal with a fixed string would silently recall for the
      // wrong question on every turn.
      { ...this.recallOptions, query },
      [],
      opts.timeoutMs
    );
    if (r.status === 404) return [];
    const j = await r.json();
    return (j.results ?? []).map((x) => (x.text ?? "").trim()).filter(Boolean);
  }
  /**
   * Latch `knowledgePagesSupported = false` iff this response really means the endpoint is absent.
   * Returns whether it latched. A bank-not-found 404 is NOT a capability verdict — it is the
   * expected answer before the bank's first retain — so it must never cache a negative (#4607).
   *
   * Only 404 is tested: `req` throws on every other non-ok status it was not told to tolerate, so
   * the 405/501 this used to check for never reach a caller in the first place.
   */
  async pagesUnsupported(r) {
    if (r.status !== 404 || !await isEndpointMissing(r)) return false;
    this.knowledgePagesSupported = false;
    return true;
  }
  /**
   * The bank's knowledge-base tree (folders + pages, nested). The tree carries names, source
   * queries and staleness but NOT synthesized content, so it is cheap enough to poll.
   */
  async tree() {
    if (this.knowledgePagesSupported === false) throw new KnowledgePagesUnavailableError();
    const r = await this.req("GET", this.bankUrl("/knowledge-base/tree"));
    if (await this.pagesUnsupported(r)) throw new KnowledgePagesUnavailableError();
    if (r.status === 404) return [];
    this.knowledgePagesSupported = true;
    try {
      return (await r.json()).roots ?? [];
    } catch {
      return [];
    }
  }
  /**
   * List knowledge pages (ids + names only — no synthesized content), flattened out of the tree
   * and shaped as `{items:[…]}` for `parsePageList`. Folders are dropped: they carry no content
   * to read, and a caller enumerating pages wants leaves, not structure.
   *
   * NOTE the ids are knowledge-base node ids (`kp-…`), NOT the backing mental-model ids. Every
   * page read/update in this client goes through the same knowledge-base ids, so a page id from
   * here, from `searchKnowledgePages`, or from a `[[page:<id>]]` link all resolve identically.
   */
  async listPages() {
    const items = [];
    const walk = (nodes, folder) => {
      for (const n of nodes) {
        if (!n?.id || !n?.name) continue;
        if (n.kind === "page") {
          items.push({
            id: n.id,
            name: n.name,
            ...n.description ? { description: n.description } : {},
            ...folder ? { folder } : {}
          });
        }
        if (n.children?.length) walk(n.children, n.kind === "folder" ? n.name : folder);
      }
    };
    walk(await this.tree());
    return { items };
  }
  /**
   * Read one knowledge page's synthesized content by knowledge-base id, as an OKF document
   * (YAML frontmatter + markdown body). The endpoint omits the internal reflect trace that built
   * the page — that is 70-95% of the raw bytes and can blow past an MCP host's per-tool-result
   * token cap.
   */
  async getPage(pageId) {
    if (this.knowledgePagesSupported === false) throw new KnowledgePagesUnavailableError();
    const r = await this.req(
      "GET",
      this.bankUrl(`/knowledge-base/pages/${encodeURIComponent(pageId)}`)
    );
    if (r.status === 404) throw new Error(`knowledge page not found: ${pageId}`);
    return await r.json();
  }
  /** Hybrid (BM25 + vector, RRF-fused) server-side search over the bank's knowledge pages.
   *  Returns page-level hits with a relevance snippet — the real search behind
   *  hindsight_search_knowledge_pages. */
  async searchKnowledgePages(query, opts = {}) {
    if (this.knowledgePagesSupported === false) throw new KnowledgePagesUnavailableError();
    const q = `?q=${encodeURIComponent(query)}&limit=${opts.limit ?? this.pageSearchLimit}`;
    const r = await this.req(
      "GET",
      this.bankUrl(`/knowledge-base/search${q}`),
      void 0,
      [],
      opts.timeoutMs
    );
    if (await this.pagesUnsupported(r)) throw new KnowledgePagesUnavailableError();
    if (r.status === 404) return [];
    const j = await r.json();
    return (j.results ?? []).map((x) => ({
      id: x.id,
      name: x.name,
      snippet: x.snippet ?? "",
      score: x.score ?? 0
    }));
  }
  /**
   * Seed the fixed page taxonomy as knowledge-base pages at the tree root, idempotently.
   *
   * Matched by NAME, not id: `/knowledge-base/pages` mints its own `kp-…` id, so a stable
   * client-chosen id isn't available to match on (unlike the old mental-model path, which keyed
   * off a slug). Names are unique per folder server-side, which makes them a sound key.
   *
   * An existing page is PATCHed rather than recreated so a plugin upgrade that rewords a
   * `source_query` re-syncs onto the live page instead of orphaning its synthesized content —
   * which is how `pageScopeRule`'s repo name reaches banks seeded by an earlier version.
   */
  async seedPages(pageTrigger = buildPageTrigger(), pagesConfig = {}, customPages = {}) {
    const pages = pagesFor(this.project ?? this.bank, pagesConfig, customPages);
    const existing = /* @__PURE__ */ new Map();
    let roots;
    try {
      roots = await this.tree();
    } catch (e) {
      if (e instanceof KnowledgePagesUnavailableError) {
        this.log(`[bank] knowledge pages unavailable on ${this.apiUrl}; continuing without pages`);
        return;
      }
      throw e;
    }
    for (const n of roots) {
      if (n.kind === "page" && n.name) existing.set(n.name.toLowerCase(), n);
    }
    let created = 0;
    let updated = 0;
    let vanished = 0;
    for (const page of pages) {
      const hit = existing.get(page.name.toLowerCase());
      const body = {
        name: page.name,
        source_query: page.source_query,
        tags: page.tags,
        max_tokens: PAGE_MAX_TOKENS,
        // Resolved HERE, not in `buildPageTrigger`: a hashed cron (`H`) needs the page's identity,
        // and one trigger is built per session for all of them.
        trigger: pageTriggerFor(pageTrigger, this.bank, page.name)
      };
      if (!hit) {
        const r = await this.req("POST", this.bankUrl("/knowledge-base/pages"), body, [409]);
        if (await this.pagesUnsupported(r)) {
          this.log(
            `[bank] knowledge pages unavailable on ${this.apiUrl}; continuing without pages`
          );
          return;
        }
        if (r.status === 404) {
          this.log(`[bank] ${this.bank} does not exist yet; pages seed on the next session`);
          return;
        }
        if (r.status !== 409) created++;
      } else {
        const sourceDrift = hit.description !== page.source_query;
        const triggerDrift = hit.trigger != null && pageTriggerDrifted(hit.trigger, body.trigger);
        if (!sourceDrift && !triggerDrift) continue;
        const patch = {};
        if (sourceDrift) {
          patch.source_query = page.source_query;
          patch.tags = page.tags;
          this.log(
            `[bank] re-syncing "${page.name}" to its configured source_query \u2014 set pages[${JSON.stringify(page.name)}].source_query to keep your own wording`
          );
        }
        if (triggerDrift) patch.trigger = pageTriggerPatch(body.trigger);
        const r = await this.req(
          "PATCH",
          this.bankUrl(`/knowledge-base/nodes/${encodeURIComponent(hit.id)}`),
          patch
        );
        if (await this.pagesUnsupported(r)) {
          this.log(
            `[bank] knowledge pages unavailable on ${this.apiUrl}; continuing without pages`
          );
          return;
        }
        if (r.status === 404) {
          vanished++;
          continue;
        }
        updated++;
      }
    }
    const initiatives = await this.resyncInitiativeTriggers(roots, pageTrigger);
    this.log(
      `[bank] knowledge pages seeded on ${this.bank} (scoped to ${this.project ?? this.bank}): ${created} created, ${updated} re-synced, ${pages.length - created - updated - vanished} unchanged` + (vanished ? `, ${vanished} deleted under us` : "") + (initiatives ? `, ${initiatives} initiative pages re-synced` : "")
    );
  }
  /**
   * Bring the captured initiative pages onto the same refresh policy as the seeded taxonomy.
   *
   * `captureInitiative` stamps this very trigger when it creates a page, so on a bank seeded under
   * an older default they are the same drift as the taxonomy — and on a real repo they are most of
   * it: five taxonomy pages against one page per initiative, each an LLM synthesis per
   * consolidation under the auto-refresh that used to be the default (#3506).
   *
   * Only the trigger is touched. Their `name` and `source_query` are written once, from the
   * initiative's own title, and re-stating either would rebuild a page whose question never
   * changed. The tree read above is reused rather than re-fetched.
   */
  async resyncInitiativeTriggers(roots, pageTrigger) {
    const folder = roots.find(
      (n) => n.kind === "folder" && (n.name || "").toLowerCase() === "initiatives"
    );
    let updated = 0;
    for (const page of folder?.children ?? []) {
      if (page.kind !== "page" || page.trigger == null) continue;
      const desired = pageTriggerFor(pageTrigger, this.bank, page.name);
      if (!pageTriggerDrifted(page.trigger, desired)) continue;
      const r = await this.req(
        "PATCH",
        this.bankUrl(`/knowledge-base/nodes/${encodeURIComponent(page.id)}`),
        { trigger: pageTriggerPatch(desired) }
      );
      if (r.status === 404) continue;
      updated++;
    }
    return updated;
  }
  /** URL/id-safe slug: lowercase, non-alphanumerics → "-", trim dashes, cap length; fallback "initiative". */
  slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "initiative";
  }
  /**
   * Active-path capture: register a major feature as a per-initiative page + a marker memory.
   * New initiative → creates a page under the Initiatives folder.
   * Update (relatesToPageId) → no new page; only a marker accruing to the existing page, so an
   * enhancement or a mid-work plan change lands on the initiative it belongs to.
   *
   * The marker carries its page id in two places, neither of them a tag (#3641):
   * `metadata.relatedPageId` for provenance (visible on the document, and to a reflect loop that
   * expands one), and a `[[page:<id>]]` link in the retain CONTEXT, which is the only one of the
   * three channels a page synthesis actually reads — reflect's search results keep `context` and
   * `tags` but strip `metadata` (`_UNREAD_RESULT_FIELDS`), and the id has no business in a tag
   * vocabulary that exists to be matched with exact set-ops.
   */
  async captureInitiative(args) {
    let pageId = args.relatesToPageId;
    if (!pageId) {
      const folderId = await this.ensureFolder("Initiatives");
      const subject = this.project ?? this.bank;
      const r = await this.req("POST", this.bankUrl("/knowledge-base/pages"), {
        name: args.title,
        source_query: `Summarize the "${args.title}" initiative: what is being built or changed and why, and its current state \u2014 drawn from the project's memory.` + pageScopeRule(subject),
        parent_id: folderId,
        tags: ["knowledge:feature-work"],
        max_tokens: PAGE_MAX_TOKENS,
        trigger: pageTriggerFor(args.pageTrigger ?? buildPageTrigger(), this.bank, args.title)
      });
      try {
        const j = await r.json();
        pageId = j.page_id ?? j.id;
      } catch {
      }
      pageId ||= `initiative-${this.slugify(args.title)}`;
    }
    const verb = args.relatesToPageId ? "Update to an existing initiative" : "New initiative";
    const content = `${verb}: ${args.title}. ${args.summary}`;
    const markerId = `initiative-marker-${this.slugify(args.title)}-${Date.now()}`;
    const tags = [.../* @__PURE__ */ new Set([...args.stamp?.tags ?? [], "knowledge:feature-work"])];
    const context = `initiative marker for [[page:${pageId}]]`;
    await this.retain(content, context, markerId, tags, "document", {
      metadata: { ...args.stamp?.metadata ?? {}, relatedPageId: pageId }
    });
    return { page_id: pageId };
  }
  /** Find a root folder by name (case-insensitive) or create it; returns its id. Fail-open to undefined. */
  async ensureFolder(name) {
    try {
      const tree = await (await this.req("GET", this.bankUrl("/knowledge-base/tree"))).json();
      const hit = (tree.roots || []).find(
        (n) => n.kind === "folder" && (n.name || "").toLowerCase() === name.toLowerCase()
      );
      if (hit?.id) return hit.id;
    } catch {
    }
    try {
      const r = await this.req("POST", this.bankUrl("/knowledge-base/folders"), { name });
      return (await r.json()).id;
    } catch {
      return void 0;
    }
  }
};

// src/core/config.ts
var CONFIG_PATH = process.env.HINDSIGHT_CONFIG || join7(homedir3(), ".hindsight", "coding-agent.json");
var DEFAULT_DAEMON_PORT = 9077;
var DEFAULT_DAEMON_PROFILE = "coding-agent";
function resolvePageTrigger(raw) {
  if (raw.pageTriggerType === "manual") return { type: "manual" };
  if (raw.pageTriggerType === "auto-refresh") return { type: "auto-refresh" };
  if (raw.pageTriggerType !== void 0 && raw.pageTriggerType !== "cron")
    log.warn(
      "config",
      `ignoring pageTriggerType=${JSON.stringify(raw.pageTriggerType)} \u2014 expected cron|auto-refresh|manual`
    );
  const cron = raw.pageTriggerCron?.trim();
  if (!cron) return { type: "cron", cron: DEFAULT_PAGE_TRIGGER_CRON };
  if (!isHashedCron(cron) || parseHashedCron(cron)) return { type: "cron", cron };
  log.warn(
    "config",
    `pageTriggerCron ${JSON.stringify(cron)} has a malformed hashed field \u2014 write \`H\` or \`H(<lo>-<hi>)\` within the field's own range, e.g. "H H(0-5) * * *" \u2014 falling back to ${JSON.stringify(DEFAULT_PAGE_TRIGGER_CRON)}`
  );
  return { type: "cron", cron: DEFAULT_PAGE_TRIGGER_CRON };
}
function resolvePages(raw) {
  const value = raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [name, entry] of Object.entries(value)) {
    if (!PAGE_NAMES.some((known) => known.toLowerCase() === name.trim().toLowerCase())) {
      log.warn(
        "config",
        `ignoring pages[${JSON.stringify(name)}] \u2014 no seeded page has that name; expected one of: ${PAGE_NAMES.join(", ")}`
      );
      continue;
    }
    if (entry === false) {
      out[name] = false;
      continue;
    }
    const query = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.source_query : void 0;
    if (typeof query === "string" && query.trim()) {
      out[name] = { source_query: query };
      continue;
    }
    log.warn(
      "config",
      `ignoring pages[${JSON.stringify(name)}]=${JSON.stringify(entry)} \u2014 expected false, or {"source_query": "<your question>"}`
    );
  }
  return out;
}
function resolveCustomPages(raw) {
  const value = raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [rawName, entry] of Object.entries(value)) {
    const name = rawName.trim();
    if (!name) continue;
    if (PAGE_NAMES.some((known) => known.toLowerCase() === name.toLowerCase())) {
      log.warn(
        "config",
        `ignoring customPages[${JSON.stringify(rawName)}] \u2014 that is a seeded page; reword it under \`pages\` instead`
      );
      continue;
    }
    const query = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.source_query : void 0;
    if (typeof query !== "string" || !query.trim()) {
      log.warn(
        "config",
        `ignoring customPages[${JSON.stringify(rawName)}]=${JSON.stringify(entry)} \u2014 expected {"source_query": "<your question>"}`
      );
      continue;
    }
    const rawTags = entry.tags;
    const tags = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === "string" && t.trim() !== "") : [];
    out[name] = tags.length ? { source_query: query, tags } : { source_query: query };
  }
  return out;
}
var DEFAULT_REFLECT_TIMEOUT_MS = 2e4;
var DEFAULT_REFLECT_TOOL_TIMEOUT_MS = 33e4;
var REFLECT_BUDGETS = ["low", "mid", "high"];
function resolveReflectBudget(raw) {
  const value = raw.reflectBudget;
  if (value === void 0) return "high";
  if (typeof value === "string" && REFLECT_BUDGETS.includes(value))
    return value;
  log.warn("config", `ignoring reflectBudget=${JSON.stringify(value)} \u2014 expected low|mid|high`);
  return "high";
}
var OBSERVATION_SCOPE_MODES = [
  "shared",
  "combined",
  "per_tag",
  "all_combinations",
  "per_source"
];
function resolveObservationScopes(raw) {
  const value = raw;
  if (typeof value === "string")
    return OBSERVATION_SCOPE_MODES.includes(value) ? value : DEFAULT_OBSERVATION_SCOPES;
  if (Array.isArray(value)) {
    const scopes = value.filter((scope) => Array.isArray(scope)).map((scope) => scope.filter((t) => typeof t === "string" && t.trim() !== ""));
    if (scopes.length) return scopes;
  }
  return DEFAULT_OBSERVATION_SCOPES;
}
var AUTO_INJECT_MODES = ["reflect", "pages", "recall", "none"];
function resolveAutoInject(raw) {
  if (raw.autoReflect !== void 0) {
    const replacement = raw.autoReflect === false ? "none" : "reflect";
    log.warn("config", `autoReflect is deprecated \u2014 use autoInject: "${replacement}" instead`);
  }
  if (AUTO_INJECT_MODES.includes(raw.autoInject)) return raw.autoInject;
  return raw.autoReflect === false ? "none" : "reflect";
}
function resolveConfig(raw = {}) {
  const serverMode = ["cloud", "self-hosted", "daemon"].includes(raw.serverMode) ? raw.serverMode : "cloud";
  const apiPort = raw.apiPort || DEFAULT_DAEMON_PORT;
  const pageTrigger = resolvePageTrigger(raw);
  return {
    serverMode,
    // Daemon mode resolves the URL HERE rather than at each call site: every entry point already
    // builds its client from cfg.apiUrl, so collapsing the mode into that one field means the
    // daemon needs no plumbing through eight separate constructors.
    apiUrl: serverMode === "daemon" ? `http://127.0.0.1:${apiPort}` : raw.apiUrl ?? "https://api.hindsight.vectorize.io",
    apiToken: raw.apiToken || void 0,
    apiPort,
    daemonIdleTimeout: raw.daemonIdleTimeout,
    daemonProfile: raw.daemonProfile || DEFAULT_DAEMON_PROFILE,
    embedVersion: raw.embedVersion || void 0,
    embedPackagePath: raw.embedPackagePath || void 0,
    bankId: raw.bankId,
    dynamicBankId: raw.dynamicBankId,
    bankIdTemplate: raw.bankIdTemplate,
    mapPathToBank: raw.mapPathToBank,
    resolveWorktrees: raw.resolveWorktrees,
    optInOnly: raw.optInOnly ?? false,
    // Same shape as retainTags: a config typo must not become a path that silently approves nothing.
    optInPaths: Array.isArray(raw.optInPaths) ? raw.optInPaths.filter((p) => typeof p === "string" && p.trim() !== "") : [],
    harness: raw.harness ?? "opencode",
    disabled: raw.disabled ?? false,
    retainSessions: raw.retainSessions ?? true,
    // write sessions back by default, every harness
    manageBankConfig: raw.manageBankConfig ?? true,
    retainExtractionMode: RETAIN_EXTRACTION_MODES.includes(raw.retainExtractionMode) ? raw.retainExtractionMode : DEFAULT_RETAIN_EXTRACTION_MODE,
    maxParallelRetains: raw.maxParallelRetains || 10,
    reflectTimeoutMs: raw.reflectTimeoutMs || DEFAULT_REFLECT_TIMEOUT_MS,
    // Inherit an explicitly-raised reflectTimeoutMs (that is what users reaching for a longer
    // reflect already set), but never let it LOWER the tool below the default — a short window is
    // set to bound the automatic hook, not to cut off a call the agent is waiting on.
    reflectToolTimeoutMs: raw.reflectToolTimeoutMs || Math.max(raw.reflectTimeoutMs || 0, DEFAULT_REFLECT_TOOL_TIMEOUT_MS),
    reflectBudget: resolveReflectBudget(raw),
    autoInject: resolveAutoInject(raw),
    pageSearchLimit: raw.pageSearchLimit || DEFAULT_PAGE_SEARCH_LIMIT,
    // Same shape as retainMetadata: an object, or nothing. An array would spread into numeric
    // keys and reach the API as garbage, so it is rejected like any other non-object.
    recallOptions: raw.recallOptions && typeof raw.recallOptions === "object" && !Array.isArray(raw.recallOptions) ? { ...raw.recallOptions } : {},
    // Every turn, not every tenth. The guide is what tells the agent WHEN to reach for memory, and
    // at a cadence of 10 a normal session is told once, on turn 1, and never again. Measured over
    // 40 real Claude Code turns, moving this from 10 to 1 took searches from 15% of turns to 32.5%
    // with no wording change at all. The cost is the guide's ~2KB re-sent per turn, which caches.
    pageRefreshEveryTurns: raw.pageRefreshEveryTurns || 1,
    pageTriggerType: pageTrigger.type,
    pageTriggerCron: pageTrigger.cron,
    pages: resolvePages(raw.pages),
    customPages: resolveCustomPages(raw.customPages),
    autoSeed: raw.autoSeed ?? true,
    seedLimit: raw.seedLimit || DEFAULT_SEED_LIMIT,
    codebaseSurvey: raw.codebaseSurvey ?? true,
    surveyModel: raw.surveyModel || "haiku",
    surveyBudgetUsd: raw.surveyBudgetUsd || 2,
    surveyRefreshCommits: raw.surveyRefreshCommits ?? 20,
    gitIngest: ["message", "full", "none"].includes(raw.gitIngest) ? raw.gitIngest : "message",
    // Hostile input is a config typo, not an attack: keep only string entries so a stray number or
    // nested object cannot reach the API as a tag and fail the whole retain.
    retainTags: Array.isArray(raw.retainTags) ? raw.retainTags.filter((t) => typeof t === "string" && t.trim() !== "") : [],
    retainMetadata: raw.retainMetadata && typeof raw.retainMetadata === "object" ? Object.fromEntries(
      Object.entries(raw.retainMetadata).filter(([, v]) => typeof v === "string")
    ) : {},
    observationScopes: resolveObservationScopes(raw.observationScopes),
    banks: raw.banks && typeof raw.banks === "object" ? raw.banks : {},
    logLevel: ["debug", "info", "warn", "error"].includes(raw.logLevel) ? raw.logLevel : "info",
    autoUpdate: raw.autoUpdate ?? true
  };
}
function readRaw(path) {
  try {
    return JSON.parse(readFileSync2(path, "utf8"));
  } catch (e) {
    if (e?.code !== "ENOENT") {
      console.error(`hindsight: ignoring invalid config at ${path}: ${e?.message || e}`);
    }
    return {};
  }
}
function mergeRaw(a, b) {
  const { harnesses: _drop, ...flat } = b;
  return { ...a, ...flat, banks: { ...a.banks ?? {}, ...b.banks ?? {} } };
}
function applyLayer(raw, layer, harness) {
  let out = mergeRaw(raw, layer);
  const perHarness = harness ? layer.harnesses?.[harness] : void 0;
  if (perHarness) out = mergeRaw(out, perHarness);
  return out;
}
var ENV_KEYS = {
  serverMode: "HINDSIGHT_SERVER_MODE",
  apiUrl: "HINDSIGHT_API_URL",
  apiToken: "HINDSIGHT_API_TOKEN",
  // These four keep the names the old per-agent Claude Code plugin used, so a user migrating from
  // it can carry their existing environment over unchanged.
  apiPort: "HINDSIGHT_API_PORT",
  daemonIdleTimeout: "HINDSIGHT_DAEMON_IDLE_TIMEOUT",
  embedVersion: "HINDSIGHT_EMBED_VERSION",
  embedPackagePath: "HINDSIGHT_EMBED_PACKAGE_PATH",
  daemonProfile: "HINDSIGHT_DAEMON_PROFILE",
  bankId: "HINDSIGHT_BANK_ID",
  dynamicBankId: "HINDSIGHT_DYNAMIC_BANK_ID",
  bankIdTemplate: "HINDSIGHT_BANK_ID_TEMPLATE",
  resolveWorktrees: "HINDSIGHT_RESOLVE_WORKTREES",
  optInOnly: "HINDSIGHT_OPT_IN_ONLY",
  optInPaths: "HINDSIGHT_OPT_IN_PATHS",
  harness: "HINDSIGHT_HARNESS",
  disabled: "HINDSIGHT_DISABLED",
  retainSessions: "HINDSIGHT_RETAIN_SESSIONS",
  maxParallelRetains: "HINDSIGHT_MAX_PARALLEL_RETAINS",
  reflectTimeoutMs: "HINDSIGHT_REFLECT_TIMEOUT_MS",
  reflectToolTimeoutMs: "HINDSIGHT_REFLECT_TOOL_TIMEOUT_MS",
  reflectBudget: "HINDSIGHT_REFLECT_BUDGET",
  autoInject: "HINDSIGHT_AUTO_INJECT",
  pageSearchLimit: "HINDSIGHT_PAGE_SEARCH_LIMIT",
  autoReflect: "HINDSIGHT_AUTO_REFLECT",
  pageRefreshEveryTurns: "HINDSIGHT_PAGE_REFRESH_EVERY_TURNS",
  pageTriggerType: "HINDSIGHT_PAGE_TRIGGER_TYPE",
  pageTriggerCron: "HINDSIGHT_PAGE_TRIGGER_CRON",
  autoSeed: "HINDSIGHT_AUTO_SEED",
  seedLimit: "HINDSIGHT_SEED_LIMIT",
  codebaseSurvey: "HINDSIGHT_CODEBASE_SURVEY",
  surveyModel: "HINDSIGHT_SURVEY_MODEL",
  surveyBudgetUsd: "HINDSIGHT_SURVEY_BUDGET_USD",
  surveyRefreshCommits: "HINDSIGHT_SURVEY_REFRESH_COMMITS",
  logLevel: "HINDSIGHT_LOG_LEVEL",
  autoUpdate: "HINDSIGHT_AUTO_UPDATE",
  gitIngest: "HINDSIGHT_GIT_INGEST",
  // Scalar modes only ("shared", "combined", "per_tag", "all_combinations"). An explicit scope
  // list is a list OF lists, which does not survive flattening into one variable — file-only.
  observationScopes: "HINDSIGHT_OBSERVATION_SCOPES",
  // Comma-separated, e.g. HINDSIGHT_RETAIN_TAGS="project:{gitProject},env:work". A LIST rather than
  // a map, so it flattens cleanly; its sibling retainMetadata stays file-only for the reason above.
  retainTags: "HINDSIGHT_RETAIN_TAGS",
  manageBankConfig: "HINDSIGHT_MANAGE_BANK_CONFIG",
  retainExtractionMode: "HINDSIGHT_RETAIN_EXTRACTION_MODE"
};
var ENV_BOOLEANS = /* @__PURE__ */ new Set([
  "dynamicBankId",
  "resolveWorktrees",
  "optInOnly",
  "disabled",
  "retainSessions",
  "autoReflect",
  "autoSeed",
  "codebaseSurvey",
  "autoUpdate",
  "manageBankConfig"
]);
var ENV_LISTS = /* @__PURE__ */ new Set(["retainTags", "optInPaths"]);
var ENV_NUMBERS = /* @__PURE__ */ new Set([
  "apiPort",
  "daemonIdleTimeout",
  "maxParallelRetains",
  "reflectTimeoutMs",
  "reflectToolTimeoutMs",
  "pageSearchLimit",
  "pageRefreshEveryTurns",
  "seedLimit",
  "surveyBudgetUsd",
  "surveyRefreshCommits"
]);
function readEnvConfig(env = process.env) {
  const out = {};
  for (const [key, name] of Object.entries(ENV_KEYS)) {
    const value = env[name];
    if (value === void 0 || value.trim() === "") continue;
    if (ENV_BOOLEANS.has(key)) {
      out[key] = ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    } else if (ENV_LISTS.has(key)) {
      const items = value.split(",").map((v) => v.trim()).filter(Boolean);
      if (items.length) out[key] = items;
    } else if (ENV_NUMBERS.has(key)) {
      const n = Number(value);
      if (Number.isFinite(n)) out[key] = n;
      else console.error(`hindsight: ignoring ${name}=${value} \u2014 not a number`);
    } else {
      out[key] = value;
    }
  }
  return out;
}
function loadConfig(opts = {}) {
  const o = typeof opts === "string" ? { path: opts } : opts;
  const withEnv = applyLayer({}, readEnvConfig(), o.harness);
  const raw = applyLayer(withEnv, readRaw(o.path ?? CONFIG_PATH), o.harness);
  if (!raw.harness && o.harness) raw.harness = o.harness;
  return resolveConfig(raw);
}
var BANK_OVERRIDE_EXCLUDED = [
  "bankId",
  "bankIdTemplate",
  "mapPathToBank",
  "dynamicBankId",
  "resolveWorktrees",
  // Approval is decided BEFORE the bank is resolved, so a `banks.<id>` section naming these could
  // only ever arrive too late to matter — strip them rather than let them read as effective.
  "optInOnly",
  "optInPaths",
  "harness"
];
function applyBankConfig(cfg, resolvedId, directory) {
  if (directory !== void 0 && !isOptedIn(cfg, directory))
    return { cfg: { ...cfg, disabled: true }, bankId: resolvedId };
  const section = cfg.banks[resolvedId];
  if (!section) return { cfg, bankId: resolvedId };
  const safe = { ...section };
  for (const k of BANK_OVERRIDE_EXCLUDED) delete safe[k];
  delete safe.banks;
  const bankId = typeof safe.bank === "string" && safe.bank ? safe.bank : resolvedId;
  delete safe.bank;
  return { cfg: { ...cfg, ...resolvePartial(cfg, safe) }, bankId };
}
function resolvePartial(cfg, patch) {
  const full = resolveConfig(patch);
  const out = {};
  for (const key of Object.keys(patch)) {
    if (key in full)
      out[key] = full[key];
  }
  if ("autoReflect" in patch && !("autoInject" in patch)) out.autoInject = full.autoInject;
  return out;
}

// src/core/brand.ts
function brandWord() {
  const start = [0, 116, 217];
  const end = [0, 146, 150];
  const word = "Hindsight";
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const t = i / (word.length - 1);
    const [r, g, b] = start.map((s, k) => Math.round(s + (end[k] - s) * t));
    out += `\x1B[38;2;${r};${g};${b}m${word[i]}`;
  }
  return `${out}\x1B[0m`;
}

// src/core/knowledge-injection.ts
function parsePageList(raw) {
  const items = raw?.items;
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const it of items) {
    const id = it?.id;
    const name = it?.name;
    if (typeof id === "string" && typeof name === "string") out.push({ id, title: name });
  }
  return out;
}
var EMPTY_STATE = "No knowledge pages yet \u2014 Hindsight is still learning this repo; they'll appear as it processes.";
function indexLine(pages) {
  const count = pages.length === 1 ? "1 knowledge page covers" : `${pages.length} knowledge pages cover`;
  return `${count} this repository \u2014 architecture, conventions, past decisions and in-flight initiatives. They are deliberately NOT listed here: call hindsight_search_knowledge_pages(query) to find the ones that bear on the current turn, then hindsight_read_knowledge_page(<id>) on anything the results show is worth reading in full.`;
}
var TOOL_GUIDE = `- hindsight_search_knowledge_pages(query) \u2014 FIRST STOP, and the way IN to everything below. The code shows what is true today, never what was decided or why, so work built from code alone quietly re-litigates settled questions. Search BEFORE you act whenever the turn is one of these \u2014 they are the ones that go wrong silently:
    \u2022 the user reports a bug or a wrong response (the intended behaviour, and the status code or value it should return, is usually already decided);
    \u2022 you are about to write or change a test (what this project expects a change to ship with, and how it asserts, is a convention, not a preference);
    \u2022 you are implementing something new, or two parts have to fit together;
    \u2022 the user asks why something is the way it is, or what is left to do;
    \u2022 you are about to commit, and need to know what the change was supposed to honour.
  It ranks the pages by relevance and returns the matching passage, which a page title cannot tell you.
  CREDITING IS NOT OPTIONAL AND NOT A JUDGEMENT CALL. If you called this tool and anything it returned reached your reply \u2014 quoted, paraphrased, or merely confirming what you were about to say \u2014 open that part with a markdown blockquote, exactly: "> \u{1F9E0} **From Hindsight memory (<page>)** \u2014 <the specific facts you drew on>". Rewriting a snippet in your own words does not make it yours. A search that turned up nothing useful needs no mention at all \u2014 just carry on.
- hindsight_list_knowledge_pages / hindsight_read_knowledge_page \u2014 BEFORE substantial work, list the pages and read the relevant ones to ground yourself in this repo's architecture, conventions, and past decisions instead of re-deriving them from the code; follow any [[page:<id>]] links you see.
- hindsight_reflect(query) \u2014 when pages are too shallow and you need the WHY: deep reasoning over the repo's full memory for the past decision and exact values that explain a behavior or bug (slower \u2014 use deliberately, and credit results with a blockquote header "> \u{1F9E0} **From Hindsight memory** \u2014 <summary>").
- hindsight_capture_initiative(title, summary) \u2014 right after the user approves a plan or finishes brainstorming a new feature/capability and you are about to start implementing (BEFORE you write any code), call this to record it as a tracked page; then call it AGAIN with relates_to_page_id set to that page whenever the goal, scope, or rationale materially changes mid-work, so the page tracks the current plan and not the opening one. Skip bug fixes, small tweaks, chores, and trivial course-corrections.
- hindsight_ingest_document(title, content) \u2014 save an external document or durable notes/findings you want remembered (not the current conversation \u2014 that is captured automatically at session end).`;
var PAGES_FIRST_ON_GOALS = "- The user just set a NEW task or goal \u2192 search the knowledge pages FIRST with hindsight_search_knowledge_pages. No synthesis is injected automatically in this configuration; call hindsight_reflect only when those pages are too shallow and deeper reasoning is needed.\n";
function toolGuide(opts) {
  return (opts?.reflectOnNewGoals ? PAGES_FIRST_ON_GOALS : "") + TOOL_GUIDE;
}
function buildKnowledgePreamble(pages, opts) {
  const body = pages.length ? indexLine(pages) : EMPTY_STATE;
  return `<hindsight_knowledge>
This repository has a Hindsight memory + knowledge base (curated, continuously-updated pages plus the raw memory behind them). The tools below are registered, but you must actually CALL them at the right moments:
${toolGuide(opts)}
ALSO your correction tool: when you verify a Hindsight memory is wrong or stale, ingest a "Correction: <topic>" doc stating what memory claimed, what is true now, and the evidence \u2014 newer facts supersede older ones.
${body}
This tool guide and the page list are re-injected for you periodically as things change.
</hindsight_knowledge>`;
}

// src/core/session-cache.ts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync3, renameSync as renameSync2, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname as dirname5, join as join8 } from "path";
function sessionCacheFile(harness, sessionId) {
  return join8(tmpdir(), `hindsight-${harness}`, `${sessionId}.json`);
}
function writeFileAtomic(path, body) {
  mkdirSync2(dirname5(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, body);
    renameSync2(tmp, path);
  } catch (e) {
    try {
      rmSync(tmp, { force: true });
    } catch {
    }
    throw e;
  }
}
function writeSessionCache(cacheFile, cache) {
  try {
    writeFileAtomic(cacheFile, JSON.stringify(cache));
  } catch {
  }
}
function sessionRootFile(harness, sessionId) {
  return join8(tmpdir(), `hindsight-${harness}`, `${sessionId}.root`);
}
function sessionRootDir(harness, sessionId, cwd) {
  if (!sessionId || !cwd) return cwd;
  const file = sessionRootFile(harness, sessionId);
  try {
    const recorded = readFileSync3(file, "utf8").trim();
    if (recorded) return recorded;
  } catch {
  }
  try {
    writeFileAtomic(file, cwd);
  } catch {
  }
  return cwd;
}

// src/core/turn-journal.ts
import { appendFileSync as appendFileSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync4, statSync as statSync2 } from "fs";
import { tmpdir as tmpdir2 } from "os";
import { dirname as dirname6, join as join9 } from "path";

// src/core/transcript-util.ts
var MEMORY_TAG_RE = /<(hook_prompt|task-notification|system-reminder|hindsight_memory|hindsight_memories|hindsight_bank|relevant_memories|user_feedback|hindsight_knowledge|hindsight_knowledge_refresh)\b[\s\S]*?<\/\1>/g;
function stripInjectedMemory(s) {
  return s.replace(MEMORY_TAG_RE, "");
}
var TARGET_KEYS = [
  "file_path",
  "path",
  "notebook_path",
  "command",
  "pattern",
  "query",
  "url",
  "name",
  "id"
];
var ACTION_TARGET_CAP = 100;
function actionLine(tool, input) {
  let target = "";
  if (input && typeof input === "object") {
    const rec = input;
    for (const k of TARGET_KEYS) {
      const v = rec[k];
      if (typeof v === "string" && v.trim()) {
        target = v.trim().split("\n")[0];
        break;
      }
    }
  } else if (typeof input === "string") {
    target = input.trim().split("\n")[0];
  }
  if (target.length > ACTION_TARGET_CAP) target = `${target.slice(0, ACTION_TARGET_CAP)}\u2026`;
  return target ? `${tool} ${target}` : tool;
}

// src/core/turn-journal.ts
var JOURNAL_MAX_BYTES = 8 * 1024 * 1024;

// src/core/retain-hook.ts
import { readFileSync as readFileSync7 } from "fs";

// src/core/retain-cursor.ts
import { createHash as createHash2 } from "crypto";
var PENDING_MAX_AGE_MS = 12 * 60 * 60 * 1e3;
var PENDING_MAX_BYTES = 256 * 1024;

// src/core/uuid.ts
import { createHash as createHash3 } from "crypto";

// src/core/daemon.ts
import { execFileSync, spawn as realSpawn2 } from "child_process";
import { dirname as dirname7, join as join10 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var DAEMON_WAIT_SESSION_START_MS = 12e3;
async function isServerHealthy(baseUrl, timeoutMs = 2e3) {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}
function hasRustToolchain() {
  if (process.platform !== "darwin") return true;
  try {
    execFileSync("cargo", ["--version"], {
      stdio: "pipe",
      timeout: 1e4,
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}
function hasUvx() {
  try {
    execFileSync("uvx", ["--version"], {
      stdio: "pipe",
      timeout: 1e4,
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}
var PROVIDER_PROBES = [
  { provider: "openai", keyEnv: "OPENAI_API_KEY" },
  { provider: "anthropic", keyEnv: "ANTHROPIC_API_KEY" },
  { provider: "gemini", keyEnv: "GEMINI_API_KEY" },
  { provider: "groq", keyEnv: "GROQ_API_KEY" }
];
function detectLlm(env = process.env) {
  const explicit = env.HINDSIGHT_API_LLM_PROVIDER?.trim();
  if (explicit) {
    return {
      provider: explicit,
      apiKey: env.HINDSIGHT_API_LLM_API_KEY?.trim() || void 0,
      source: "HINDSIGHT_API_LLM_PROVIDER"
    };
  }
  for (const probe of PROVIDER_PROBES) {
    const key = env[probe.keyEnv]?.trim();
    if (key) return { provider: probe.provider, apiKey: key, source: probe.keyEnv };
  }
  if (onPath("claude")) {
    return { provider: "claude-code", source: "the Claude Code CLI on PATH (no API key needed)" };
  }
  return void 0;
}
function onPath(bin) {
  try {
    execFileSync("which", [bin], {
      stdio: "pipe",
      timeout: 5e3,
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}
function startDaemonDetached(cfg, harness, spawnFn = realSpawn2) {
  try {
    const starter = join10(dirname7(fileURLToPath2(import.meta.url)), "daemon-start.js");
    const child = spawnFn("node", [starter, "--harness", harness], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.on("error", () => {
    });
    child.unref();
    diag(harness, "daemon_start_spawned", { apiUrl: cfg.apiUrl });
  } catch {
  }
}
async function ensureDaemon(cfg, harness, opts = {}) {
  if (cfg.serverMode !== "daemon") return;
  if (await isServerHealthy(cfg.apiUrl)) return;
  if (!preflightDaemon(cfg, harness)) return;
  startDaemonDetached(cfg, harness, opts.spawnFn);
  await waitForHealth(cfg.apiUrl, opts.waitMs ?? 0);
}
async function waitForHealth(baseUrl, budgetMs, pollMs = 1e3) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    if (await isServerHealthy(baseUrl)) return true;
  }
  return false;
}
function preflightDaemon(cfg, harness) {
  if (!hasUvx()) {
    diag(harness, "daemon_uvx_missing", { apiUrl: cfg.apiUrl });
    log.warn(harness, "daemon mode needs `uv` on PATH \u2014 see https://docs.astral.sh/uv/");
    return false;
  }
  if (!hasRustToolchain()) {
    diag(harness, "daemon_rust_missing", { platform: process.platform });
    log.warn(
      harness,
      "daemon mode on macOS needs a current Rust toolchain (litellm ships no macOS wheel) \u2014 install from https://rustup.rs, then `rustup default stable && rustup update`"
    );
    return false;
  }
  if (!detectLlm()) {
    diag(harness, "daemon_no_llm", {});
    log.warn(
      harness,
      "daemon mode needs an LLM for fact extraction \u2014 set OPENAI_API_KEY (or ANTHROPIC_API_KEY / GEMINI_API_KEY / HINDSIGHT_API_LLM_PROVIDER), or install the Claude Code CLI"
    );
    return false;
  }
  return true;
}

// src/core/retain-stamp.ts
import { basename as basename2 } from "path";
var RESERVED_TAG_PREFIX = /^(source|harness):/;
function resolversFor(ctx) {
  return {
    // Worktree-aware like the bank id, so every linked worktree of a repo stamps the SAME name —
    // otherwise a shared bank ends up with `project:app` and `project:app-wt2` for one repository.
    gitProject: () => projectNameOf(ctx.directory, ctx.sessionRoot),
    project: () => ctx.directory ? basename2(ctx.directory) : "unknown",
    harness: () => ctx.harness,
    bankId: () => ctx.bankId,
    sessionId: () => ctx.sessionId ?? "unknown",
    timestamp: () => (/* @__PURE__ */ new Date()).toISOString(),
    channel: () => process.env.HINDSIGHT_CHANNEL_ID || "default",
    user: () => process.env.HINDSIGHT_USER_ID || "anonymous"
  };
}
function buildRetainStamp(cfg, ctx) {
  const hasTags = Boolean(cfg.retainTags?.length);
  const hasMetadata = Boolean(cfg.retainMetadata && Object.keys(cfg.retainMetadata).length);
  if (!hasTags && !hasMetadata) return { tags: [], metadata: {} };
  const base = resolversFor(ctx);
  const cache = /* @__PURE__ */ new Map();
  const resolvers = Object.fromEntries(
    Object.entries(base).map(([name, resolve3]) => [
      name,
      () => {
        const hit = cache.get(name);
        if (hit !== void 0) return hit;
        const value = resolve3();
        cache.set(name, value);
        return value;
      }
    ])
  );
  const tags = (cfg.retainTags ?? []).map((t) => applyTemplate(t, resolvers, "retainTags").trim()).filter(Boolean).filter((t) => {
    if (!RESERVED_TAG_PREFIX.test(t)) return true;
    log.warn("retain-stamp", "ignoring reserved retainTags entry", { tag: t });
    return false;
  });
  const metadata = {};
  for (const [key, value] of Object.entries(cfg.retainMetadata ?? {})) {
    metadata[key] = applyTemplate(value, resolvers, "retainMetadata");
  }
  return { tags, metadata };
}

// src/core/jsonl.ts
import { closeSync, openSync, readSync } from "fs";
import { StringDecoder } from "string_decoder";
var CHUNK_BYTES = 64 * 1024;
function* readJsonl(path) {
  let fd;
  try {
    fd = openSync(path, "r");
  } catch {
    return;
  }
  try {
    const buffer = Buffer.allocUnsafe(CHUNK_BYTES);
    const decoder = new StringDecoder("utf8");
    let pending = "";
    let position = 0;
    for (; ; ) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, position);
      if (bytesRead <= 0) break;
      position += bytesRead;
      pending += decoder.write(buffer.subarray(0, bytesRead));
      let newline;
      while ((newline = pending.indexOf("\n")) !== -1) {
        yield pending.slice(0, newline);
        pending = pending.slice(newline + 1);
      }
    }
    pending += decoder.end();
    if (pending) yield pending;
  } finally {
    closeSync(fd);
  }
}

// src/core/usage.ts
import { readFileSync as readFileSync6 } from "fs";
import { join as join11 } from "path";

// src/core/session-start.ts
import { readFileSync as readFileSync11 } from "fs";

// src/core/git.ts
import { execFileSync as execFileSync2 } from "child_process";
import { resolve as resolve2 } from "path";
function git(repo, ...args) {
  return execFileSync2("git", ["-C", repo, ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    windowsHide: true,
    // execFileSync otherwise forwards failed git stderr into the host's TUI,
    // even when callers catch the error. Keep diagnostics on the error instead.
    stdio: ["ignore", "pipe", "pipe"]
  });
}
function repoNameOf(repo) {
  return projectNameOf(resolve2(repo));
}
function gitHeadSha(dir) {
  try {
    return git(dir, "rev-parse", "HEAD").trim() || null;
  } catch {
    return null;
  }
}
function commitsSince(dir, sinceSha) {
  try {
    const n = Number.parseInt(git(dir, "rev-list", "--count", `${sinceSha}..HEAD`).trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
function hasGitHistory(dir) {
  try {
    return git(dir, "rev-list", "--max-count=1", "HEAD").trim().length > 0;
  } catch {
    return false;
  }
}

// src/core/status.ts
import { execFileSync as execFileSync3 } from "child_process";

// src/core/survey.ts
import { spawn as realSpawn4 } from "child_process";
import { createHash as createHash4 } from "crypto";
import { existsSync as existsSync3 } from "fs";
import { homedir as homedir4, tmpdir as tmpdir3 } from "os";
import { dirname as dirname8, join as join13 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";

// src/core/host-client.ts
function resolveHostConfig(harness, directory) {
  const cfg0 = loadConfig({ harness });
  if (cfg0.disabled) return { cfg: cfg0, bankId: "" };
  const bankId = deriveBankIdOrSkip(cfg0, directory, harness);
  if (bankId === null) return { cfg: { ...cfg0, disabled: true }, bankId: "" };
  return applyBankConfig(cfg0, bankId, directory);
}

// src/core/survey-lease.ts
import { spawn as realSpawn3 } from "child_process";
import { randomUUID } from "crypto";
import {
  mkdirSync as mkdirSync4,
  mkdtempSync,
  readdirSync,
  renameSync as renameSync3,
  rmdirSync,
  rmSync as rmSync2,
  statSync as statSync3,
  unlinkSync,
  utimesSync,
  writeFileSync as writeFileSync2
} from "fs";
import { join as join12 } from "path";
var LEASE_STALE_MS = 3e4;
var SURVEY_SPEC_ENV = "HINDSIGHT_SURVEY_SPEC";
function tryRename(from, to) {
  try {
    renameSync3(from, to);
    return true;
  } catch {
    return false;
  }
}
function releaseLease(lease) {
  try {
    unlinkSync(join12(lease.directory, lease.owner));
  } catch {
    return;
  }
  try {
    rmdirSync(lease.directory);
  } catch {
  }
}
function reclaimIfStale(directory, staleMs) {
  const owners = readdirSync(directory);
  if (owners.length === 0) {
    try {
      rmdirSync(directory);
    } catch {
    }
    return true;
  }
  if (owners.length !== 1) return false;
  const age = Date.now() - statSync3(join12(directory, owners[0])).mtimeMs;
  if (Math.abs(age) <= staleMs) return false;
  releaseLease({ directory, owner: owners[0] });
  return true;
}
function acquireLease(root, key, staleMs = LEASE_STALE_MS) {
  let staging;
  try {
    mkdirSync4(root, { recursive: true, mode: 448 });
    staging = mkdtempSync(join12(root, "claim-"));
    const owner = randomUUID();
    writeFileSync2(join12(staging, owner), "", { flag: "wx", mode: 384 });
    const directory = join12(root, `survey-${key}.lock`);
    if (!tryRename(staging, directory)) {
      if (!reclaimIfStale(directory, staleMs)) return void 0;
      if (!tryRename(staging, directory)) return void 0;
    }
    return { directory, owner };
  } catch {
    return void 0;
  } finally {
    if (staging) rmSync2(staging, { recursive: true, force: true });
  }
}

// src/core/survey.ts
var SURVEY_DOC_IDS = [
  "repository-component-map",
  "repository-core-concepts",
  "repository-conventions-and-patterns",
  "repository-tech-stack-and-features"
];
function resolveClaudeBin(explicit) {
  if (explicit) return explicit;
  if (process.env.HINDSIGHT_CLAUDE_BIN) return process.env.HINDSIGHT_CLAUDE_BIN;
  const nativeInstallPath = join13(homedir4(), ".claude", "local", "claude");
  try {
    if (existsSync3(nativeInstallPath)) return nativeInstallPath;
  } catch {
  }
  return "claude";
}
var SURVEY_AGENT = "hindsight-survey";
function resolveAgentBin(harness, claudeBin) {
  switch (harness) {
    case "claude-code":
      return resolveClaudeBin(claudeBin);
    case "codex":
      return process.env.HINDSIGHT_CODEX_BIN || "codex";
    case "antigravity-cli":
      return process.env.HINDSIGHT_ANTIGRAVITY_BIN || "agy";
    case "opencode":
      return process.env.HINDSIGHT_OPENCODE_BIN || "opencode";
  }
}
var SURVEY_PROMPT = 'You are performing a one-time structural survey of THIS repository to seed its Hindsight memory. Work efficiently \u2014 DO NOT read every file; sample enough to understand the architecture: the directory layout, entry points, package manifests (package.json / pyproject.toml / Cargo.toml / go.mod), the README, and a few representative source files per major area. Use Glob (e.g. `**/*`) to see the directory layout \u2014 Read takes a FILE path only and errors on a directory; never call Read on a bare directory path.\nIMPORTANT \u2014 DO NOT read, quote, summarize, or ingest agent-instruction files: CLAUDE.md, AGENTS.md, GEMINI.md, .cursorrules, .cursor/rules/*, or .github/copilot-instructions.md. These are live, user-controlled instructions (not repository knowledge); capturing them as memory would let a stale copy override the user\'s current instructions. Exclude them entirely from your survey and from every ingested document.\nThen use the hindsight_ingest_document tool to save what you learned as separate documents (one call each), with these titles and factual, developer-oriented content grounded in what you actually saw:\n- "Repository component map": the top-level modules/directories, each one\'s responsibility, and how they connect (data flow / dependencies).\n- "Repository core concepts": the domain model and key abstractions a new contributor must understand.\n- "Repository conventions and patterns": naming, file/module organization, testing approach, error handling, and other recurring patterns.\n- "Repository tech stack and features": languages, frameworks, build/test tooling, and the notable features the project provides.\nKeep each a few hundred words. When done, stop.';
var SURVEY_DISALLOWED_TOOLS = [
  "Bash",
  "Write",
  "Edit",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
  "Task"
];
function buildSurveyPlan(harness, bin, repoDir, opts) {
  const env = {
    ...process.env,
    // Anti-recursion: the survey's own agent session must not fire our hooks (session-start,
    // UserPromptSubmit/BeforeAgent, Stop/SessionEnd) or re-seed — see the HINDSIGHT_DISABLE_HOOKS
    // guard in hook.ts / retain-hook.ts / session-start.ts / runtime.ts.
    HINDSIGHT_DISABLE_HOOKS: "1",
    // Bank scoping for the MCP server the survey agent spawns.
    HINDSIGHT_MCP_PROJECT_CWD: repoDir
  };
  switch (harness) {
    case "claude-code": {
      const mcpConfig = JSON.stringify({
        mcpServers: {
          hindsight: {
            command: "node",
            args: [opts.mcpServerPath],
            // HINDSIGHT_MCP_HARNESS names the agent whose CLI this recipe drives — the survey's
            // ingests are its writes. mcp-server.js REQUIRES it (it used to default to
            // "claude-code", which is how the codex recipe below silently stamped its findings
            // harness:claude-code and wrote them to Claude Code's bank — #3603).
            env: { HINDSIGHT_MCP_PROJECT_CWD: repoDir, HINDSIGHT_MCP_HARNESS: "claude-code" }
          }
        }
      });
      return {
        bin,
        args: [
          "-p",
          SURVEY_PROMPT,
          "--model",
          opts.model ?? "haiku",
          "--mcp-config",
          mcpConfig,
          "--strict-mcp-config",
          "--allowedTools",
          "Read",
          "Glob",
          "Grep",
          "mcp__hindsight__hindsight_ingest_document",
          "--disallowedTools",
          ...SURVEY_DISALLOWED_TOOLS,
          "--max-budget-usd",
          String(opts.budgetUsd ?? 2)
        ],
        env
      };
    }
    case "codex": {
      return {
        bin,
        args: [
          "exec",
          "--sandbox",
          "read-only",
          "-c",
          `mcp_servers.hindsight.command="node"`,
          "-c",
          `mcp_servers.hindsight.args=["${opts.mcpServerPath}"]`,
          "-c",
          `mcp_servers.hindsight.env.HINDSIGHT_MCP_PROJECT_CWD="${repoDir}"`,
          "-c",
          `mcp_servers.hindsight.env.HINDSIGHT_MCP_HARNESS="codex"`,
          SURVEY_PROMPT
        ],
        env
      };
    }
    case "antigravity-cli": {
      return {
        bin,
        args: ["-p", SURVEY_PROMPT, "--mode=plan"],
        env
      };
    }
    case "opencode": {
      return {
        bin,
        args: ["run", "--agent", SURVEY_AGENT, SURVEY_PROMPT],
        env
      };
    }
  }
}
async function startCodebaseSurvey(repoDir, opts = {}) {
  try {
    const spawnFn = opts.spawn ?? realSpawn4;
    const exists = opts.exists ?? binOnPath;
    const mcpServerPath = opts.mcpServerPath ?? join13(dirname8(fileURLToPath3(import.meta.url)), "mcp-server.js");
    const preferred = opts.harness ?? "claude-code";
    const order = [
      preferred,
      "claude-code",
      "codex",
      "antigravity-cli",
      "opencode"
    ];
    const seen = /* @__PURE__ */ new Set();
    for (const harness of order) {
      if (seen.has(harness)) continue;
      seen.add(harness);
      const bin = resolveAgentBin(harness, opts.claudeBin);
      if (!exists(bin)) continue;
      const plan = buildSurveyPlan(harness, bin, repoDir, {
        model: opts.model,
        budgetUsd: opts.budgetUsd,
        mcpServerPath
      });
      const { cfg, bankId } = resolveHostConfig(harness, repoDir);
      if (cfg.disabled) return false;
      const key = createHash4("sha256").update(JSON.stringify([cfg.apiUrl.replace(/\/+$/, ""), cfg.apiToken ?? "", bankId])).digest("hex");
      const lease = acquireLease(
        opts.lease?.dir ?? join13(tmpdir3(), "hindsight-coding-agent", "surveys"),
        key,
        opts.lease?.staleMs ?? LEASE_STALE_MS
      );
      if (!lease) return false;
      const spec = {
        lease,
        bin: plan.bin,
        args: plan.args,
        ...opts.lease?.heartbeatMs ? { heartbeatMs: opts.lease.heartbeatMs } : {}
      };
      const supervisorPath = opts.supervisorPath ?? join13(dirname8(fileURLToPath3(import.meta.url)), "survey-supervisor.js");
      return await new Promise((resolve3) => {
        try {
          const child = spawnFn("node", [supervisorPath], {
            cwd: repoDir,
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            env: { ...plan.env, [SURVEY_SPEC_ENV]: JSON.stringify(spec) }
          });
          let spawned = false;
          child.on("error", () => {
            if (spawned) return;
            releaseLease(lease);
            resolve3(false);
          });
          child.once("spawn", () => {
            spawned = true;
            child.unref();
            resolve3(true);
          });
        } catch {
          releaseLease(lease);
          resolve3(false);
        }
      });
    }
  } catch {
  }
  return false;
}

// src/core/status.ts
var DEEPEN_DIFF_TARGET = 300;

// src/core/auto-update.ts
import { spawn as realSpawn5 } from "child_process";
import {
  existsSync as existsSync4,
  mkdirSync as mkdirSync5,
  readFileSync as readFileSync8,
  realpathSync as realpathSync2,
  unlinkSync as unlinkSync2,
  writeFileSync as writeFileSync3
} from "fs";
import { homedir as homedir5, tmpdir as tmpdir4 } from "os";
import { dirname as dirname9, join as join14 } from "path";
import { fileURLToPath as fileURLToPath4 } from "url";
var PACKAGE_NAME = "@vectorize-io/hindsight-coding-agents";
var RELEASE_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;
var CHECK_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var NPM_VIEW_TIMEOUT_MS = 5e3;
var NPM_VIEW_HARD_DEADLINE_MS = NPM_VIEW_TIMEOUT_MS + 1e3;
function stateFile(runtimeDir) {
  return join14(runtimeDir, ".update-check.json");
}
function packageRoot() {
  return join14(dirname9(fileURLToPath4(import.meta.url)), "..");
}
function stagedRuntimeDir() {
  return join14(homedir5(), ".hindsight", "coding-agents");
}
function sameDir(a, b) {
  try {
    return realpathSync2(a) === realpathSync2(b);
  } catch {
    return a === b;
  }
}
function stagedVersion(pkgRoot) {
  try {
    const pkg = JSON.parse(readFileSync8(join14(pkgRoot, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "";
  } catch {
    return "";
  }
}
function isNewer(candidate, current2) {
  const parse = (v) => {
    const [core = "", ...rest] = v.trim().split("-");
    return {
      nums: core.split(".").map((n) => Number.parseInt(n, 10)),
      pre: rest.length > 0
    };
  };
  const a = parse(candidate);
  const b = parse(current2);
  if (a.nums.length !== 3 || b.nums.length !== 3) return false;
  if (a.nums.some(Number.isNaN) || b.nums.some(Number.isNaN)) return false;
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) return a.nums[i] > b.nums[i];
  }
  return b.pre && !a.pre;
}
function dueForCheck(file, now) {
  try {
    const state = JSON.parse(readFileSync8(file, "utf8"));
    return typeof state.lastCheck !== "number" || now - state.lastCheck >= CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}
var ORIGIN_FILE = ".install-origin.json";
function selfUpdatable(runtimeDir) {
  try {
    const origin = JSON.parse(readFileSync8(join14(runtimeDir, ORIGIN_FILE), "utf8"));
    if (typeof origin.source !== "string" || !origin.source) return false;
    return origin.source.split(/[\\/]/).includes("_npx");
  } catch {
    return false;
  }
}
var LOCK_STALE_MS = 10 * 60 * 1e3;
function lockFile() {
  return join14(tmpdir4(), "hindsight-coding-agent", "auto-update.lock");
}
function acquireUpdateLock(file, now) {
  try {
    const held = JSON.parse(readFileSync8(file, "utf8"));
    if (held.ts && now - held.ts < LOCK_STALE_MS) {
      let holderAlive = false;
      if (held.pid) {
        try {
          process.kill(held.pid, 0);
          holderAlive = true;
        } catch {
        }
      }
      if (holderAlive) return false;
    }
  } catch {
  }
  try {
    mkdirSync5(dirname9(file), { recursive: true });
    writeFileSync3(file, JSON.stringify({ pid: process.pid, ts: now }));
    return true;
  } catch {
    return false;
  }
}
function holdLockFor(file, pid, now) {
  try {
    if (pid === void 0) return releaseUpdateLock(file);
    writeFileSync3(file, JSON.stringify({ pid, ts: now }));
  } catch {
  }
}
function releaseUpdateLock(file) {
  try {
    unlinkSync2(file);
  } catch {
  }
}
function stampCheck(file, now, latest) {
  try {
    writeFileSync3(file, JSON.stringify({ lastCheck: now, latest }));
  } catch {
  }
}
async function npmViewVersion(pkg, spawnImpl = realSpawn5) {
  return new Promise((resolve3) => {
    let out = "";
    let settled = false;
    let deadline;
    const done = (v, reason) => {
      if (settled) return;
      settled = true;
      if (deadline) clearTimeout(deadline);
      if (reason) log.info("auto-update", `version check failed: ${reason}`);
      resolve3(v);
    };
    try {
      const child = spawnImpl("npm", ["view", pkg, "version", "--json"], {
        timeout: NPM_VIEW_TIMEOUT_MS,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true
      });
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (d) => {
        out += d;
      });
      child.stdout?.on("error", (e) => done("", describeError(e)));
      child.on("error", (e) => done("", describeError(e)));
      child.on("close", (code, signal) => {
        if (code !== 0) return done("", `npm view exited ${code ?? signal}`);
        try {
          const v = JSON.parse(out.trim());
          if (typeof v !== "string")
            return done("", `unparsable npm output: ${out.trim().slice(0, 80)}`);
          if (!RELEASE_RE.test(v)) return done("", `not a release: ${v.slice(0, 40)}`);
          done(v);
        } catch {
          done("", `unparsable npm output: ${out.trim().slice(0, 80)}`);
        }
      });
      deadline = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
        }
        done("", "npm view never exited \u2014 hard deadline");
      }, NPM_VIEW_HARD_DEADLINE_MS);
    } catch (e) {
      done("", describeError(e));
    }
  });
}
async function maybeAutoUpdate(cfg, opts = {}) {
  try {
    if (!cfg.autoUpdate) return "";
    if (process.env.HINDSIGHT_DISABLE_HOOKS) return "";
    const pkgRoot = opts.pkgRoot ?? packageRoot();
    const runtime = opts.runtimeDir ?? stagedRuntimeDir();
    if (!existsSync4(runtime)) return "";
    if (!sameDir(pkgRoot, runtime)) return "";
    const now = opts.now ?? Date.now();
    const file = stateFile(runtime);
    if (!dueForCheck(file, now)) return "";
    const current2 = stagedVersion(pkgRoot);
    if (!current2) return "";
    if (!(opts.selfUpdatable ?? selfUpdatable)(runtime)) {
      log.info("auto-update", "runtime is managed outside npx \u2014 leaving its version alone");
      stampCheck(file, now, "");
      return "";
    }
    const binOk = opts.binOnPath ?? binOnPath;
    if (!binOk("npx") || !binOk("npm")) {
      log.info("auto-update", "npx/npm is not on PATH \u2014 skipping the update check");
      stampCheck(file, now, "");
      return "";
    }
    const lock = opts.lockFile ?? lockFile();
    if (!acquireUpdateLock(lock, now)) return "";
    try {
      const latest = await (opts.npmView ?? npmViewVersion)(PACKAGE_NAME);
      stampCheck(file, now, latest);
      if (!latest || !isNewer(latest, current2)) {
        releaseUpdateLock(lock);
        return "";
      }
      log.info("auto-update", `updating the Hindsight runtime ${current2} -> ${latest}`);
      const child = (opts.spawn ?? realSpawn5)(
        "npx",
        ["-y", `${PACKAGE_NAME}@${latest}`, "update"],
        {
          detached: true,
          stdio: "ignore",
          windowsHide: true
        }
      );
      child.on("error", (e) => {
        log.warn("auto-update", `update spawn failed: ${e.message}`);
        releaseUpdateLock(lock);
      });
      child.unref();
      holdLockFor(lock, child.pid, now);
      return latest;
    } catch (e) {
      releaseUpdateLock(lock);
      throw e;
    }
  } catch {
    return "";
  }
}

// src/core/skill-sync.ts
import { cpSync, existsSync as existsSync5, readFileSync as readFileSync9 } from "fs";
import { homedir as homedir6 } from "os";
import { dirname as dirname10, join as join15 } from "path";
import { fileURLToPath as fileURLToPath5 } from "url";

// src/core/skill-dirs.ts
var SKILL_DIRS = {
  "claude-code": [".claude", "skills"],
  // Codex and dsh share the agentskills-standard root; uninstalling either removes the one copy.
  codex: [".agents", "skills"],
  dsh: [".agents", "skills"],
  "antigravity-cli": [".gemini", "config", "skills"],
  "cursor-cli": [".cursor", "skills"],
  "copilot-cli": [".copilot", "skills"],
  "grok-build": [".grok", "skills"],
  "cline-cli": [".cline", "data", "settings", "skills"],
  "qwen-code": [".qwen", "skills"],
  // Qwen's user-level skills root (Storage.getUserSkillsDirs)
  "factory-droid": [".factory", "skills"],
  // Droid's user-level skills root
  // ZCode scans TWO user roots by default (its resolveDefaultSkillRoots): `~/.zcode/skills` and the
  // shared agentskills `~/.agents/skills`. Write its OWN, for the same reason the pi family does —
  // skill removal is by fixed directory name, so installing into the shared root would make
  // `uninstall zcode` take Codex's and dsh's copy with it.
  zcode: [".zcode", "skills"],
  // The pi family reads the shared ~/.agents/skills too, but writes its OWN root: skill removal is
  // by fixed directory name, so installing to the shared one would make `uninstall pi` take Codex's
  // and dsh's copy with it.
  pi: [".pi", "agent", "skills"],
  "prime-agent": [".prime", "agent", "skills"]
};

// src/core/skill-sync.ts
function packagedSkillDir() {
  const here = dirname10(fileURLToPath5(import.meta.url));
  const dist = join15(here, "..", "skill");
  return existsSync5(join15(dist, "SKILL.md")) ? dist : join15(here, "..", "..", "skill");
}
function syncCompanionSkill(harness, opts = {}) {
  try {
    const parts = SKILL_DIRS[harness];
    if (!parts) return;
    const src = opts.srcDir ?? packagedSkillDir();
    const srcMd = join15(src, "SKILL.md");
    if (!existsSync5(srcMd)) return;
    const dst = join15(opts.home ?? homedir6(), ...parts, "hindsight-coding-agent");
    const dstMd = join15(dst, "SKILL.md");
    const installed = existsSync5(dstMd);
    if (!installed && !opts.install) return;
    if (!installed || readFileSync9(srcMd, "utf8") !== readFileSync9(dstMd, "utf8")) {
      cpSync(src, dst, { recursive: true });
    }
  } catch {
  }
}

// src/core/legacy.ts
import { existsSync as existsSync6, readFileSync as readFileSync10 } from "fs";
import { homedir as homedir7 } from "os";
import { join as join16, relative, isAbsolute as isAbsolute2 } from "path";
var LEGACY_CLAUDE_PLUGIN = "hindsight-memory";
function detectLegacyClaudePlugin(cwd, claudeDir = join16(homedir7(), ".claude")) {
  const registry = readJson(join16(claudeDir, "plugins", "installed_plugins.json"));
  const plugins = registry?.plugins;
  if (!plugins || typeof plugins !== "object") return void 0;
  const enabled = readJson(join16(claudeDir, "settings.json"))?.enabledPlugins;
  for (const [key, raw] of Object.entries(plugins)) {
    if (key.split("@")[0] !== LEGACY_CLAUDE_PLUGIN) continue;
    if (enabled && enabled[key] === false) continue;
    const installs = Array.isArray(raw) ? raw : [raw];
    const active = installs.some((i) => {
      if (!i || typeof i !== "object") return false;
      if (typeof i.projectPath !== "string") return true;
      const rel = relative(i.projectPath, cwd);
      return rel === "" || !rel.startsWith("..") && !isAbsolute2(rel);
    });
    if (active) return key;
  }
  return void 0;
}
function readJson(path) {
  try {
    const parsed = JSON.parse(readFileSync10(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function legacyClaudePluginWarning(key) {
  return `\u26A0\uFE0F The old Hindsight Claude Code plugin (${key}) is still installed \u2014 it runs alongside this one, so memory is recalled and retained twice.
  \u21B3 remove it: claude plugin uninstall ${key}`;
}

// src/core/session-start.ts
function buildSeedBanner(bankId, cold = true, gitNote) {
  const headline = cold ? `${brandWord()} is learning this repo \u2014 ingesting its decisions, conventions and history` : `${brandWord()} is tracking the decisions, conventions and history of this repo`;
  const details = `  \u21B3 memory bank \u201C${bankId}\u201D` + (gitNote ? ` \xB7 ${gitNote}` : "");
  return `${headline}
${details}`;
}
async function gitSyncNote(args) {
  const { client, cwd, gitIds, mode, cold } = args;
  if (mode === "none" || cold) return void 0;
  const head = gitHeadSha(cwd);
  if (!head) return void 0;
  const gitlogCurrent = await client.listDocumentIds(`gitlog-head:${head}`, "all_strict").then((s) => s.has(`gitlog:${repoNameOf(cwd)}`)).catch(() => void 0);
  if (gitlogCurrent === void 0) return void 0;
  if (mode === "message") return gitlogCurrent ? "git in sync" : "catching up on new commits";
  const deepened = [...gitIds].filter((id) => id.startsWith("git:")).length;
  let target = DEEPEN_DIFF_TARGET;
  try {
    const { execFileSync: execFileSync4 } = await import("child_process");
    const n = Number(
      execFileSync4("git", ["-C", cwd, "rev-list", "--count", "HEAD"], {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
        // do not corrupt the host banner on a late git failure
      }).trim()
    );
    if (n > 0) target = Math.min(DEEPEN_DIFF_TARGET, n);
  } catch {
  }
  return gitlogCurrent && deepened >= target ? "git in sync" : `syncing git history (${Math.min(deepened, target)}/${target})`;
}
async function buildSessionStartContext(args) {
  const { cwd, bankId, cfg, client, stateDir } = args;
  const t0 = Date.now();
  let cold;
  let gitDocIds;
  const harness = args.harness ?? "claude-code";
  const hasGit = args.hasGit ?? hasGitHistory;
  const startSeed = args.startSeed ?? startBackgroundSeed;
  const startSurvey = args.startSurvey ?? startCodebaseSurvey;
  const resolveHeadSha = args.headSha ?? gitHeadSha;
  const countCommitsSince = args.commitsSince ?? commitsSince;
  const retainStamp = () => buildRetainStamp(cfg, { directory: cwd, sessionRoot: args.sessionRoot, harness, bankId });
  const SURVEY_BASELINE_TAG = "source:survey-baseline";
  const SURVEY_BASELINE_PREFIX = "survey-baseline:";
  const recordSurveyBaseline = (sha) => {
    if (!client.retain) return;
    try {
      const stamp = retainStamp();
      const content = `\u{1F6F0}\uFE0F Hindsight is researching this codebase \u2014 survey started at commit ${sha.slice(0, 12)}. (Internal marker: no memories are extracted from this document.)`;
      const tags = [.../* @__PURE__ */ new Set([...stamp.tags, SURVEY_BASELINE_TAG])];
      const retained = client.retain(
        content,
        "hindsight codebase-survey baseline",
        `${SURVEY_BASELINE_PREFIX}${sha}`,
        tags,
        "survey",
        // `retain` only sets metadata when it is truthy, so an empty stamp sends none.
        { metadata: Object.keys(stamp.metadata).length ? stamp.metadata : void 0 }
      );
      void Promise.resolve(retained).catch(() => {
      });
    } catch {
    }
  };
  let systemMessage;
  if (cfg.autoSeed !== false) {
    if (hasGit(cwd)) {
      {
        let docIds;
        try {
          docIds = await client.listDocumentIds("source:git", "all_strict");
        } catch {
          docIds = void 0;
        }
        cold = docIds !== void 0 ? docIds.size === 0 : void 0;
        gitDocIds = docIds;
        if (docIds !== void 0) {
          startSeed(cwd, { limit: cfg.seedLimit, harness });
          if (docIds.size === 0) {
            if (cfg.codebaseSurvey !== false) {
              const started = await startSurvey(cwd, {
                harness,
                model: cfg.surveyModel,
                budgetUsd: cfg.surveyBudgetUsd
              });
              const sha = resolveHeadSha(cwd);
              if (started && sha) recordSurveyBaseline(sha);
            }
            diag(harness, "seed_started", { bank: bankId });
          } else if (cfg.codebaseSurvey !== false && cfg.surveyRefreshCommits > 0) {
            const sha = resolveHeadSha(cwd);
            if (sha) {
              const markers = await client.listDocumentIds(SURVEY_BASELINE_TAG, "all_strict").catch(() => /* @__PURE__ */ new Set());
              const counts = [];
              for (const id of markers) {
                if (!id.startsWith(SURVEY_BASELINE_PREFIX)) continue;
                const n = countCommitsSince(cwd, id.slice(SURVEY_BASELINE_PREFIX.length));
                if (n !== null) counts.push(n);
              }
              const sinceLast = counts.length ? Math.min(...counts) : null;
              const uploads = await client.listDocumentIds("source:upload", "all_strict").catch(() => /* @__PURE__ */ new Set());
              const findingsAbsent = counts.length > 0 && !SURVEY_DOC_IDS.some((id) => uploads.has(id));
              if (sinceLast !== null && sinceLast >= cfg.surveyRefreshCommits || findingsAbsent) {
                const started = await startSurvey(cwd, {
                  harness,
                  model: cfg.surveyModel,
                  budgetUsd: cfg.surveyBudgetUsd
                });
                if (started) {
                  recordSurveyBaseline(sha);
                  diag(harness, "survey_refresh", {
                    bank: bankId,
                    commits: sinceLast,
                    retry: findingsAbsent
                  });
                }
              } else if (sinceLast === null) {
                recordSurveyBaseline(sha);
              }
            }
          }
        }
      }
    }
  }
  let pages = [];
  let pageListKnown = false;
  try {
    pages = parsePageList(await client.listPages());
    pageListKnown = true;
  } catch {
    if (client.knowledgePagesSupported === false) {
      diag(harness, "knowledge_pages_unavailable", { bank: bankId });
    }
  }
  const additionalContext = buildKnowledgePreamble(pages, {
    reflectOnNewGoals: cfg.autoInject !== "reflect"
  });
  const deferInitialReflect = cold === true || pageListKnown && pages.length === 0;
  let gitNote;
  if (gitDocIds) {
    gitNote = await gitSyncNote({
      client,
      cwd,
      gitIds: gitDocIds,
      mode: cfg.gitIngest,
      cold: cold === true
    }).catch(() => void 0);
  }
  systemMessage = buildSeedBanner(bankId, cold === true, gitNote);
  const detectLegacy = args.detectLegacyPlugin ?? (harness === "claude-code" ? detectLegacyClaudePlugin : void 0);
  const legacyPlugin = detectLegacy?.(cwd);
  if (legacyPlugin) {
    systemMessage += `
${legacyClaudePluginWarning(legacyPlugin)}`;
    diag(harness, "legacy_plugin_active", { plugin: legacyPlugin });
  }
  diag(harness, "session_start", { bank: bankId, cold, pages: pages.length, ms: Date.now() - t0 });
  return { systemMessage, additionalContext, deferInitialReflect };
}
async function runSessionStartHook(spec, makeClient = (o) => new HindsightClient(o)) {
  if (process.env.HINDSIGHT_DISABLE_HOOKS) return;
  try {
    let ev = {};
    try {
      ev = JSON.parse(readFileSync11(0, "utf8"));
    } catch {
      return;
    }
    const { harness } = spec;
    const { cwd: rawCwd, sessionId } = spec.parse(ev);
    const cwd = rawCwd || process.cwd();
    let cfg = loadConfig({ harness });
    setLogLevel(cfg.logLevel);
    syncCompanionSkill(harness);
    if (cfg.disabled) return;
    void maybeAutoUpdate(cfg);
    const sessionRoot = sessionRootDir(harness, sessionId, cwd);
    const derived = deriveBankIdOrSkip(cfg, cwd, harness, sessionRoot);
    if (derived === null) return;
    const resolved2 = applyBankConfig(cfg, derived, cwd);
    cfg = resolved2.cfg;
    const bankId = resolved2.bankId;
    if (cfg.disabled) return;
    await ensureDaemon(cfg, harness, { waitMs: DAEMON_WAIT_SESSION_START_MS });
    const client = makeClient({
      apiUrl: cfg.apiUrl,
      apiToken: cfg.apiToken,
      bank: bankId,
      maxParallelRetains: cfg.maxParallelRetains,
      observationScopes: cfg.observationScopes
    });
    const out = await buildSessionStartContext({ cwd, sessionRoot, bankId, cfg, client, harness });
    if (out.deferInitialReflect && sessionId) {
      writeSessionCache(sessionCacheFile(harness, sessionId), { deferInitialReflect: true });
    }
    const payload = spec.emit(out);
    if (out.systemMessage || out.additionalContext) {
      process.stdout.write(JSON.stringify(payload));
    }
  } catch {
  }
}

// src/core/transcript-codex.ts
function stampOf(line) {
  return typeof line.timestamp === "string" && line.timestamp ? { timestamp: line.timestamp } : {};
}
function isSyntheticUserText(text) {
  const s = text.trimStart();
  return s.startsWith("# AGENTS.md instructions for ") || s.startsWith("<environment_context>");
}
function contentText(content) {
  return (content || []).filter((c) => c && typeof c.text === "string").map((c) => c.text).join("\n");
}
function isUserMessageEvent(line) {
  return line.type === "event_msg" && line.payload?.type === "item_completed" && line.payload.item?.type === "UserMessage";
}
function readCodexTranscript(path) {
  const lines = [];
  for (const rawLine of readJsonl(path)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) lines.push(parsed);
    } catch {
      continue;
    }
  }
  const userFromEvents = lines.some(isUserMessageEvent);
  const turns = [];
  const push = (role, raw, stamp = {}) => {
    const text = stripInjectedMemory(raw).trim();
    if (text) turns.push({ role, content: text, ...stamp });
  };
  for (const line of lines) {
    if (isUserMessageEvent(line)) {
      push("user", contentText(line.payload?.item?.content), stampOf(line));
      continue;
    }
    if (line.type !== "response_item") continue;
    const p = line.payload;
    if (!p || typeof p !== "object") continue;
    if (p.type === "message") {
      if (p.role === "assistant") push("assistant", contentText(p.content), stampOf(line));
      else if (p.role === "user" && !userFromEvents) {
        const text = contentText(p.content);
        if (!isSyntheticUserText(stripInjectedMemory(text))) push("user", text, stampOf(line));
      }
    } else if ((p.type === "function_call" || p.type === "custom_tool_call") && typeof p.name === "string") {
      const rawInput = p.type === "function_call" ? p.arguments : p.input;
      let input;
      try {
        input = JSON.parse(rawInput || "");
      } catch {
        input = void 0;
      }
      turns.push({ role: "action", content: actionLine(p.name, input), ...stampOf(line) });
    }
  }
  return turns;
}

// src/core/transcript-cursor.ts
function withTimestamp(turn, timestamp) {
  return timestamp ? { ...turn, timestamp } : turn;
}
function textFrom(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((block) => block?.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n");
}
function readCursorTranscript(path) {
  const turns = [];
  for (const rawLine of readJsonl(path)) {
    let parsed;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const line = parsed;
    const role = line.message?.role ?? line.role ?? (line.type === "user" || line.type === "assistant" ? line.type : void 0);
    const content = line.message?.content ?? line.content;
    if (role === "user" || role === "assistant") {
      const text = stripInjectedMemory(textFrom(content)).trim();
      if (text) turns.push(withTimestamp({ role, content: text }, line.timestamp));
      if (role === "assistant" && Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === "tool_use" && typeof block.name === "string") {
            turns.push(
              withTimestamp(
                { role: "action", content: actionLine(block.name, block.input) },
                line.timestamp
              )
            );
          }
        }
      }
    } else if (line.type === "tool_call" && typeof line.name === "string") {
      turns.push(
        withTimestamp({ role: "action", content: actionLine(line.name, line.args) }, line.timestamp)
      );
    }
  }
  return turns;
}

// src/core/transcript-antigravity.ts
function readAntigravityTranscript(path) {
  if (!path) return [];
  const turns = [];
  for (const line of readJsonl(path)) {
    try {
      const event = JSON.parse(line);
      const role = event.role ?? event.message?.role ?? event.type;
      const normalizedRole = role === "user" || role === "USER_INPUT" ? "user" : role === "assistant" || role === "model" || role === "PLANNER_RESPONSE" ? "assistant" : void 0;
      const content = event.content ?? event.text ?? event.message?.content ?? event.message?.text;
      const clean = typeof content === "string" ? stripInjectedMemory(content).trim() : "";
      if (normalizedRole && clean) {
        turns.push({
          role: normalizedRole,
          content: clean,
          ...event.timestamp ? { timestamp: event.timestamp } : {}
        });
      }
    } catch {
    }
  }
  return turns;
}

// src/core/transcript-copilot.ts
function readCopilotTranscript(path) {
  const turns = [];
  for (const rawLine of readJsonl(path)) {
    try {
      const event = JSON.parse(rawLine);
      const role = event.type === "user.message" ? "user" : event.type === "assistant.message" ? "assistant" : void 0;
      const content = typeof event.data?.content === "string" ? stripInjectedMemory(event.data.content).trim() : "";
      if (!role || !content) continue;
      turns.push({ role, content, ...event.timestamp ? { timestamp: event.timestamp } : {} });
    } catch {
    }
  }
  return turns;
}

// src/core/transcript-grok.ts
import { existsSync as existsSync7, readFileSync as readFileSync12, readdirSync as readdirSync2 } from "fs";
import { homedir as homedir8 } from "os";
import { join as join17 } from "path";
var CHAT_HISTORY = "chat_history.jsonl";
function grokTranscriptPath(cwd, sessionId, grokHome = process.env.GROK_HOME || join17(homedir8(), ".grok")) {
  const sessionsDir = join17(grokHome, "sessions");
  const direct = join17(sessionsDir, encodeURIComponent(cwd), sessionId, CHAT_HISTORY);
  if (existsSync7(direct)) return direct;
  try {
    for (const candidate of readdirSync2(sessionsDir)) {
      const directory = join17(sessionsDir, candidate);
      if (readFileSync12(join17(directory, ".cwd"), "utf8").trim() === cwd) {
        return join17(directory, sessionId, CHAT_HISTORY);
      }
    }
  } catch {
  }
  return direct;
}
function readGrokTranscript(path) {
  const turns = [];
  for (const rawLine of readJsonl(path)) {
    try {
      const event = JSON.parse(rawLine);
      if (event.type !== "user" && event.type !== "assistant") continue;
      if (event.type === "user" && typeof event.prompt_index !== "number") continue;
      const content = typeof event.content === "string" ? event.content : Array.isArray(event.content) ? event.content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n") : "";
      const clean = stripInjectedMemory(content).trim();
      if (clean) turns.push({ role: event.type, content: clean });
      for (const toolCall of event.tool_calls ?? []) {
        if (!toolCall.name) continue;
        let input = toolCall.arguments;
        if (typeof input === "string") {
          try {
            input = JSON.parse(input);
          } catch {
          }
        }
        turns.push({ role: "action", content: actionLine(toolCall.name, input) });
      }
    } catch {
    }
  }
  return turns;
}

// src/core/transcript-devin.ts
import { existsSync as existsSync8 } from "fs";
import { createRequire } from "module";
import { homedir as homedir9 } from "os";
import { join as join18 } from "path";
function devinSessionDb(home = homedir9()) {
  return join18(home, ".local", "share", "devin", "cli", "sessions.db");
}
function parseDevinMessages(nodes) {
  const messages = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    try {
      const message = JSON.parse(node.chat_message);
      if (message.role !== "user" && message.role !== "assistant" || !message.content?.trim())
        continue;
      const content = stripInjectedMemory(message.content).trim();
      if (!content) continue;
      const id = message.message_id || `node:${node.node_id}`;
      messages.set(id, {
        index: messages.get(id)?.index ?? node.node_id,
        role: message.role,
        content
      });
    } catch {
    }
  }
  return [...messages.values()].sort((a, b) => a.index - b.index).map(({ role, content }) => ({ role, content }));
}
var requireBuiltin = createRequire(import.meta.url);
function loadSqlite() {
  try {
    return requireBuiltin("node:sqlite").DatabaseSync;
  } catch {
    return void 0;
  }
}
function readDevinTranscript(sessionId, dbPath = devinSessionDb()) {
  if (!sessionId) return [];
  const Database = loadSqlite();
  if (!Database) {
    diag("devin-cli", "sqlite_unavailable", { node: process.version, dbPath });
    return [];
  }
  if (!existsSync8(dbPath)) {
    diag("devin-cli", "session_db_missing", { dbPath });
    return [];
  }
  let db;
  try {
    db = new Database(dbPath, { readOnly: true });
    const rows = db.prepare(
      "SELECT node_id, chat_message FROM message_nodes WHERE session_id = ? ORDER BY node_id"
    ).all(sessionId);
    return parseDevinMessages(rows);
  } catch (error) {
    diag("devin-cli", "session_db_read_failed", { dbPath, error: String(error) });
    return [];
  } finally {
    try {
      db?.close();
    } catch {
    }
  }
}

// src/core/transcript-dcode.ts
var BLOCK_JOIN = "\n";
function contentText2(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((block) => {
    if (typeof block === "string") return [block];
    if (!block || typeof block !== "object") return [];
    const text = block.text;
    return typeof text === "string" ? [text] : [];
  }).join(BLOCK_JOIN);
}
function readPyValue(s, i) {
  const skip = (j) => {
    while (j < s.length && /\s/.test(s[j])) j++;
    return j;
  };
  i = skip(i);
  if (i >= s.length) return null;
  const c = s[i];
  if (c === "'" || c === '"') {
    let out = "";
    let j = i + 1;
    while (j < s.length) {
      const ch = s[j];
      if (ch === "\\") {
        const esc = s[j + 1];
        if (esc === void 0) return null;
        if (esc === "n") out += "\n";
        else if (esc === "t") out += "	";
        else if (esc === "r") out += "\r";
        else if (esc === "x") {
          const hex = s.slice(j + 2, j + 4);
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
          out += String.fromCharCode(parseInt(hex, 16));
          j += 4;
          continue;
        } else if (esc === "u") {
          const hex = s.slice(j + 2, j + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
          out += String.fromCharCode(parseInt(hex, 16));
          j += 6;
          continue;
        } else out += esc;
        j += 2;
        continue;
      }
      if (ch === c) return { value: out, end: j + 1 };
      out += ch;
      j++;
    }
    return null;
  }
  if (s.startsWith("True", i)) return { value: true, end: i + 4 };
  if (s.startsWith("False", i)) return { value: false, end: i + 5 };
  if (s.startsWith("None", i)) return { value: null, end: i + 4 };
  if (c === "[" || c === "{") {
    const isList = c === "[";
    const close = isList ? "]" : "}";
    const list = [];
    const obj = {};
    let j = skip(i + 1);
    if (s[j] === close) return { value: isList ? list : obj, end: j + 1 };
    for (; ; ) {
      const key = readPyValue(s, j);
      if (!key) return null;
      j = skip(key.end);
      if (isList) {
        list.push(key.value);
      } else {
        if (s[j] !== ":" || typeof key.value !== "string") return null;
        const val = readPyValue(s, j + 1);
        if (!val) return null;
        obj[key.value] = val.value;
        j = skip(val.end);
      }
      if (s[j] === ",") {
        j = skip(j + 1);
        if (s[j] === close) return { value: isList ? list : obj, end: j + 1 };
        continue;
      }
      if (s[j] === close) return { value: isList ? list : obj, end: j + 1 };
      return null;
    }
  }
  const num = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(s.slice(i));
  if (num) return { value: Number(num[0]), end: i + num[0].length };
  return null;
}
function dcodeAssistantText(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[{") && !trimmed.startsWith("[ {")) return raw;
  const parsed = readPyValue(trimmed, 0);
  if (!parsed || readPyValue(trimmed, parsed.end) !== null) return "";
  if (!Array.isArray(parsed.value)) return "";
  return contentText2(parsed.value);
}
function readDcodeTranscript(path) {
  const turns = [];
  for (const rawLine of readJsonl(path)) {
    if (!rawLine.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const record = parsed;
    if (record.schema_version !== 1) continue;
    const role = record.role;
    const stamp = typeof record.timestamp === "string" && record.timestamp ? { timestamp: record.timestamp } : {};
    if (role === "user" || role === "assistant") {
      const text = stripInjectedMemory(contentText2(record.content)).trim();
      if (text) turns.push({ role, content: text, ...stamp });
    } else if (role === "tool" && typeof record.name === "string" && record.name.trim()) {
      turns.push({ role: "action", content: actionLine(record.name, record.content), ...stamp });
    }
  }
  return turns;
}

// src/core/transcript-qwen.ts
var HOOK_CONTEXT_PART_RE = /^\s*<qwen:user-prompt-submit-context>[\s\S]*<\/qwen:user-prompt-submit-context>\s*$/;
function isWholeHookContextPart(part) {
  return typeof part.text === "string" && HOOK_CONTEXT_PART_RE.test(part.text);
}
function isRealUser(line) {
  if (typeof line.provenance === "string") return line.provenance === "real_user";
  if (line.provenance !== void 0) return false;
  const isSubagentEnvelope = line.agentId !== void 0 || line.isSidechain !== void 0;
  if (!isSubagentEnvelope) return false;
  return line.subtype === void 0 || line.subtype === "mid_turn_user_message";
}
function renderLine(parts, type) {
  if (!Array.isArray(parts)) return [];
  const last = parts.length > 1 ? parts[parts.length - 1] : void 0;
  const dropLast = !!last && typeof last === "object" && isWholeHookContextPart(last) ? parts.length - 1 : -1;
  const texts = [];
  const actions = [];
  for (const [i, part] of parts.entries()) {
    if (!part || typeof part !== "object") continue;
    if (i === dropLast) continue;
    if (part.thought === true) continue;
    if (typeof part.text === "string") {
      const text = stripInjectedMemory(part.text).trim();
      if (text) texts.push(text);
    } else if (part.functionCall && typeof part.functionCall.name === "string") {
      actions.push({
        role: "action",
        content: actionLine(part.functionCall.name, part.functionCall.args)
      });
    }
  }
  const out = [];
  const joined = texts.join("\n").trim();
  if (joined) out.push({ role: type, content: joined });
  out.push(...actions);
  return out;
}
function readQwenTranscript(path) {
  const turns = [];
  try {
    collectQwenTurns(path, turns);
  } catch (err) {
    log.warn("qwen-code", "transcript read failed \u2014 retaining what was parsed", {
      path,
      turns: turns.length,
      error: err instanceof Error ? err.message : String(err)
    });
  }
  return turns;
}
function collectQwenTurns(path, turns) {
  for (const rawLine of readJsonl(path)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const line = parsed;
    if (line.type !== "user" && line.type !== "assistant") continue;
    if (line.type === "user" && !isRealUser(line)) continue;
    if (typeof line.message !== "object" || line.message === null) continue;
    const sp = line.systemPayload;
    if (line.type === "user" && sp && typeof sp === "object" && typeof sp.hookContext === "string" && typeof sp.displayText === "string") {
      const content = stripInjectedMemory(sp.displayText).trim();
      if (content) {
        const turn = { role: "user", content };
        if (typeof line.timestamp === "string") turn.timestamp = line.timestamp;
        turns.push(turn);
      }
      continue;
    }
    for (const rendered of renderLine(line.message.parts, line.type)) {
      const turn = { role: rendered.role, content: rendered.content };
      if (typeof line.timestamp === "string") turn.timestamp = line.timestamp;
      turns.push(turn);
    }
  }
}

// src/core/transcript-droid.ts
function renderContent(content, role) {
  if (!Array.isArray(content)) return [];
  const texts = [];
  const actions = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block;
    if (b.type === "text" && typeof b.text === "string") {
      const text = stripInjectedMemory(b.text).trim();
      if (text) texts.push(text);
    } else if (b.type === "tool_use" && typeof b.name === "string") {
      actions.push({ role: "action", content: actionLine(b.name, b.input) });
    }
  }
  const out = [];
  const joined = texts.join("\n").trim();
  if (joined) out.push({ role, content: joined });
  out.push(...actions);
  return out;
}
function readDroidTranscript(path) {
  const turns = [];
  for (const rawLine of readJsonl(path)) {
    if (!rawLine.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(rawLine);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const line = parsed;
    if (line.type !== "message" || !line.message || typeof line.message !== "object") continue;
    const message = line.message;
    const role = message.role;
    if (role !== "user" && role !== "assistant") continue;
    if (message.visibility === "user_only" || message.visibility === "llm_only") continue;
    const stamp = typeof line.timestamp === "string" && line.timestamp ? { timestamp: line.timestamp } : {};
    turns.push(...renderContent(message.content, role).map((turn) => ({ ...turn, ...stamp })));
  }
  return turns;
}

// src/core/transcript-zcode.ts
import { readFileSync as readFileSync13 } from "fs";
function messageText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.filter((block) => block && typeof block === "object" && typeof block.text === "string").map((block) => block.text.trim()).filter(Boolean).join("\n").trim();
}
function readZcodeTranscript(path) {
  if (!path) return [];
  let body;
  try {
    body = readFileSync13(path, "utf8");
  } catch {
    return [];
  }
  const turns = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const record = parsed;
    const message = typeof record.message === "object" && record.message !== null ? record.message : void 0;
    const role = typeof message?.role === "string" ? message.role : record.type;
    if (role !== "user" && role !== "assistant") continue;
    const content = stripInjectedMemory(messageText(message?.content)).trim();
    if (!content) continue;
    turns.push({
      role,
      content,
      ...typeof record.timestamp === "string" ? { timestamp: record.timestamp } : {}
    });
  }
  return turns;
}
function zcodeAssistantText(path) {
  if (!path) return "";
  return readZcodeTranscript(path).filter((turn) => turn.role === "assistant").at(-1)?.content ?? "";
}

// src/harness/hook-lifecycle.ts
var cursorCwd = (ev) => ev.cwd ?? ev.workspace_root ?? (Array.isArray(ev.workspace_roots) ? ev.workspace_roots[0] : void 0);
var claudePrompt = {
  harness: "claude-code",
  parse: (ev) => ({
    prompt: ev.prompt,
    cwd: ev.cwd,
    sessionId: ev.session_id
  }),
  emit: (context, notice) => ({
    ...notice ? { systemMessage: notice } : {},
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context }
  })
};
var codexPrompt = {
  ...claudePrompt,
  harness: "codex",
  parse: (ev) => ({
    prompt: ev.prompt ?? ev.user_prompt,
    cwd: ev.cwd,
    sessionId: ev.session_id
  })
};
var dcodePrompt = {
  ...claudePrompt,
  harness: "dcode"
};
var droidPrompt = {
  ...claudePrompt,
  harness: "factory-droid"
};
var qwenPrompt = {
  ...claudePrompt,
  harness: "qwen-code",
  parse: (ev) => ({
    prompt: ev.submitted_prompt,
    cwd: ev.cwd,
    sessionId: ev.session_id
  })
};
var zcodeSessionId = (ev) => ev.session_id ?? ev.sessionId;
var antigravityCwd = (ev) => Array.isArray(ev.workspacePaths) ? ev.workspacePaths[0] : void 0;
var antigravityPrompt = {
  harness: "antigravity-cli",
  requireCwd: true,
  parse: (ev) => ({
    // Antigravity's PreInvocation payload deliberately omits the prompt. Its transcript is already
    // persisted at that point, so recover the latest real user turn from the supplied JSONL path.
    prompt: readAntigravityTranscript(ev.transcriptPath).filter((turn) => turn.role === "user").at(-1)?.content,
    cwd: antigravityCwd(ev),
    sessionId: ev.conversationId
  }),
  emit: (context) => ({ injectSteps: context ? [{ ephemeralMessage: context }] : [] })
};
var cursorPrompt = {
  harness: "cursor-cli",
  parse: (ev) => ({
    prompt: ev.prompt ?? ev.user_prompt,
    cwd: cursorCwd(ev),
    sessionId: ev.conversation_id ?? ev.session_id
  }),
  emit: (context) => ({ continue: true, additional_context: context })
};
var copilotPrompt = {
  harness: "copilot-cli",
  parse: (ev) => ({
    prompt: ev.prompt,
    cwd: ev.cwd,
    sessionId: ev.sessionId
  }),
  emit: (context, _notice, ev) => ({
    // Copilot's userPromptTransformed hook replaces model-facing content rather than appending
    // hook context. Preserve its transformed prompt and add the shared Hindsight injection.
    modifiedTransformedPrompt: `${ev?.transformedPrompt ?? ""}

${context}`.trim()
  })
};
var devinCwd = () => process.env.DEVIN_PROJECT_DIR;
var devinPrompt = {
  harness: "devin-cli",
  requireCwd: true,
  parse: (ev) => ({
    prompt: ev.prompt,
    cwd: devinCwd(),
    sessionId: ev.session_id
  }),
  emit: (context) => ({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context }
  })
};
var standardSessionStart = (harness) => ({
  harness,
  parse: (ev) => ({
    cwd: ev.cwd,
    sessionId: ev.session_id
  }),
  emit: (out) => ({
    ...out.systemMessage ? { systemMessage: out.systemMessage } : {},
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      ...out.additionalContext ? { additionalContext: out.additionalContext } : {}
    }
  })
});
var HOOK_HARNESSES = {
  "claude-code": {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "claude-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "claude-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "claude-stop-hook.js", timeout: 60 }
    },
    sessionStart: standardSessionStart("claude-code"),
    prompt: claudePrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "claude-code",
      parse: (ev) => ({
        sessionId: ev.session_id,
        transcriptPath: ev.transcript_path,
        cwd: ev.cwd
      })
    }
  },
  codex: {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "codex-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "codex-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "codex-stop-hook.js", timeout: 60 }
    },
    sessionStart: standardSessionStart("codex"),
    prompt: codexPrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "codex",
      parse: (ev) => ({
        sessionId: ev.session_id,
        transcriptPath: ev.transcript_path,
        cwd: ev.cwd
      }),
      readTranscript: readCodexTranscript
    }
  },
  dcode: {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "dcode-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "dcode-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "dcode-stop-hook.js", timeout: 60 }
    },
    sessionStart: standardSessionStart("dcode"),
    prompt: dcodePrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "dcode",
      parse: (ev) => ({
        sessionId: ev.session_id,
        transcriptPath: ev.transcript_path,
        cwd: ev.cwd,
        lastAssistantMessage: ev.last_assistant_message
      }),
      readTranscript: readDcodeTranscript,
      readLastMessage: dcodeAssistantText
    }
  },
  "antigravity-cli": {
    configStyle: "flat",
    install: {
      // PreInvocation is Antigravity's only lifecycle point that can inject context. Its first
      // invocation also performs the SessionStart responsibilities through runHook's seed guard.
      sessionStart: { event: "PreInvocation", entry: "antigravity-hook.js", timeout: 30 },
      prompt: { event: "PreInvocation", entry: "antigravity-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "antigravity-stop-hook.js", timeout: 30 }
    },
    sessionStart: {
      harness: "antigravity-cli",
      parse: (ev) => ({
        cwd: antigravityCwd(ev),
        sessionId: ev.conversationId
      }),
      emit: () => ({})
    },
    prompt: antigravityPrompt,
    retain: {
      hostTimeoutSec: 30,
      harness: "antigravity-cli",
      parse: (ev) => ({
        sessionId: ev.conversationId,
        transcriptPath: ev.transcriptPath,
        cwd: antigravityCwd(ev)
      }),
      readTranscript: readAntigravityTranscript
    }
  },
  "cursor-cli": {
    configStyle: "flat",
    install: {
      sessionStart: { event: "sessionStart", entry: "cursor-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "beforeSubmitPrompt", entry: "cursor-hook.js" },
      stop: { event: "stop", entry: "cursor-stop-hook.js", timeout: 30 }
    },
    sessionStart: {
      harness: "cursor-cli",
      parse: (ev) => ({
        cwd: cursorCwd(ev),
        sessionId: ev.conversation_id ?? ev.session_id
      }),
      emit: (out) => ({
        ...out.additionalContext ? { additional_context: out.additionalContext } : {}
      })
    },
    prompt: cursorPrompt,
    retain: {
      hostTimeoutSec: 30,
      harness: "cursor-cli",
      parse: (ev) => ({
        sessionId: ev.conversation_id ?? ev.session_id,
        transcriptPath: ev.transcript_path,
        cwd: cursorCwd(ev)
      }),
      readTranscript: readCursorTranscript
    }
  },
  "copilot-cli": {
    configStyle: "flat",
    install: {
      sessionStart: { event: "sessionStart", entry: "copilot-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "userPromptTransformed", entry: "copilot-hook.js", timeout: 30 },
      stop: { event: "agentStop", entry: "copilot-stop-hook.js", timeout: 60 }
    },
    sessionStart: {
      harness: "copilot-cli",
      parse: (ev) => ({
        cwd: ev.cwd,
        sessionId: ev.sessionId
      }),
      // Copilot CLI's SessionStart response only has model-facing `additionalContext`; unlike
      // Claude/Cursor it has no supported in-TUI system-message/banner channel. Keep memory
      // quiet rather than auto-submitting a synthetic prompt or showing an OS notification. When
      // Copilot exposes a real TUI extension point, add the banner there without changing this
      // shared lifecycle output.
      emit: (out) => ({
        ...out.additionalContext ? { additionalContext: out.additionalContext } : {}
      })
    },
    prompt: copilotPrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "copilot-cli",
      parse: (ev) => ({
        sessionId: ev.sessionId,
        transcriptPath: ev.transcriptPath,
        cwd: ev.cwd
      }),
      readTranscript: readCopilotTranscript
    }
  },
  "devin-cli": {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "devin-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "devin-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "devin-stop-hook.js", timeout: 60 }
    },
    sessionStart: {
      harness: "devin-cli",
      parse: (ev) => ({ cwd: devinCwd(), sessionId: ev.session_id }),
      emit: (out) => ({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          ...out.additionalContext ? { additionalContext: out.additionalContext } : {}
        }
      })
    },
    prompt: devinPrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "devin-cli",
      parse: (ev) => {
        const sessionId = ev.session_id;
        return {
          sessionId,
          // RetainHook calls the supplied reader with transcriptPath; Devin's reader uses its
          // session id because the CLI persists conversations in sessions.db rather than a file.
          transcriptPath: sessionId,
          cwd: devinCwd()
        };
      },
      readTranscript: readDevinTranscript
    }
  },
  "grok-build": {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "grok-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "grok-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "grok-stop-hook.js", timeout: 60 }
    },
    sessionStart: {
      ...standardSessionStart("grok-build"),
      // Grok's wire envelope is camelCase, unlike Claude's similarly named hook events.
      parse: (ev) => ({
        cwd: ev.cwd,
        sessionId: ev.sessionId
      })
    },
    prompt: {
      ...claudePrompt,
      harness: "grok-build",
      parse: (ev) => ({
        prompt: ev.prompt,
        cwd: ev.cwd,
        sessionId: ev.sessionId
      })
    },
    retain: {
      hostTimeoutSec: 60,
      harness: "grok-build",
      parse: (ev) => ({
        sessionId: ev.sessionId,
        transcriptPath: typeof ev.cwd === "string" && typeof ev.sessionId === "string" ? grokTranscriptPath(ev.cwd, ev.sessionId) : void 0,
        cwd: ev.cwd
      }),
      readTranscript: readGrokTranscript
    }
  },
  "qwen-code": {
    configStyle: "nested",
    timeoutUnit: "milliseconds",
    // TIMEOUTS ARE MILLISECONDS HERE, not seconds like every other harness in this table: Qwen's
    // hookRunner does `setTimeout(..., hookConfig.timeout ?? DEFAULT_HOOK_TIMEOUT)` with
    // DEFAULT_HOOK_TIMEOUT = 60_000 ("Timeout in milliseconds, default 60000"). Writing 30/60
    // registers 30ms/60ms hooks, which die before a Node process starts — and Qwen spawns hooks
    // `detached` and terminates the whole process TREE on timeout, so the retain is genuinely lost
    // rather than merely orphaned. `retain.hostTimeoutSec` below stays SECONDS, as its name says;
    // these two numbers are the same budget in different units for this harness alone.
    // The prompt timeout must also stay above core/config.ts's DEFAULT_REFLECT_TIMEOUT_MS.
    install: {
      sessionStart: { event: "SessionStart", entry: "qwen-sessionstart-hook.js", timeout: 3e4 },
      prompt: { event: "UserPromptSubmit", entry: "qwen-hook.js", timeout: 3e4 },
      stop: { event: "Stop", entry: "qwen-stop-hook.js", timeout: 6e4 }
    },
    sessionStart: standardSessionStart("qwen-code"),
    prompt: qwenPrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "qwen-code",
      parse: (ev) => ({
        sessionId: ev.session_id,
        // Qwen supplies the path, but as the EMPTY STRING (not null, not absent) when chat
        // recording is off — runRetainHook's `if (!transcriptPath) return` already covers that.
        transcriptPath: ev.transcript_path,
        cwd: ev.cwd
      }),
      readTranscript: readQwenTranscript
    }
  },
  "factory-droid": {
    configStyle: "nested",
    install: {
      sessionStart: { event: "SessionStart", entry: "droid-sessionstart-hook.js", timeout: 30 },
      prompt: { event: "UserPromptSubmit", entry: "droid-hook.js", timeout: 30 },
      stop: { event: "Stop", entry: "droid-stop-hook.js", timeout: 60 }
    },
    // Droid emits Notification(idle_prompt), not Stop, after user cancellation. Reusing the
    // idempotent retain entry point captures that final partial turn; its event gate ignores every
    // other notification type before config or daemon work begins.
    additionalHooks: [{ event: "Notification", entry: "droid-stop-hook.js", timeout: 60 }],
    sessionStart: standardSessionStart("factory-droid"),
    prompt: droidPrompt,
    retain: {
      hostTimeoutSec: 60,
      harness: "factory-droid",
      accept: (ev) => ev.hook_event_name === "Stop" || ev.hook_event_name === "Notification" && ev.notification_type === "idle_prompt",
      parse: (ev) => ({
        sessionId: ev.session_id,
        transcriptPath: ev.transcript_path,
        cwd: ev.cwd
      }),
      readTranscript: readDroidTranscript
    }
  },
  /**
   * ZCode (Z.ai's GLM coding agent) embeds the Claude Code agent runtime, so its hook PROTOCOL is
   * Claude's — `prompt`/`cwd` in, `hookSpecificOutput.additionalContext` + `systemMessage` out —
   * with `sessionId` accepted alongside `session_id`, which its Stop payload sends instead.
   *
   * What is not Claude's is the TRANSCRIPT, and that is the whole of the difference here. ZCode
   * keeps no durable session file: `Stop` carries the reply in `responseText` plus a temp,
   * assistant-only transcript it deletes as soon as the hook returns, and no user prompt at all.
   * So this is the one harness that retains from the plugin's own journal (core/turn-journal.ts) —
   * the prompt hook appends the user turn, `journal.assistantText` closes it with the reply — and
   * everything downstream (cursor, append, stamping) sees the same full conversation as any host
   * transcript.
   */
  zcode: {
    configStyle: "process",
    // ZCode's `timeoutMs`, so MILLISECONDS — see the qwen-code note above for the same trap. The
    // prompt budget must stay above core/config.ts's DEFAULT_REFLECT_TIMEOUT_MS.
    timeoutUnit: "milliseconds",
    install: {
      sessionStart: { event: "SessionStart", entry: "zcode-sessionstart-hook.js", timeout: 3e4 },
      prompt: { event: "UserPromptSubmit", entry: "zcode-hook.js", timeout: 3e4 },
      stop: { event: "Stop", entry: "zcode-stop-hook.js", timeout: 6e4 }
    },
    sessionStart: {
      ...standardSessionStart("zcode"),
      parse: (ev) => ({ cwd: ev.cwd, sessionId: zcodeSessionId(ev) })
    },
    prompt: {
      ...claudePrompt,
      harness: "zcode",
      journalPrompt: true,
      parse: (ev) => ({
        prompt: ev.prompt ?? ev.user_prompt,
        cwd: ev.cwd,
        sessionId: zcodeSessionId(ev)
      })
    },
    retain: {
      hostTimeoutSec: 60,
      harness: "zcode",
      // No transcriptPath: the journal supplies it (see `journal` below).
      parse: (ev) => ({ sessionId: zcodeSessionId(ev), cwd: ev.cwd }),
      journal: {
        // `responseText` is the full reply and is what ZCode sends in practice. The ephemeral
        // transcript is the fallback when it is absent, and `responsePreview` — which is
        // TRUNCATED — is the last resort, preferred only over losing the turn entirely.
        assistantText: (ev) => (ev.responseText || zcodeAssistantText(ev.transcript_path) || ev.responsePreview || "").trim()
      }
    }
  }
};
var runHarnessSessionStart = (harness) => runSessionStartHook(HOOK_HARNESSES[harness].sessionStart);

// src/claude-sessionstart-hook.ts
void runHarnessSessionStart("claude-code");
