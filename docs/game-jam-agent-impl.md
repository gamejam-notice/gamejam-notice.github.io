# Game Jam Research Agent Implementation

## Current Scaffold

The repository currently implements the first version as a local scheduled Codex runner plus a GitHub Pages static website. The local runner researches public game jam sources, updates repository-local state, builds website data, commits the changes, and pushes them. GitHub Pages deploys the static site from the `site/` directory after those changes reach GitHub. The first populated run on 2026-06-26 wrote 160 tracked jam records.

## Files

- `scripts/run-local-game-jam-agent.sh`: invokes Codex, builds website data, commits changed data/reports/site output, and pushes to `origin`.
- `scripts/fetch-game-jam-sources.mjs`: fetches fixed source pages, records source availability, and normalizes itch.io jam cards into `reports/game-jam/source-snapshot.json`.
- `scripts/install-launchd.sh`: installs the macOS user-level daily schedule at 09:00 local time.
- `scripts/uninstall-launchd.sh`: removes the macOS scheduled job.
- `scripts/validate-game-jam-state.mjs`: validates normalized state shape, status values, and `Asia/Shanghai` timestamps before site data is built.
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
4. `scripts/fetch-game-jam-sources.mjs` writes `reports/game-jam/source-snapshot.json` with fixed-source fetch status and normalized itch.io records.
5. Codex reads project documents and the source snapshot, performs targeted searches, updates `data/game-jams/state.json`, and writes `reports/game-jam/YYYY-MM-DD.md` plus `reports/game-jam/latest.md`.
6. `scripts/validate-game-jam-state.mjs` rejects malformed state before publication.
7. `scripts/build-site.mjs` writes `site/data/game-jams.json` and `site/data/reports.json`.
8. The runner commits changed data, reports, and website data, then pushes to `origin`.
9. GitHub Actions deploys `site/` to GitHub Pages.

## Current Limitations

- Fixed-source extraction has deterministic itch.io support, while Global Game Jam, Ludum Dare, and Indie Game Jams snapshots currently store generic page summaries rather than full normalized jam records.
- Indie Game Jams timeline extraction may require browser rendering or reverse-engineering the JavaScript data bundle.
- The first run will treat all discovered jams as new because the state file starts empty.
- The static website shows an empty state until the first local agent run writes real jam records.
- GitHub Actions currently emits a Node.js 20 deprecation warning for upstream Pages actions, but the workflow succeeds and GitHub runs the affected actions on Node.js 24.

## Next Implementation Step

Install the daily schedule with `scripts/install-launchd.sh` after confirming the published site and first report remain useful. The schedule runs `scripts/run-local-game-jam-agent.sh` at 09:00 local time on this Mac.
