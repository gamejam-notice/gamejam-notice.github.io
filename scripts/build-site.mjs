#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const statePath = path.join(root, "data/game-jams/state.json");
const reportsDir = path.join(root, "reports/game-jam");
const siteDataDir = path.join(root, "site/data");

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function listReports() {
  let entries = [];
  try {
    entries = await fs.readdir(reportsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const reports = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^\d{4}-\d{2}-\d{2}\.md$/.test(entry.name)) continue;
    const file = path.join(reportsDir, entry.name);
    const body = await fs.readFile(file, "utf8");
    const title = body.match(/^#\s+(.+)$/m)?.[1] ?? entry.name.replace(/\.md$/, "");
    const summary =
      body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .find((block) => block && !block.startsWith("#")) ?? "";

    reports.push({
      date: entry.name.replace(/\.md$/, ""),
      title,
      summary: summary.slice(0, 240),
      path: `../reports/game-jam/${entry.name}`,
    });
  }

  reports.sort((a, b) => b.date.localeCompare(a.date));
  return reports;
}

function normalizeState(state) {
  const jams = Array.isArray(state.jams) ? state.jams : [];
  return {
    schema_version: state.schema_version ?? 1,
    last_run_at: state.last_run_at ?? null,
    generated_at: new Date().toISOString(),
    totals: {
      jams: jams.length,
      upcoming: jams.filter((jam) => jam.status === "upcoming").length,
      active: jams.filter((jam) => jam.status === "active").length,
      sources: new Set(jams.map((jam) => jam.source).filter(Boolean)).size,
    },
    jams,
    run_history: Array.isArray(state.run_history) ? state.run_history.slice(-30) : [],
    source_failures: Array.isArray(state.source_failures) ? state.source_failures.slice(-30) : [],
  };
}

await fs.mkdir(siteDataDir, { recursive: true });
const state = normalizeState(await readJson(statePath, { schema_version: 1, jams: [] }));
const reports = await listReports();

await fs.writeFile(
  path.join(siteDataDir, "game-jams.json"),
  `${JSON.stringify(state, null, 2)}\n`,
);
await fs.writeFile(
  path.join(siteDataDir, "reports.json"),
  `${JSON.stringify({ reports }, null, 2)}\n`,
);

console.log(`Built site data with ${state.jams.length} jams and ${reports.length} reports.`);
