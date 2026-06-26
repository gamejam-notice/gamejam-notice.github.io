const stateUrl = "./data/game-jams.json";
const reportsUrl = "./data/reports.json";

const els = {
  runMeta: document.querySelector("#run-meta"),
  total: document.querySelector("#metric-total"),
  upcoming: document.querySelector("#metric-upcoming"),
  active: document.querySelector("#metric-active"),
  sources: document.querySelector("#metric-sources"),
  grid: document.querySelector("#jam-grid"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#search"),
  status: document.querySelector("#status-filter"),
  reports: document.querySelector("#report-list"),
  sourcesList: document.querySelector("#source-list"),
};

const formatter = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

let jams = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatter.format(date);
}

function matchesFilter(jam) {
  const query = els.search.value.trim().toLowerCase();
  const status = els.status.value;
  const text = [jam.title, jam.host, jam.source, ...(jam.tags ?? [])].join(" ").toLowerCase();
  return (status === "all" || jam.status === status) && (!query || text.includes(query));
}

function renderJams() {
  const visible = jams.filter(matchesFilter);
  els.empty.hidden = visible.length > 0;
  els.grid.innerHTML = visible
    .map((jam) => {
      const tags = (jam.tags ?? []).slice(0, 4);
      return `
        <article class="jam-card">
          <div class="jam-card__top">
            <h3><a href="${escapeHtml(jam.url ?? "#")}" target="_blank" rel="noreferrer">${escapeHtml(jam.title ?? "Untitled jam")}</a></h3>
            <span class="status ${escapeHtml(jam.status ?? "unknown")}">${escapeHtml(jam.status ?? "unknown")}</span>
          </div>
          <dl class="meta-list">
            <div><dt>Starts</dt><dd>${escapeHtml(formatTime(jam.starts_at))}</dd></div>
            <div><dt>Ends</dt><dd>${escapeHtml(formatTime(jam.ends_at))}</dd></div>
            <div><dt>Host</dt><dd>${escapeHtml(jam.host ?? "Unknown")}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(jam.source ?? "Unknown")}</dd></div>
          </dl>
          <div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </article>
      `;
    })
    .join("");
}

function renderReports(reports) {
  if (!reports.length) {
    els.reports.innerHTML = `<p class="empty">No reports have been published yet.</p>`;
    return;
  }
  els.reports.innerHTML = reports
    .slice(0, 6)
    .map(
      (report) => `
        <article class="report-item">
          <a href="${escapeHtml(report.path)}">${escapeHtml(report.title)}</a>
          <p>${escapeHtml(report.summary || report.date)}</p>
        </article>
      `,
    )
    .join("");
}

function renderSourceNotes(state) {
  const failures = state.source_failures ?? [];
  if (!failures.length) {
    els.sourcesList.innerHTML = `
      <article class="source-item">
        <strong>No recent source failures</strong>
        <p>The latest state file does not record source errors.</p>
      </article>
    `;
    return;
  }
  els.sourcesList.innerHTML = failures
    .slice(-6)
    .reverse()
    .map(
      (failure) => `
        <article class="source-item">
          <strong>${escapeHtml(failure.source ?? "Unknown source")}</strong>
          <p>${escapeHtml(failure.failure_type ?? failure.message ?? "Source check failed")}</p>
        </article>
      `,
    )
    .join("");
}

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  } catch {
    return fallback;
  }
}

const [state, reportData] = await Promise.all([
  loadJson(stateUrl, { totals: {}, jams: [] }),
  loadJson(reportsUrl, { reports: [] }),
]);

jams = Array.isArray(state.jams) ? state.jams : [];
els.total.textContent = state.totals?.jams ?? jams.length;
els.upcoming.textContent = state.totals?.upcoming ?? jams.filter((jam) => jam.status === "upcoming").length;
els.active.textContent = state.totals?.active ?? jams.filter((jam) => jam.status === "active").length;
els.sources.textContent = state.totals?.sources ?? new Set(jams.map((jam) => jam.source).filter(Boolean)).size;
els.runMeta.textContent = state.last_run_at
  ? `Last scan: ${formatTime(state.last_run_at)}`
  : "Waiting for the first local Codex scan.";

renderJams();
renderReports(reportData.reports ?? []);
renderSourceNotes(state);

els.search.addEventListener("input", renderJams);
els.status.addEventListener("change", renderJams);
