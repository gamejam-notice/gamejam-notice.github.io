# Game Jam Research Agent Implementation

## Current Scaffold

The repository currently implements the first version as a scheduled Codex GitHub Action. It is designed to run daily, research public game jam sources, update repository-local state, and write Markdown reports.

## Files

- `.github/workflows/daily-game-jam-research.yml`: schedules the daily job at 09:00 `Asia/Shanghai` and commits report/state changes.
- `.github/codex/prompts/daily-game-jam-research.md`: durable instruction prompt for each unattended Codex run.
- `.github/codex/schemas/game-jam-run-result.schema.json`: JSON Schema for the final Codex response.
- `data/game-jams/state.json`: machine-readable normalized discovery state.
- `reports/game-jam/`: daily Markdown reports and the latest Codex final response.

## Runtime Requirements

- GitHub repository secret `OPENAI_API_KEY` must be configured before the scheduled workflow can run.
- The workflow uses `openai/codex-action@v1`.
- The workflow uses `danger-full-access` inside an isolated GitHub-hosted runner because the task requires network access for public web research.

## Run Flow

1. GitHub Actions checks out the repository.
2. `openai/codex-action@v1` runs the prompt in `.github/codex/prompts/daily-game-jam-research.md`.
3. Codex reads project documents, checks configured sources, performs targeted searches, updates `data/game-jams/state.json`, and writes `reports/game-jam/YYYY-MM-DD.md` plus `reports/game-jam/latest.md`.
4. The workflow commits changed state and reports back to the current branch.

## Current Limitations

- Source extraction is Codex-led rather than deterministic code-led.
- Indie Game Jams timeline extraction may require browser rendering or reverse-engineering the JavaScript data bundle.
- The first run will treat all discovered jams as new because the state file starts empty.

## Next Implementation Step

Run `Daily Game Jam Research` manually through GitHub Actions after configuring `OPENAI_API_KEY`. Review the generated report and state diff, then decide whether to add deterministic parsers for itch.io and official event pages.
