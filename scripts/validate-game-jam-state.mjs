#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.resolve(ROOT, process.argv[2] || "data/game-jams/state.json");
const allowedStatuses = new Set(["upcoming", "active", "ended", "unknown"]);
const requiredFields = [
  "title",
  "source",
  "url",
  "starts_at",
  "ends_at",
  "submission_deadline",
  "status",
  "tags",
  "participants",
  "host",
  "discovered_at",
  "last_seen_at",
];

function isBeijingIso(value) {
  return value == null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(value);
}

function fail(errors) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const state = JSON.parse(await readFile(statePath, "utf8"));
const errors = [];

if (state.schema_version == null) errors.push("state.schema_version is required");
if (!isBeijingIso(state.last_run_at)) {
  errors.push("state.last_run_at must be null or an Asia/Shanghai ISO string ending in +08:00");
}
if (!Array.isArray(state.jams)) {
  errors.push("state.jams must be an array");
} else {
  state.jams.forEach((jam, index) => {
    for (const field of requiredFields) {
      if (!(field in jam)) errors.push(`jams[${index}] ${jam.title || "<untitled>"} is missing ${field}`);
    }
    if (!allowedStatuses.has(jam.status)) {
      errors.push(
        `jams[${index}] ${jam.title || "<untitled>"} has invalid status ${JSON.stringify(jam.status)}`,
      );
    }
    for (const field of ["starts_at", "ends_at", "submission_deadline", "discovered_at", "last_seen_at"]) {
      if (!isBeijingIso(jam[field])) {
        errors.push(`jams[${index}] ${jam.title || "<untitled>"} has invalid ${field}: ${jam[field]}`);
      }
    }
    if (!Array.isArray(jam.tags)) errors.push(`jams[${index}] ${jam.title || "<untitled>"} tags must be an array`);
  });
}

if (errors.length) fail(errors);

console.log(`Validated ${path.relative(ROOT, statePath)} with ${state.jams.length} jams.`);
