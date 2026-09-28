#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@vectorize-io/hindsight-all/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  HindsightServer: () => HindsightServer,
  consoleLogger: () => consoleLogger,
  getEmbedCommand: () => getEmbedCommand,
  silentLogger: () => silentLogger
});
import { spawn } from "child_process";
function getEmbedCommand(opts = {}) {
  if (opts.embedPackagePath) {
    return ["uv", "run", "--directory", opts.embedPackagePath, "hindsight-embed"];
  }
  const version = opts.embedVersion && opts.embedVersion.length > 0 ? opts.embedVersion : "latest";
  return ["uvx", `hindsight-embed@${version}`];
}
var silentLogger, consoleLogger, DEFAULT_PORT, DEFAULT_HOST, DEFAULT_PROFILE, DEFAULT_READY_TIMEOUT_MS, DEFAULT_READY_POLL_INTERVAL_MS, HindsightServer;
var init_dist = __esm({
  "node_modules/@vectorize-io/hindsight-all/dist/index.js"() {
    "use strict";
    silentLogger = {
      debug: () => {
      },
      info: () => {
      },
      warn: () => {
      },
      error: () => {
      }
    };
    consoleLogger = {
      debug: (msg) => console.debug(msg),
      info: (msg) => console.log(msg),
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg)
    };
    DEFAULT_PORT = 8888;
    DEFAULT_HOST = "127.0.0.1";
    DEFAULT_PROFILE = "default";
    DEFAULT_READY_TIMEOUT_MS = 3e4;
    DEFAULT_READY_POLL_INTERVAL_MS = 1e3;
    HindsightServer = class {
      profile;
      port;
      host;
      baseUrl;
      embedVersion;
      embedPackagePath;
      userEnv;
      extraProfileCreateArgs;
      extraDaemonStartArgs;
      platformCpuWorkaround;
      readyTimeoutMs;
      readyPollIntervalMs;
      logger;
      constructor(opts = {}) {
        this.profile = opts.profile ?? DEFAULT_PROFILE;
        this.port = opts.port ?? DEFAULT_PORT;
        this.host = opts.host ?? DEFAULT_HOST;
        this.baseUrl = `http://${this.host}:${this.port}`;
        this.embedVersion = opts.embedVersion;
        this.embedPackagePath = opts.embedPackagePath;
        this.userEnv = opts.env ?? {};
        this.extraProfileCreateArgs = opts.extraProfileCreateArgs ?? [];
        this.extraDaemonStartArgs = opts.extraDaemonStartArgs ?? [];
        this.platformCpuWorkaround = opts.platformCpuWorkaround ?? process.platform === "darwin";
        this.readyTimeoutMs = opts.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
        this.readyPollIntervalMs = opts.readyPollIntervalMs ?? DEFAULT_READY_POLL_INTERVAL_MS;
        this.logger = opts.logger ?? silentLogger;
      }
      /** The base URL the daemon listens on (`http://host:port`). */
      getBaseUrl() {
        return this.baseUrl;
      }
      /** The profile name this server operates on. */
      getProfile() {
        return this.profile;
      }
      /**
       * Ensure the daemon is configured and running. Idempotent — the underlying
       * `profile create --merge` and `daemon start` commands tolerate re-runs.
       */
      async start() {
        this.logger.info(`[hindsight] starting daemon for profile "${this.profile}"`);
        const env = this.buildEnv();
        await this.configureProfile(env);
        await this.startDaemon(env);
        await this.waitForReady();
        this.logger.info(`[hindsight] daemon ready at ${this.baseUrl}`);
      }
      /** Stop the daemon. Never throws — logs and resolves even on failure. */
      async stop() {
        this.logger.info(`[hindsight] stopping daemon for profile "${this.profile}"`);
        const [cmd, ...baseArgs] = getEmbedCommand({
          embedVersion: this.embedVersion,
          embedPackagePath: this.embedPackagePath
        });
        const args = [...baseArgs, "daemon", "--profile", this.profile, "stop"];
        const child = spawn(cmd, args, { stdio: "pipe" });
        this.pipeOutput(child, "daemon.stop");
        await new Promise((resolve2) => {
          const timeout = setTimeout(() => {
            this.logger.warn(`[hindsight] daemon stop timed out after 5s`);
            resolve2();
          }, 5e3);
          child.on("exit", () => {
            clearTimeout(timeout);
            this.logger.info(`[hindsight] daemon stopped`);
            resolve2();
          });
          child.on("error", (err) => {
            clearTimeout(timeout);
            this.logger.warn(`[hindsight] error stopping daemon: ${err.message}`);
            resolve2();
          });
        });
      }
      /** Probe `/health` once with a short timeout. */
      async checkHealth() {
        try {
          const res = await fetch(`${this.baseUrl}/health`, {
            signal: AbortSignal.timeout(2e3)
          });
          return res.ok;
        } catch {
          return false;
        }
      }
      // -------------------------------------------------------------------------
      // Internal
      // -------------------------------------------------------------------------
      /**
       * Merge the process env, the caller-supplied `env`, and (on macOS) the
       * embeddings CPU workaround. Caller-supplied values always win over the
       * workaround; undefined values are dropped.
       */
      buildEnv() {
        const merged = { ...process.env };
        if (this.platformCpuWorkaround && process.platform === "darwin") {
          merged["HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU"] = "1";
          merged["HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU"] = "1";
        }
        for (const [key, value] of Object.entries(this.userEnv)) {
          if (value !== void 0) {
            merged[key] = value;
          }
        }
        return merged;
      }
      /**
       * Run `profile create <name> --merge --port <port> [--env K=V ...]`.
       * Every entry in the merged env that was passed via {@link userEnv} (or
       * auto-applied by the CPU workaround) is forwarded as `--env`.
       */
      async configureProfile(env) {
        this.logger.info(`[hindsight] configuring profile "${this.profile}"`);
        const [cmd, ...baseArgs] = getEmbedCommand({
          embedVersion: this.embedVersion,
          embedPackagePath: this.embedPackagePath
        });
        const createArgs = [
          ...baseArgs,
          "profile",
          "create",
          this.profile,
          "--merge",
          "--port",
          String(this.port)
        ];
        const envForProfile = this.collectProfileEnv(env);
        for (const [key, value] of Object.entries(envForProfile)) {
          createArgs.push("--env", `${key}=${value}`);
        }
        createArgs.push(...this.extraProfileCreateArgs);
        await this.runCommand(cmd, createArgs, env, "profile.create");
      }
      /** Collect only the env vars that should be written into the profile file. */
      collectProfileEnv(env) {
        const out = {};
        for (const [key, value] of Object.entries(this.userEnv)) {
          if (value !== void 0) {
            out[key] = value;
          }
        }
        if (this.platformCpuWorkaround && process.platform === "darwin") {
          const cpuKeys = [
            "HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU",
            "HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU"
          ];
          for (const key of cpuKeys) {
            if (!(key in out) && env[key] !== void 0) {
              out[key] = env[key];
            }
          }
        }
        return out;
      }
      async startDaemon(env) {
        const [cmd, ...baseArgs] = getEmbedCommand({
          embedVersion: this.embedVersion,
          embedPackagePath: this.embedPackagePath
        });
        const args = [
          ...baseArgs,
          "daemon",
          "--profile",
          this.profile,
          "start",
          ...this.extraDaemonStartArgs
        ];
        await this.runCommand(cmd, args, env, "daemon.start");
      }
      /**
       * Spawn `cmd` with `args`, pipe its output through the logger, and resolve
       * once it exits with code 0. Rejects on non-zero exit or spawn error.
       */
      async runCommand(cmd, args, env, label) {
        const child = spawn(cmd, args, { stdio: "pipe", env });
        let output = "";
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          output += text;
          for (const line of text.trimEnd().split("\n")) {
            if (line) this.logger.info(`[hindsight:${label}] ${line}`);
          }
        });
        child.stderr?.on("data", (data) => {
          const text = data.toString();
          output += text;
          for (const line of text.trimEnd().split("\n")) {
            if (line) this.logger.warn(`[hindsight:${label}] ${line}`);
          }
        });
        await new Promise((resolve2, reject) => {
          child.on("exit", (code) => {
            if (code === 0) {
              resolve2();
            } else {
              reject(new Error(`${label} failed with code ${code}: ${output.trim()}`));
            }
          });
          child.on("error", (err) => {
            reject(new Error(`${label} failed to spawn: ${err.message}`, { cause: err }));
          });
        });
      }
      /** Stream a spawned child's stdout/stderr through the logger without blocking. */
      pipeOutput(child, label) {
        child.stdout?.on("data", (data) => {
          for (const line of data.toString().trimEnd().split("\n")) {
            if (line) this.logger.info(`[hindsight:${label}] ${line}`);
          }
        });
        child.stderr?.on("data", (data) => {
          for (const line of data.toString().trimEnd().split("\n")) {
            if (line) this.logger.warn(`[hindsight:${label}] ${line}`);
          }
        });
      }
      /** Poll `/health` until it succeeds or `readyTimeoutMs` elapses. */
      async waitForReady() {
        const deadline = Date.now() + this.readyTimeoutMs;
        let attempt = 0;
        while (Date.now() < deadline) {
          attempt++;
          try {
            const res = await fetch(`${this.baseUrl}/health`, {
              signal: AbortSignal.timeout(this.readyPollIntervalMs)
            });
            if (res.ok) {
              this.logger.debug(`[hindsight] health check passed (attempt ${attempt})`);
              return;
            }
          } catch {
          }
          await new Promise((resolve2) => setTimeout(resolve2, this.readyPollIntervalMs));
        }
        throw new Error(
          `Hindsight daemon did not become ready within ${this.readyTimeoutMs}ms at ${this.baseUrl}`
        );
      }
    };
  }
});

