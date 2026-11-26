# 0003: Three.js for a secret Third-person mode beside Kaplay

## Status

Accepted (2026-11-26). Revisits ADR 0001's rejection of Three.js for the optional Third-person mode only; Kaplay stays the engine of the 2D game, and ADR 0002's Overworld stands.

## Decision

Add Three.js as a second renderer for Third-person mode, a hidden desktop-only way to explore the Overworld in 3D. Three.js is loaded only through a dynamic `import()` when the mode is entered, so the 2D game's bundle and network requests don't change.

Third-person mode renders the same pure Overworld data (ADR 0002), not a second map. Anything the 3D world needs beyond the map (world coordinates, free-movement collision, later heights and landmark shapes) lives in a pure "third-person world" module without Three.js, keyed by tile kind or POI id, and is unit-tested like the Overworld module. The Three.js renderer implements the same contract as the 2D game, so the app shell chooses which one runs and the Viewfinder, Inventory, Fast-travel, audio and hint text stay shared.

## Why

- Kaplay can't render 3D, and a full 3D engine would be far more than a single optional mode needs.
- ADR 0001 rejected 3D as too costly and too heavy on phones for the whole site; as a lazy-loaded extra on desktop, visitors who never find it pay nothing.
- One map as the single source of truth means a map change appears in both modes without double work.
