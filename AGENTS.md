# Project Agent Guide

## Overview

This project designs and implements a Codex-based daily research agent for discovering new game jams and producing actionable summaries.

## Reading Order

1. `README.md` - repository purpose and high-level entry point.
2. `docs/game-jam-agent-design.md` - target behavior, boundaries, architecture, and scheduling plan.
3. `docs/game-jam-agent-impl.md` - current repository scaffold and automation entry points.
4. `docs/game-jam-research-notes.md` - source research, integration notes, and open questions.

## Document Index

- `docs/game-jam-agent-design.md` - Defines the desired agent workflow, data model, scheduling strategy, and operational boundaries.
- `docs/game-jam-agent-impl.md` - Describes the current GitHub Actions and Codex prompt scaffold.
- `docs/game-jam-research-notes.md` - Records reusable research about game jam discovery sources and source-specific constraints.

## Current Status

The repository has a first GitHub Actions plus Codex prompt scaffold for daily research. The next step is to run it manually, review the first generated report, and decide whether deterministic source parsers are needed.

## Constraints

- Store durable engineering decisions in project documents rather than relying on chat context.
- Keep `AGENTS.md` concise and use it as an index, not a detailed case log.
- User-facing time values must be rendered in `Asia/Shanghai` time.