// src/core/config.ts
import { readFileSync as readFileSync2 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join7 } from "path";

// src/core/seed.ts
import { spawn as realSpawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var DEFAULT_SEED_LIMIT = 300;

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
function setLogLevel(level) {
  if (!process.env.HINDSIGHT_LOG_LEVEL) current = level;
}
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

// src/core/daemon.ts
import { execFileSync, spawn as realSpawn2 } from "child_process";
import { dirname as dirname5, join as join8 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
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
function daemonEnv(cfg, env = process.env) {
  const out = {};
  if (cfg.daemonIdleTimeout !== void 0) {
    out.HINDSIGHT_EMBED_DAEMON_IDLE_TIMEOUT = String(cfg.daemonIdleTimeout);
  }
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("HINDSIGHT_API_") && value) out[key] = value;
  }
  const llm = detectLlm(env);
  if (llm) {
    out.HINDSIGHT_API_LLM_PROVIDER = llm.provider;
    if (llm.apiKey) out.HINDSIGHT_API_LLM_API_KEY = llm.apiKey;
  }
  return out;
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

// src/daemon-start.ts
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : void 0;
}
async function main() {
  const harness = arg("harness") ?? "coding-agent";
  const cfg = loadConfig({ harness });
  setLogLevel(cfg.logLevel);
  if (cfg.serverMode !== "daemon") return;
  if (await isServerHealthy(cfg.apiUrl)) return;
  if (!preflightDaemon(cfg, harness)) return;
  const { HindsightServer: HindsightServer2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
  const server = new HindsightServer2({
    profile: cfg.daemonProfile,
    port: cfg.apiPort,
    env: daemonEnv(cfg),
    embedVersion: cfg.embedVersion,
    embedPackagePath: cfg.embedPackagePath,
    logger: {
      debug: (m) => log.debug(harness, m),
      info: (m) => log.info(harness, m),
      warn: (m) => log.warn(harness, m),
      error: (m) => log.error(harness, m)
    }
  });
  await server.start();
  diag(harness, "daemon_started", { apiUrl: cfg.apiUrl, profile: cfg.daemonProfile });
}
main().catch((error) => {
  diag(arg("harness") ?? "coding-agent", "daemon_start_failed", { error: String(error) });
});
