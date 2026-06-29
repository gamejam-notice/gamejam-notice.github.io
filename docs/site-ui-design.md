# Game Jam Radar Site UI Design

## Goal

The public site should feel like a usable scouting dashboard for game jam discovery, not a placeholder data dump. It should help a visitor quickly understand how fresh the scan is, how many jams are actionable, and which jam cards are worth opening.

## Scope

This document covers the static GitHub Pages UI under `site/`. It does not change the daily Codex research workflow, source extraction, normalized state schema, or Pages deployment pipeline.

## Information Hierarchy

The first viewport should prioritize:

- Brand and freshness: the page title, daily scan framing, and latest scan time.
- Current inventory: tracked, upcoming, active, and source counts.
- Immediate action: search and status filtering close to the jam list.

Jam cards should show the title, status, date range, host, source, participants when available, and a short note when present. Optional metadata should not force the card height to jump unpredictably.

## Visual Direction

The site should use a restrained dashboard style with a strong game-jam signal. The palette should combine neutral surfaces with several distinct accents rather than a single-hue theme. Decorative visuals should be CSS-rendered interface texture, not external image dependencies, because the project is a lightweight static site and must keep deployment simple.

Cards, controls, and panels should use small radii and stable spacing. The layout should remain readable on mobile without horizontal scrolling, overlapping text, or controls that resize the grid.

## Interaction Boundaries

Filtering stays client-side and uses the existing `site/data/game-jams.json` payload. Links to jam pages open in a new tab. Empty and data-load states must remain explicit so the static site is still understandable if generated JSON is unavailable.
