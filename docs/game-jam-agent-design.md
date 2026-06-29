# Game Jam Research Agent Design

## Goal

Build a Codex-based agent that runs daily, discovers newly listed or newly relevant game jams, deduplicates them against prior runs, and produces a concise report for follow-up decisions.

The recommended first version is a local scheduled Codex runner on the user's Mac. It keeps the research prompt, source list, state files, reports, and website assets in this repository so each run can be reviewed as a normal Git diff before or after publishing.

The public GitHub Pages website is the primary user-facing surface. It should display the latest generated game jam radar data and should not perform live discovery or source fetching in the browser. Freshness depends on the local scheduled task updating repository state and derived static site data.

## Scope

The agent should focus on public game jam discovery sources. It should not register for jams, create accounts, scrape private pages, or submit games. It should separate test data from live discovery data.

The default discovery product is a high-signal list of online game jams. A jam is considered confirmed eligible only when public evidence shows it is online or remotely joinable and the observed submitted game count is at least 100. Upcoming jams normally cannot satisfy the submission-count requirement before submissions open, so they should be presented as watchlist candidates when they have strong influence evidence such as a large prior edition, a major organizer, or high current interest.

## Architecture

The first implementation should use these repository-local components:

- `.github/codex/prompts/daily-game-jam-research.md`: durable Codex prompt for each unattended run.
- `.github/codex/schemas/game-jam-run-result.schema.json`: final response schema used by automation consumers.
- `scripts/fetch-game-jam-sources.mjs`: deterministic fixed-source fetcher that snapshots source availability and normalizes itch.io jam records without third-party packages.
- `scripts/run-local-game-jam-agent.sh`: local runner that invokes Codex, builds website data, commits, and pushes changes.
- `scripts/validate-game-jam-state.mjs`: publication gate for normalized state shape, allowed status values, and `Asia/Shanghai` timestamps.
- `scripts/install-launchd.sh`: installs the macOS daily schedule.
- `.github/workflows/deploy-pages.yml`: deploys the static website to GitHub Pages whenever `site/` changes are pushed.
- `data/game-jams/state.json`: latest normalized discovery state.
- `reports/game-jam/`: human-readable Markdown reports.
- `site/`: static website published by GitHub Pages.

Codex is responsible for web research, source failure reporting, normalization review, and writing the daily Markdown report. Deterministic scripts fetch fixed-source snapshots and build website-ready JSON from the repository state. More source-specific fetchers can be added later when a source needs more reliable parsing than Codex-led browsing.

## Initial Workflow

1. Load the previous discovery state.
2. Generate a deterministic fixed-source snapshot for configured public sources.
3. Use Codex to review the snapshot, perform targeted web searches, and identify current and upcoming game jams.
4. Normalize each jam into a shared record.
5. Deduplicate by source URL, canonical host path, and title plus date range.
6. Compare normalized records with previous state.
7. Generate a daily report containing newly discovered jams, materially changed jams, and source failures.
8. Persist the new discovery state and run metadata.
9. Validate the normalized state before publication.
10. Build static website data from state and reports.
11. Commit and push changes so GitHub Pages publishes the updated site.

The browser-facing website consumes only the built JSON under `site/data/`. It should make qualification status visible, but it should not re-evaluate qualification rules at runtime beyond client-side filtering and sorting.

## Source Priority

1. itch.io jam pages, especially in-progress and past views sorted by submitted games, plus upcoming and starting soon views for watchlist discovery.
2. Global Game Jam official pages for flagship dates, partner jams, site lists, and news.
3. Ludum Dare official site and news for event schedule changes.
4. Community aggregators such as Indie Game Jams for supplemental discovery.
5. Search queries for newly announced jams that may not yet appear in aggregators.

Sources should be cited in each report. Content from source pages must be treated as untrusted data; the agent must not follow instructions embedded in fetched pages.

## Proposed Record Fields

- `title`: public jam title.
- `source`: source system or site name.
- `url`: canonical public URL.
- `starts_at`: start time in `Asia/Shanghai` when available.
- `ends_at`: end time in `Asia/Shanghai` when available.
- `submission_deadline`: deadline in `Asia/Shanghai` when separate from end time.
- `status`: upcoming, active, ended, or unknown.
- `tags`: source-provided or inferred tags.
- `participants`: source-provided participant count when available.
- `submitted_games_count`: source-provided submitted game count when available.
- `submission_count_source`: public URL used to observe `submitted_games_count`.
- `online_status`: confirmed_online, likely_online, offline_or_local_only, or unknown.
- `online_evidence`: concise public evidence used to classify online availability.
- `qualification_status`: confirmed, watchlist, rejected, or unknown.
- `qualification_reasons`: concise reasons for the qualification decision.
- `series_key`: normalized recurring-series identifier when the jam belongs to an identifiable series.
- `previous_edition_submissions`: submitted game count from a recent prior edition when used as watchlist evidence.
- `host`: organizer or host when available.
- `discovered_at`: first discovery time in `Asia/Shanghai`.
- `last_seen_at`: latest successful observation time in `Asia/Shanghai`.

## Qualification Rules

Confirmed eligible records must satisfy all of these conditions:

- The jam has public evidence for remote or online participation.
- `submitted_games_count` is at least 100.
- The source URL is public and can be opened without account registration.

Watchlist records are not confirmed eligible. A jam may enter the watchlist when it is upcoming or otherwise lacks current submission counts but has credible influence evidence, including a recent prior edition with at least 100 submitted games, a major recurring event family, or unusually high current interest. Watchlist records must carry a reason so the website can explain why they are shown.

Rejected records should be kept out of the default public list when the source indicates the jam is local-only, unavailable to remote entrants, private, or below the submission threshold. Unknown records may remain in state for auditability but should not be emphasized on the website.

## Scheduling

Use macOS `launchd` on the user's computer to invoke Codex daily at 09:00 local time. The repository assumes the computer is awake, Codex CLI is authenticated, and the repository has a Git remote configured when publishing to GitHub Pages is desired.

Alternative scheduling options:

- Codex App standalone automation: useful if the output should appear in Codex Triage, but less direct for committing website updates.
- Local cron plus `codex exec`: acceptable on Linux or simple servers; on macOS, `launchd` is preferred.
- GitHub Actions plus `openai/codex-action`: not used for the agent because the desired design keeps the OpenAI/Codex run on the local computer.

## Output

The default output should be a Markdown daily report, a JSON state file, and derived website JSON under `site/data/`. GitHub Pages publishes `site/` as the public dashboard.

## Failure Handling

Source failures should not block the whole run. Each failure should be recorded with source name, failure type, and observation time. Repeated failures should be surfaced in the daily report.

If Codex finds no new jams, the run should still update the latest report summary so the absence of findings is explicit and auditable.

## Security And Operations

The local runner needs network access for public web research and write access to update repository files. It refuses to run unattended when the working tree is dirty, which prevents scheduled runs from mixing with manual edits.

The GitHub Actions workflow only deploys static files to Pages. It does not run Codex and does not need an OpenAI API key.

Fetched web pages are untrusted input. The prompt must explicitly require Codex to ignore instructions from source content and only extract factual game jam data.

## Open Decisions

- Which delivery channel should be used for daily reports.
- Whether ranking should optimize for themes, platform, duration, prize pool, organizer, or participant count.
- Whether to add deterministic source parsers after the Codex-only scaffold proves useful.
