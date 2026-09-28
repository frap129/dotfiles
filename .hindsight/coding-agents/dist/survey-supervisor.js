#!/usr/bin/env node

// src/core/survey-lease.ts
import { spawn as realSpawn } from "child_process";
import { randomUUID } from "crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync
} from "fs";
import { join } from "path";
var LEASE_HEARTBEAT_MS = 5e3;
var SURVEY_SPEC_ENV = "HINDSIGHT_SURVEY_SPEC";
function releaseLease(lease) {
  try {
    unlinkSync(join(lease.directory, lease.owner));
  } catch {
    return;
  }
  try {
    rmdirSync(lease.directory);
  } catch {
  }
}
function heartbeatLease(lease) {
  try {
    const now = /* @__PURE__ */ new Date();
    utimesSync(join(lease.directory, lease.owner), now, now);
    return true;
  } catch (error) {
    return error.code !== "ENOENT";
  }
}
function superviseSurvey(spec2, spawnFn = realSpawn) {
  let stop = () => {
  };
  const done = new Promise((resolve) => {
    if (!heartbeatLease(spec2.lease)) return resolve();
    let child;
    try {
      child = spawnFn(spec2.bin, spec2.args, { stdio: "ignore", windowsHide: true });
    } catch {
      releaseLease(spec2.lease);
      return resolve();
    }
    let finished = false;
    const finish = (release) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      if (release) releaseLease(spec2.lease);
      resolve();
    };
    const timer = setInterval(() => {
      if (heartbeatLease(spec2.lease)) return;
      child.kill();
      finish(false);
    }, spec2.heartbeatMs ?? LEASE_HEARTBEAT_MS);
    child.on("error", () => finish(true));
    child.once("exit", () => finish(true));
    stop = () => {
      child.kill();
      finish(true);
    };
  });
  return { done, stop: () => stop() };
}

// src/survey-supervisor.ts
var spec = JSON.parse(process.env[SURVEY_SPEC_ENV] ?? "");
delete process.env[SURVEY_SPEC_ENV];
var run = superviseSurvey(spec);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.once(signal, run.stop);
void run.done;
