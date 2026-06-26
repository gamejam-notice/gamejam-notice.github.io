# Game Jam Research Agent Implementation

## Current Scaffold

The repository currently implements the first version as a local scheduled Codex runner plus a GitHub Pages static website. The local runner researches public game jam sources, updates repository-local state, builds website data, commits the changes, and pushes them. GitHub Pages deploys the static site from the `site/` directory after those changes reach GitHub.

## Files

- `scripts/run-local-game-jam-agent.sh`: invokes Codex, builds website data, commits changed data/reports/site output, and pushes to `origin`.
- `scripts/install-launchd.sh`: installs the macOS user-level daily schedule at 09:00 local time.
- `scripts/uninstall-launchd.sh`: removes the macOS scheduled job.
- `scripts/build-site.mjs`: converts repository state and reports into website-ready JSON.
- `.github/codex/prompts/daily-game-jam-research.md`: durable instruction prompt for each unattended Codex run.
- `.github/codex/schemas/game-jam-run-result.schema.json`: JSON Schema for the final Codex response.
- `.github/workflows/deploy-pages.yml`: deploys `site/` to GitHub Pages after site changes are pushed.
- `data/game-jams/state.json`: machine-readable normalized discovery state.
- `reports/game-jam/`: daily Markdown reports and the latest Codex final response.
- `site/`: static website source and derived data used by GitHub Pages.

## Runtime Requirements

- Codex CLI must be installed and authenticated on the local Mac.
- The local repository should use `https://github.com/gamejam-notice/gamejam-notice.github.io.git` as `origin` if updates should publish to the production GitHub Pages site.
- The computer must be awake at the scheduled time for `launchd` to run the agent.
- GitHub Pages must remain enabled with GitHub Actions as the Pages source.

## Deployment Target

The production repository is `gamejam-notice/gamejam-notice.github.io`. It is public, uses `main` as the default branch, and publishes `https://gamejam-notice.github.io/` through the `Deploy GitHub Pages` workflow. GitHub Pages is configured with `build_type=workflow`, so the live site comes from the uploaded `site/` artifact rather than GitHub's legacy root-directory Pages build.

## Run Flow

1. `launchd` invokes `scripts/run-local-game-jam-agent.sh` every day at 09:00 local time.
2. The runner refuses to continue if the working tree has uncommitted changes.
3. The runner pulls the current branch from `origin` when a remote exists.
4. Codex reads project documents, checks configured sources, performs targeted searches, updates `data/game-jams/state.json`, and writes `reports/game-jam/YYYY-MM-DD.md` plus `reports/game-jam/latest.md`.
5. `scripts/build-site.mjs` writes `site/data/game-jams.json` and `site/data/reports.json`.
6. The runner commits changed data, reports, and website data, then pushes to `origin`.
7. GitHub Actions deploys `site/` to GitHub Pages.

## Current Limitations

- Source extraction is Codex-led rather than deterministic code-led.
- Indie Game Jams timeline extraction may require browser rendering or reverse-engineering the JavaScript data bundle.
- The first run will treat all discovered jams as new because the state file starts empty.
- The static website shows an empty state until the first local agent run writes real jam records.
- GitHub Actions currently emits a Node.js 20 deprecation warning for upstream Pages actions, but the workflow succeeds and GitHub runs the affected actions on Node.js 24.

## Next Implementation Step

Run `scripts/run-local-game-jam-agent.sh` manually once from a clean working tree. Review the generated report, `data/game-jams/state.json`, and the published website data. If the output looks useful, run `scripts/install-launchd.sh` to schedule the daily job.
