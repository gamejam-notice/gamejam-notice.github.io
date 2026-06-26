#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR" reports/game-jam site/data

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree has uncommitted changes; refusing to run unattended." >&2
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git pull --ff-only origin "$(git branch --show-current)"
fi

node scripts/fetch-game-jam-sources.mjs

PROMPT="$(cat .github/codex/prompts/daily-game-jam-research.md)"
codex exec \
  --sandbox danger-full-access \
  --output-schema .github/codex/schemas/game-jam-run-result.schema.json \
  -o reports/game-jam/codex-final.json \
  "$PROMPT"

node scripts/validate-game-jam-state.mjs
node scripts/build-site.mjs

git add data/game-jams reports/game-jam site/data
if git diff --cached --quiet; then
  echo "No game jam updates to publish."
  exit 0
fi

RUN_DATE="$(TZ=Asia/Shanghai date +%F)"
git commit -m "docs: publish game jam updates ${RUN_DATE}"

if git remote get-url origin >/dev/null 2>&1; then
  git push origin "$(git branch --show-current)"
else
  echo "No origin remote configured; committed local update only."
fi
