# Current navy dark mode

## Goal

Make the desktop dark appearance feel native to Current by replacing neutral graphite surfaces with a restrained dark-blue system, while preserving readable controls, node actions, and workflow connections.

## Palette hierarchy

- Canvas base: `#172130`
- Elevated workspace and command bar: `#1D2A3B`
- Controls and node action surfaces: `#26384E`
- Hover and selected controls: `#344B66`
- Grid and borders: blue-slate with low-opacity white contrast
- Text: near-white, with Current blue retained for primary interactive states

## Scope

Update only the dark appearance variables and dark-specific overrides in `src/app/globals.css`. Light appearance remains unchanged. The appearance toggle continues to default to dark and preserves an explicitly selected light appearance.

## Verification

Targeted CSS and appearance-toggle tests must pass. The local preview must report the dark appearance, navy page background, and an available switch to light appearance.
