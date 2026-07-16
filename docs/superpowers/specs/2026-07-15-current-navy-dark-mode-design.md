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

## Node treatment

Nodes use the same navy surface hierarchy rather than a bright white keyline. Their resting edge is a low-contrast blue-slate separator, their shadow creates the primary separation from the canvas, and their selected state uses a controlled Current-blue ring. Running and error states retain their semantic accents without reintroducing white inset highlights. Node footers and headers remain distinct through tonal layering, not borders.

## Verification

Targeted CSS, appearance-toggle, and node-style tests must pass. The local preview must report the dark appearance, navy page background, polished node surfaces without white keylines, and an available switch to light appearance.
