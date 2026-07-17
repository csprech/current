# Current Brand and Dark-Mode Contrast Correction

## Purpose

Correct three related presentation defects without changing workflow behavior:

1. Current identity surfaces must use only the approved white icon asset.
2. The Current wordmark must be black in light appearance and white in dark appearance.
3. Dark appearance must render a genuinely dark canvas and a clearly visible per-node Run action.

This correction continues the approved desktop-only Current direction: restrained creative-pro chrome, a Freeform-like canvas, Current navy centered on `#172130`, and semantic appearance tokens instead of isolated light or dark overrides.

## Approved Decisions

### Brand identity

`CurrentMark` remains the single product-identity component.

- Every compact icon uses `/brand/current-icon-white.svg`.
- The white icon keeps the approved cobalt tile contained in the supplied SVG, so it is legible in both appearances.
- Full identities use `/brand/current-logo-black.svg` in light appearance.
- Full identities use `/brand/current-logo-white.svg` in dark appearance.
- The color icon and color wordmark are removed from `CurrentMark` rather than rendered and hidden.
- Launchpad, onboarding, command-bar, and other `CurrentMark` consumers use this same mapping.
- The browser and installed-app icon use the same `current-icon-white` artwork rather than the color icon artwork.
- Accessible naming remains on the containing identity; decorative SVG variants remain hidden from assistive technology.

This identity mapping supersedes the color-icon and color-wordmark mapping in `2026-07-15-current-brand-assets-design.md`.

### Canvas appearance

The visible canvas is controlled by `--current-canvas` at every layer.

| Appearance | Canvas |
| --- | --- |
| Light | `#f2f4f7` |
| Dark | `#172130` |

The workspace shell and React Flow root must not depend on the fixed-light `bg-canvas-bg` utility. React Flow's own background custom property must resolve to `var(--current-canvas)` so library stylesheet order cannot make the graph transparent and expose a light shell underneath it. The dot pattern continues to use the adaptive Current border token.

Canvas navigation, panning, zooming, selection, connectors, minimap behavior, node placement, and keyboard shortcuts remain unchanged.

### Per-node Run action

The per-node Run control becomes the contextual primary action whenever node header controls are visible.

- Resting fill: `--current-action`.
- Foreground icon and label: `--current-action-foreground`.
- Hover fill: `--current-action-hover`.
- Keyboard focus: the shared two-layer `--current-focus` treatment.
- Executing or disabled state: still identifiable and readable, with interaction disabled.
- The play icon continues to inherit `currentColor` from the control.
- The existing compact-to-expanded hover behavior and `Run this node` accessible name remain intact.

The control uses the shared semantic Current action primitive rather than hardcoded neutral Tailwind utilities. This gives it the same contrast contract in light and dark appearances and keeps the contextual action visually distinct from comment, expand, and More controls.

## Component Boundaries

### `CurrentMark`

Owns asset selection and the accessible Current identity. Consumers decide only whether the wordmark is shown; they do not choose color variants.

### App icon

`src/app/icon.svg` mirrors the approved `current-icon-white` artwork so browser and installed-app identity follow the same icon rule as in-product surfaces.

### `WorkflowCanvas`

Owns the visible canvas shell and React Flow background contract. It binds both layers to the semantic canvas role while leaving graph behavior unchanged.

### `FloatingNodeHeader`

Owns the per-node Run action and applies the semantic primary-action class. Execution continues through the existing `onRunNode(id)` callback.

### Appearance tokens

`globals.css` remains the source of truth for light and dark values. Components consume semantic classes or variables and do not branch on appearance in React.

## State and Data Flow

1. `AppearanceToggle` sets `data-appearance` on the document root.
2. The root selects the light or dark semantic token values.
3. `CurrentMark`, the workspace shell, React Flow, and the node Run action resolve their presentation from those tokens.
4. Clicking Run still calls the existing node execution callback with the same node identifier.

No new application state, context provider, persistence key, or React Flow theme state is introduced.

## Error and Edge Cases

- Before client appearance initialization, the existing default appearance behavior remains unchanged.
- The white icon must always retain a dark tile or equivalent dark identity surface; it must never be placed directly on the light canvas.
- Hiding the wordmark must not leave duplicate or preload-only brand images in the identity component.
- A disabled Run action must not be mistaken for an enabled action, but its label and icon remain perceivable.
- The React Flow background remains dark even if the library's stylesheet is evaluated after application CSS.

## Test-First Verification

Add failing regression coverage before production changes:

1. `CurrentMark` renders only the white icon and the black and white wordmarks; it does not render color logo variants.
2. The app icon matches the approved `current-icon-white` artwork rather than the color icon.
3. Light appearance exposes the black wordmark and dark appearance exposes the white wordmark.
4. The canvas shell no longer carries `bg-canvas-bg` and is bound to the semantic canvas role.
5. React Flow receives the semantic background custom property so a transparent library layer cannot reveal a light canvas.
6. The per-node Run button uses the semantic primary-action treatment and retains its accessible name and callback.
7. Existing appearance-contract tests continue to prove the primary action meets the normal-text contrast target in both appearances.

After focused tests pass, run the complete Vitest suite, production build, and `git diff --check`.

## Visual Acceptance

Inspect both appearances at desktop size:

- Launchpad, command bar, and browser/app identity show the approved white icon on its cobalt tile.
- Light appearance uses the black Current wordmark; dark appearance uses the white wordmark.
- Light canvas remains cool silver and dark canvas is visibly `#172130`, including areas between nodes and behind the dot pattern.
- The per-node Run control has a solid cobalt fill and readable white play icon and label in both appearances.
- Hover, keyboard focus, executing, and disabled treatments remain distinct.
- No node, connector, canvas, brand, or workflow functionality changes.
