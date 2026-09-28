#!/usr/bin/env node

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
function buildPageTrigger(cfg2 = {}) {
  const base = { fact_types: PAGE_FACT_TYPES, tags_match: PAGE_TAGS_MATCH };
  switch (cfg2.pageTriggerType) {
    case "auto-refresh":
      return { ...base, refresh_after_consolidation: true };
    case "manual":
      return { ...base, refresh_after_consolidation: false };
    // "cron" and an unset type alike: the default schedule stands in for a missing expression, so
    // a trigger built from a partial config is never a cron trigger with nothing to fire on.
    default:
      return { ...base, refresh_cron: cfg2.pageTriggerCron || DEFAULT_PAGE_TRIGGER_CRON };
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
function applyBankConfig(cfg2, resolvedId, directory) {
  if (directory !== void 0 && !isOptedIn(cfg2, directory))
    return { cfg: { ...cfg2, disabled: true }, bankId: resolvedId };
  const section = cfg2.banks[resolvedId];
  if (!section) return { cfg: cfg2, bankId: resolvedId };
  const safe = { ...section };
  for (const k of BANK_OVERRIDE_EXCLUDED) delete safe[k];
  delete safe.banks;
  const bankId = typeof safe.bank === "string" && safe.bank ? safe.bank : resolvedId;
  delete safe.bank;
  return { cfg: { ...cfg2, ...resolvePartial(cfg2, safe) }, bankId };
}
function resolvePartial(cfg2, patch) {
  const full = resolveConfig(patch);
  const out = {};
  for (const key of Object.keys(patch)) {
    if (key in full)
      out[key] = full[key];
  }
  if ("autoReflect" in patch && !("autoInject" in patch)) out.autoInject = full.autoInject;
  return out;
}

// src/core/status.ts
import { execFileSync as execFileSync2 } from "child_process";

// src/core/git.ts
import { execFileSync } from "child_process";
import { resolve as resolve2 } from "path";
function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], {
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
function commitsSince(dir, sinceSha) {
  try {
    const n = Number.parseInt(git(dir, "rev-list", "--count", `${sinceSha}..HEAD`).trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
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

// src/core/survey.ts
import { spawn as realSpawn3 } from "child_process";
import { createHash as createHash2 } from "crypto";
import { existsSync as existsSync2 } from "fs";
import { homedir as homedir4, tmpdir } from "os";
import { dirname as dirname5, join as join9 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// src/core/survey-lease.ts
import { spawn as realSpawn2 } from "child_process";
import { randomUUID } from "crypto";
import {
  mkdirSync as mkdirSync2,
  mkdtempSync,
  readdirSync,
  renameSync as renameSync2,
  rmdirSync,
  rmSync,
  statSync as statSync2,
  unlinkSync,
  utimesSync,
  writeFileSync
} from "fs";
import { join as join8 } from "path";

// src/core/survey.ts
var SURVEY_DOC_IDS = [
  "repository-component-map",
  "repository-core-concepts",
  "repository-conventions-and-patterns",
  "repository-tech-stack-and-features"
];

// src/core/status.ts
var DEEPEN_DIFF_TARGET = 300;
function commitCount(repoDir) {
  try {
    const out = execFileSync2("git", ["-C", repoDir, "rev-list", "--count", "HEAD"], {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
      // failed probes must not write into the host TUI
    });
    return Number(out.trim()) || 0;
  } catch {
    return null;
  }
}
async function syncStatus(client2, bank, repoDir) {
  const gitIds = await client2.listDocumentIds("source:git", "all_strict");
  const chatIds = await client2.listDocumentIds("source:chat", "all_strict").catch(() => /* @__PURE__ */ new Set());
  const pages = parsePageList(await client2.listPages().catch(() => null));
  const activeOps = await client2.activeOperations().catch(() => null);
  const uploads = await client2.listDocumentIds("source:upload", "all_strict").catch(() => /* @__PURE__ */ new Set());
  const surveyDocs = SURVEY_DOC_IDS.filter((id) => uploads.has(id)).length;
  let surveyBaseline = null;
  let surveyCommitsBehind = null;
  if (repoDir) {
    try {
      const markers = await client2.listDocumentIds("source:survey-baseline", "all_strict");
      let best;
      for (const id of markers) {
        const sha = id.replace(/^survey-baseline:/, "");
        const behind = commitsSince(repoDir, sha);
        if (behind !== null && (!best || behind < best.behind)) best = { sha, behind };
      }
      if (best) {
        surveyBaseline = best.sha;
        surveyCommitsBehind = best.behind;
      }
    } catch {
    }
  }
  const repoName = repoDir ? repoNameOf(repoDir) : void 0;
  const gitlogPresent = repoName ? gitIds.has(`gitlog:${repoName}`) : [...gitIds].some((id) => id.startsWith("gitlog:"));
  const gitDiffDocs = [...gitIds].filter((id) => id.startsWith("git:")).length;
  const commits = repoDir ? commitCount(repoDir) : null;
  const gitDiffTarget = commits === null ? null : Math.min(DEEPEN_DIFF_TARGET, commits);
  return {
    bank,
    gitlogPresent,
    gitDiffDocs,
    gitDiffTarget,
    chatDocs: chatIds.size,
    pagesCount: pages.length,
    surveyBaseline,
    surveyDocs,
    surveyCommitsBehind,
    activeOps,
    // Older Hindsight servers have no page surface. They are still fully usable for the
    // legacy bank/retain pipeline, so page absence must not make syncStatus permanently false.
    synced: gitlogPresent && (client2.knowledgePagesSupported === false || pages.length > 0) && (activeOps ?? 0) === 0
  };
}

// src/status.ts
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return void 0;
}
var REPO = arg("repo");
var cfg0 = loadConfig({ harness: arg("harness") ?? void 0, path: arg("config") });
var BANK = arg("bank") ?? (REPO ? deriveBankIdOrSkip(cfg0, REPO, arg("harness") ?? cfg0.harness) : cfg0.bankId) ?? void 0;
if (!BANK) {
  console.error("usage: node status.js --repo <path> [--bank <id>] [--api-url U]");
  process.exit(1);
}
var resolved0 = BANK ? applyBankConfig(cfg0, BANK) : { cfg: cfg0, bankId: BANK };
var cfg = resolved0.cfg;
var FINAL_BANK = resolved0.bankId ?? BANK;
var client = new HindsightClient({
  apiUrl: arg("api-url") ?? cfg.apiUrl,
  apiToken: arg("api-token") ?? cfg.apiToken,
  bank: FINAL_BANK,
  maxParallelRetains: cfg.maxParallelRetains,
  observationScopes: cfg.observationScopes
});
syncStatus(client, FINAL_BANK, REPO).then((s) => console.log(JSON.stringify(s))).catch((e) => {
  console.error("status failed:", e.message || e);
  process.exit(1);
});
