# Project Agent Guide

## Overview

This project designs and implements a local Codex-based daily research agent for discovering new game jams and publishing them to a GitHub Pages static website.

## Reading Order

1. `README.md` - repository purpose and high-level entry point.
2. `docs/game-jam-agent-design.md` - target behavior, boundaries, architecture, and scheduling plan.
3. `docs/game-jam-agent-impl.md` - current repository scaffold and automation entry points.
4. `docs/game-jam-research-notes.md` - source research, integration notes, and open questions.
5. `docs/site-ui-design.md` - public static site UI goals, information hierarchy, and interaction boundaries.

## Document Index

- `docs/game-jam-agent-design.md` - Defines the desired agent workflow, data model, scheduling strategy, and operational boundaries.
- `docs/game-jam-agent-impl.md` - Describes the current local scheduler, Codex prompt, static site, and Pages deployment scaffold.
- `docs/game-jam-research-notes.md` - Records reusable research about game jam discovery sources and source-specific constraints.
- `docs/site-ui-design.md` - Defines the GitHub Pages dashboard UI direction without changing the discovery pipeline.

## Current Status

The repository is being refined into a high-signal online game jam radar. The public website is the main display surface, while the local scheduled task owns daily discovery and static data updates. Confirmed eligible jams require online participation evidence and at least 100 submitted games; upcoming high-influence jams may appear as watchlist candidates until submission counts are available.

## Constraints

- Store durable engineering decisions in project documents rather than relying on chat context.
- Keep `AGENTS.md` concise and use it as an index, not a detailed case log.
- User-facing time values must be rendered in `Asia/Shanghai` time.
