# Project Agent Guide

## Overview

This project designs and implements a local Codex-based daily research agent for discovering new game jams and publishing them to a GitHub Pages static website.

## Reading Order

1. `README.md` - repository purpose and high-level entry point.
2. `docs/game-jam-agent-design.md` - target behavior, boundaries, architecture, and scheduling plan.
3. `docs/game-jam-agent-impl.md` - current repository scaffold and automation entry points.
4. `docs/game-jam-research-notes.md` - source research, integration notes, and open questions.

## Document Index

- `docs/game-jam-agent-design.md` - Defines the desired agent workflow, data model, scheduling strategy, and operational boundaries.
- `docs/game-jam-agent-impl.md` - Describes the current local scheduler, Codex prompt, static site, and Pages deployment scaffold.
- `docs/game-jam-research-notes.md` - Records reusable research about game jam discovery sources and source-specific constraints.

## Current Status

The repository has a first local `launchd` plus Codex prompt scaffold and a GitHub Pages static site. The production repository is public at `gamejam-notice/gamejam-notice.github.io`, and `https://gamejam-notice.github.io/` is deployed from the `site/` directory through GitHub Actions. The next step is to run the local agent once, review the generated site data, then install the daily schedule.

## Constraints

- Store durable engineering decisions in project documents rather than relying on chat context.
- Keep `AGENTS.md` concise and use it as an index, not a detailed case log.
- User-facing time values must be rendered in `Asia/Shanghai` time.
