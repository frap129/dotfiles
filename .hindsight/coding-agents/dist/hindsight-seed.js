#!/usr/bin/env node

// src/core/config.ts
import { readFileSync as readFileSync2 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join7 } from "path";

// src/core/seed.ts
import { spawn as realSpawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var DEFAULT_SEED_LIMIT = 300;
function startBackgroundSeed(repoDir, opts = {}) {
  try {
    const spawnFn = opts.spawn ?? realSpawn;
    const enginePath = opts.enginePath ?? join(dirname(fileURLToPath(import.meta.url)), "deepen.js");
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
function seedControl(command2, args) {
  if (command2 === "seed") {
    startBackgroundSeed(args.repo, { limit: args.limit, spawn: args.spawn });
    return {
      ok: true,
      message: `\u{1F9E0} Hindsight is learning this repo \u2192 memory bank \u201C${args.bankId}\u201D`
    };
  }
  return { ok: false, message: "usage: hindsight-seed seed --repo <dir>" };
}

// src/core/bank.ts
import { existsSync } from "fs";
import { homedir as homedir2 } from "os";
import { basename, dirname as dirname4, join as join5, normalize, sep } from "path";

// src/core/diag.ts
import { join as join3 } from "path";

// src/core/log.ts
import { appendFileSync, mkdirSync, renameSync, statSync } from "fs";
import { homedir } from "os";
import { dirname as dirname2, join as join2 } from "path";
function logsDir() {
  return join2(homedir(), ".hindsight", "coding-agents-logs");
}
var LOG_MAX_BYTES = 10 * 1024 * 1024;
function appendLogLine(file, text) {
  mkdirSync(dirname2(file), { recursive: true, mode: 448 });
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
  return process.env.HINDSIGHT_LOG_FILE || join2(logsDir(), "plugin.log");
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
  return process.env.HINDSIGHT_DIAG_FILE || join3(logsDir(), "diag.jsonl");
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
import { dirname as dirname3, isAbsolute, join as join4, resolve } from "path";
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
  const pointer = entryKind(join4(gitDir, "commondir")) === "file" ? readTextOrNull(join4(gitDir, "commondir"))?.trim() : null;
  if (!pointer) return gitDir;
  return isAbsolute(pointer) ? pointer : resolve(gitDir, pointer);
}
function isBare(commonDir) {
  const config = readTextOrNull(join4(commonDir, "config"));
  return config !== null && /^\s*bare\s*=\s*true\s*$/im.test(config);
}
function looksLikeBareRepository(directory) {
  return entryKind(join4(directory, "HEAD")) === "file" && entryKind(join4(directory, "objects")) === "dir" && entryKind(join4(directory, "refs")) === "dir";
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
    const dotGit = join4(current2, ".git");
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
    const parent = dirname3(current2);
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
    const resolve2 = resolvers[name];
    if (!resolve2) {
      console.error(
        `hindsight: unknown ${what} placeholder "{${name}}" \u2014 valid: ` + Object.keys(resolvers).sort().map((k) => `{${k}}`).join(", ")
      );
      return "unknown";
    }
    return resolve2();
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
  if (basename(commonDir) === ".git") return { status: "resolved", root: dirname4(commonDir) };
  if (basename(commonDir).startsWith(".") && layout.bare) {
    return { status: "resolved", root: dirname4(commonDir) };
  }
  return { status: "resolved", root: commonDir };
}
var PROJECT_ROOT_ENV = ["CLAUDE_PROJECT_DIR"];
function nearestExistingDir(directory) {
  let current2 = directory;
  while (current2) {
    if (existsSync(current2)) return current2;
    const parent = dirname4(current2);
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
  const expanded = dir === "~" || dir.startsWith("~/") ? join5(homedir2(), dir.slice(1)) : dir;
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

// src/core/missions.ts
import { createHash } from "crypto";
var RETAIN_EXTRACTION_MODES = ["concise", "verbose", "verbatim", "chunks"];
var DEFAULT_RETAIN_EXTRACTION_MODE = "concise";
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

// src/core/util.ts
import { accessSync, constants } from "fs";
import { delimiter, join as join6 } from "path";

// src/core/hindsight.ts
var DEFAULT_OBSERVATION_SCOPES = "shared";
var DEFAULT_PAGE_SEARCH_LIMIT = 10;
var RETRY_AFTER_FLOOR_MS = 10 * 1e3;
var RETRY_AFTER_CEILING_MS = 60 * 1e3;

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

// src/hindsight-seed.ts
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : void 0;
}
var command = process.argv[2] || "";
var repo = arg("repo") || process.cwd();
var cfg = loadConfig({ harness: "claude-code" });
var bankId = deriveBankIdOrSkip(cfg, repo, "claude-code");
if (bankId === null) {
  console.error(
    `seed: cannot identify the repository at ${repo} \u2014 refusing to seed a guessed bank`
  );
  process.exit(1);
}
var result = seedControl(command, { repo, bankId });
console.log(result.message);
process.exit(result.ok ? 0 : 1);
