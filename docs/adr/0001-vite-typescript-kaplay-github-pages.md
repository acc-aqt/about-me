# 0001: Vite + TypeScript + Kaplay, static on GitHub Pages

## Status

Accepted (2026-11-21)

## Decision

Build the game layer with Kaplay (lightweight 2D game library) on Vite + TypeScript. Build the Plain view as plain HTML/CSS from the same Content file. Ship as a static site to GitHub Pages from `acc-aqt/about-me`; a custom domain (e.g. `about.carrels.photography`) may follow later.

## Why

- A 2D side-scroller doesn't need a full engine; Kaplay is small and quick to iterate with.
- Phaser was the heavier alternative; Three.js/3D was rejected as too costly to build and too heavy on phones.
- No backend is needed: all content is static, so free static hosting is enough.
