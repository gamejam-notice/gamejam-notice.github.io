# Game Jam Research Agent Design

## Goal

Build a Codex-based agent that runs daily, discovers newly listed or newly relevant game jams, deduplicates them against prior runs, and produces a concise report for follow-up decisions.

The recommended first version is a local scheduled Codex runner on the user's Mac. It keeps the research prompt, source list, state files, reports, and website assets in this repository so each run can be reviewed as a normal Git diff before or after publishing.

## Scope

The agent should focus on public game jam discovery sources. It should not register for jams, create accounts, scrape private pages, or submit games. It should separate test data from live discovery data.

## Architecture

The first implementation should use these repository-local components:

- `.github/codex/prompts/daily-game-jam-research.md`: durable Codex prompt for each unattended run.
- `.github/codex/schemas/game-jam-run-result.schema.json`: final response schema used by automation consumers.
- `scripts/run-local-game-jam-agent.sh`: local runner that invokes Codex, builds website data, commits, and pushes changes.
- `scripts/install-launchd.sh`: installs the macOS daily schedule.
- `.github/workflows/deploy-pages.yml`: deploys the static website to GitHub Pages whenever `site/` changes are pushed.
- `data/game-jams/state.json`: latest normalized discovery state.
- `reports/game-jam/`: human-readable Markdown reports.
- `site/`: static website published by GitHub Pages.

Codex is responsible for web research, source failure reporting, normalization review, and writing the daily Markdown report. Deterministic scripts build website-ready JSON from the repository state. Deterministic source fetchers can be added later if a source needs more reliable parsing than Codex-led browsing.

## Initial Workflow

1. Load the previous discovery state.
2. Query configured public sources for current and upcoming game jams.
3. Normalize each jam into a shared record.
4. Deduplicate by source URL, canonical host path, and title plus date range.
5. Compare normalized records with previous state.
6. Generate a daily report containing newly discovered jams, materially changed jams, and source failures.
7. Persist the new discovery state and run metadata.
8. Build static website data from state and reports.
9. Commit and push changes so GitHub Pages publishes the updated site.

## Source Priority

1. itch.io jam pages, especially upcoming, starting soon, starting this week, starting this month, and in-progress views.
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
- `host`: organizer or host when available.
- `discovered_at`: first discovery time in `Asia/Shanghai`.
- `last_seen_at`: latest successful observation time in `Asia/Shanghai`.

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
