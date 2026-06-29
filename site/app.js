const stateUrl = "./data/game-jams.json";
const reportsUrl = "./data/reports.json";

const els = {
  runMeta: document.querySelector("#run-meta"),
  total: document.querySelector("#metric-total"),
  confirmed: document.querySelector("#metric-confirmed"),
  watchlist: document.querySelector("#metric-watchlist"),
  active: document.querySelector("#metric-active"),
  grid: document.querySelector("#jam-grid"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#search"),
  qualification: document.querySelector("#qualification-filter"),
  status: document.querySelector("#status-filter"),
  listMeta: document.querySelector("#list-meta"),
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

const statusRank = {
  active: 0,
  upcoming: 1,
  unknown: 2,
  ended: 3,
};

const qualificationRank = {
  confirmed: 0,
  watchlist: 1,
  unknown: 2,
  rejected: 3,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toClassName(value) {
  return String(value ?? "unknown").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "unknown";
}

function formatTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatter.format(date);
}

function getTimestamp(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
}

function summarizeJam(jam) {
  if (jam.notes) return jam.notes;
  if (jam.qualification_reasons?.length) return jam.qualification_reasons[0];
  if (jam.submission_deadline && jam.submission_deadline !== jam.ends_at) {
    return `Submission deadline: ${formatTime(jam.submission_deadline)}.`;
  }
  if (jam.participants) return `${jam.participants} participants tracked from ${jam.source ?? "the source"}.`;
  return "Open the source page for full theme, rules, and submission details.";
}

function matchesFilter(jam) {
  const query = els.search.value.trim().toLowerCase();
  const qualification = els.qualification.value;
  const status = els.status.value;
  const text = [
    jam.title,
    jam.host,
    jam.source,
    jam.notes,
    jam.status,
    jam.qualification_status,
    jam.online_status,
    jam.online_evidence,
    ...(jam.qualification_reasons ?? []),
    ...(jam.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  const matchesQualification =
    qualification === "all" ||
    jam.qualification_status === qualification ||
    (qualification === "public" && ["confirmed", "watchlist"].includes(jam.qualification_status));
  return matchesQualification && (status === "all" || jam.status === status) && (!query || text.includes(query));
}

function renderJams() {
  const visible = jams
    .filter(matchesFilter)
    .sort((a, b) => {
      const qualificationDelta =
        (qualificationRank[a.qualification_status] ?? 4) - (qualificationRank[b.qualification_status] ?? 4);
      if (qualificationDelta) return qualificationDelta;
      const submissionsDelta = (b.submitted_games_count || 0) - (a.submitted_games_count || 0);
      if (submissionsDelta) return submissionsDelta;
      const rankDelta = (statusRank[a.status] ?? 4) - (statusRank[b.status] ?? 4);
      if (rankDelta) return rankDelta;
      return getTimestamp(a.starts_at) - getTimestamp(b.starts_at);
    });
  els.empty.hidden = visible.length > 0;
  els.listMeta.textContent = `${visible.length} of ${jams.length} jams shown`;
  els.grid.innerHTML = visible
    .map((jam) => {
      const tags = (jam.tags ?? []).slice(0, 4);
      const url = jam.url ?? "#";
      const status = jam.status ?? "unknown";
      const qualification = jam.qualification_status ?? "unknown";
      const submissions =
        jam.submitted_games_count == null
          ? "Submissions unavailable"
          : `${jam.submitted_games_count.toLocaleString()} submissions`;
      const participants =
        jam.participants == null ? "Joined count unavailable" : `${jam.participants.toLocaleString()} joined`;
      const prior =
        jam.previous_edition_submissions == null
          ? ""
          : `<span class="tag evidence-tag">${escapeHtml(jam.previous_edition_submissions.toLocaleString())} prior submissions</span>`;
      return `
        <article class="jam-card">
          <div class="jam-card__top">
            <h3><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(jam.title ?? "Untitled jam")}</a></h3>
            <div class="badges">
              <span class="qualification ${escapeHtml(toClassName(qualification))}">${escapeHtml(qualification)}</span>
              <span class="status ${escapeHtml(toClassName(status))}">${escapeHtml(status)}</span>
            </div>
          </div>
          <p class="jam-summary">${escapeHtml(summarizeJam(jam))}</p>
          <dl class="meta-list">
            <div><dt>Starts</dt><dd>${escapeHtml(formatTime(jam.starts_at))}</dd></div>
            <div><dt>Ends</dt><dd>${escapeHtml(formatTime(jam.ends_at))}</dd></div>
            <div><dt>Submitted</dt><dd>${escapeHtml(submissions)}</dd></div>
            <div><dt>Online</dt><dd>${escapeHtml((jam.online_status ?? "unknown").replaceAll("_", " "))}</dd></div>
            <div><dt>Host</dt><dd>${escapeHtml(jam.host ?? "Unknown")}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(jam.source ?? "Unknown")}</dd></div>
          </dl>
          <div class="tags">
            ${jam.source ? `<span class="tag source-tag">${escapeHtml(jam.source)}</span>` : ""}
            ${prior}
            ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="jam-card__footer">
            <span class="participants">${escapeHtml(participants)}</span>
            <a class="open-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open jam</a>
          </div>
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
  } catch (error) {
    console.warn(`Failed to load ${url}`, error);
    return fallback;
  }
}

const [state, reportData] = await Promise.all([
  loadJson(stateUrl, null),
  loadJson(reportsUrl, { reports: [] }),
]);

if (state) {
  jams = Array.isArray(state.jams) ? state.jams : [];
  els.total.textContent =
    state.totals?.public_jams ?? jams.filter((jam) => ["confirmed", "watchlist"].includes(jam.qualification_status)).length;
  els.confirmed.textContent =
    state.totals?.confirmed ?? jams.filter((jam) => jam.qualification_status === "confirmed").length;
  els.watchlist.textContent =
    state.totals?.watchlist ?? jams.filter((jam) => jam.qualification_status === "watchlist").length;
  els.active.textContent = state.totals?.active ?? jams.filter((jam) => jam.status === "active").length;
  els.runMeta.textContent = state.last_run_at
    ? `Last scan: ${formatTime(state.last_run_at)}`
    : "Waiting for the first local Codex scan.";
} else {
  els.runMeta.textContent = "Latest data could not be loaded. Showing the last built summary.";
}

renderJams();
renderReports(reportData.reports ?? []);
renderSourceNotes(state ?? { source_failures: [] });

els.search.addEventListener("input", renderJams);
els.qualification.addEventListener("change", renderJams);
els.status.addEventListener("change", renderJams);
