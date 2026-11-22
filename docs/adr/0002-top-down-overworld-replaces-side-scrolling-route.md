# 0002: Top-down Overworld replaces the side-scrolling Route

## Status

Accepted (2026-11-22). Supersedes the side-scroller reasoning in [ADR 0001](0001-vite-typescript-kaplay-github-pages.md); its Kaplay, Vite + TypeScript and GitHub Pages decisions stand.

## Decision

Replace the single linear left-to-right Route with a top-down (3/4 view) Overworld on a 16px tile grid. The Player spawns in the Hub (Munich), and every other Zone is reached along a short path out of the Hub: Photography trail north, Career road east, Maker workshop west, Sport and Music & games south via a fork, and Contact as a mailbox inside the Hub. The Player moves tile by tile in 4 directions and photographs a Point of Interest by facing it and pressing the Shutter.

The map is a readable text tilemap in a pure Overworld module (no Kaplay), with Zones declared as tile rectangles. Kaplay, Vite + TypeScript, the Plain view and static hosting on GitHub Pages are unchanged.

## Why

- A linear Route forced visitors past every earlier Zone to reach a later one; a Hub with spokes lets them explore in whichever direction interests them.
- Kaplay handles a tile-grid top-down game as easily as a side-scroller, so no engine change is needed.
- A text tilemap in code keeps the map editable in a normal diff, and a pure module lets unit tests check that every Point of Interest and Film roll is reachable from the spawn.
- The work lands on an `overworld` branch and merges to `main` only when the Overworld fully replaces the side-scroller, so visitors never see a half-built world.
