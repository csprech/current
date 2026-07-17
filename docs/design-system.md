# Current design system

The single source of truth for Current's visual decisions. Derived from the
photography-first commerce system in the supplied `DESIGN.md` teardown
(editorial display type over a dense, neutral, near-monochrome chrome), adapted
for a desktop node-workflow tool with a first-class dark mode.

Implementation lives in `src/app/globals.css` (design tokens + component
chrome) and `src/components/nodes/nodePresentation.ts` (category accents for
node types). Contract tests in `src/app/appearance-contract.test.ts`,
`src/app/globals.test.ts`, and `src/components/nodes/__tests__/` enforce the
rules below.

## Principles

1. **The work is the color.** Chrome is pure ink, pure canvas, one soft gray,
   and hairline dividers. Every chromatic moment is reserved for the user's
   media, data-type signals, or status — never decorative chrome.
2. **Two shapes only.** Interactive controls are pills (`--current-radius-pill`)
   or circles; containers (cards, panels, sheets, menus, nodes) are flat with
   zero radius (`--current-radius-container`). Single-line inputs use the soft
   field radius (`--current-radius-field`).
3. **No drop shadows.** Depth comes from 1px hairlines and the inset bottom
   line under sticky chrome (`box-shadow: inset 0 -1px 0 var(--current-divider)`),
   never from elevation blur. Overlays use opaque surfaces, not frosted glass.
4. **Extreme typographic contrast.** One towering uppercase display tier for
   hero moments (launchpad headline, Outputs title), a quiet 11–16px UI tier
   for everything else. Weights are 400/500/700 only.
5. **One ink block per viewport.** A single primary (ink) pill or tile per
   fold; everything else neutralizes to soft-cloud or outline treatments.

## Typography

| Tier | Stack | Treatment |
| --- | --- | --- |
| Display | `--font-display` → "Helvetica Now Display", Helvetica Neue, Helvetica, Arial | 500 weight, uppercase, line-height 0.9, letter-spacing 0 |
| UI / body | `--font-text` → "Helvetica Now Text", Helvetica Neue, Helvetica, Arial | 400/500, letter-spacing 0 (micro-labels keep small tracking for legibility) |

The source system's Nike Futura ND display face is **deliberately excluded**
(licensing + brand distance); Helvetica Now Display carries the display tier
instead. The stacks fall back to Helvetica Neue/Helvetica/Arial until the
licensed Helvetica Now webfonts are added (drop `@font-face` rules in
`globals.css` when available — no other changes needed).

## Color tokens

Semantic tokens are defined twice: `:root` (light) and
`:root[data-appearance="dark"]`. Components must reference tokens, never raw
hexes.

### Chrome (light → dark)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--current-canvas` | `#ffffff` | `#111111` | Page + workflow canvas |
| `--current-surface-chrome` | `#ffffff` | `#111111` | Command bar |
| `--current-surface-panel` | `#ffffff` | `#161617` | Panels, node footers |
| `--current-surface-elevated` | `#ffffff` | `#1b1b1d` | Cards, sheets, menus, nodes |
| `--current-surface-control` | `#f5f5f5` | `#242426` | Soft-cloud control fills |
| `--current-surface-control-hover` | `#e5e5e5` | `#2e2e30` | Control hover |
| `--current-border` | `#cacacb` | `#39393b` | Hairline |
| `--current-divider` | `#e5e5e5` | `#2e2e30` | Soft hairline / inset line |
| `--current-border-strong` | `#707072` | `#9e9ea0` | Emphasized boundaries (≥3:1) |
| `--current-text-primary` | `#111111` | `#ffffff` | Ink |
| `--current-text-secondary` | `#4b4b4d` | `#cacacb` | Ash |
| `--current-text-tertiary` | `#707072` | `#9e9ea0` | Mute / stone |
| `--current-action` | `#111111` | `#ffffff` | The pill — ink in light, inverted white in dark |
| `--current-action-foreground` | `#ffffff` | `#111111` | Text on the pill |
| `--current-focus-outer` | `#111111` | `#ffffff` | Focus ring (2px inner halo + 2px ring) |

### Status (signal, never chrome)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--current-status-danger` | `#d30005` | `#ff5c5f` | Errors, destructive actions |
| `--current-status-success` | `#007d48` | `#1eaa52` | Completion, confirmation |
| `--current-status-info` | `#1151ff` | `#7aa2ff` | Informational accent, selection |
| `--current-status-warning` | `#9a5b00` | `#e8a13d` | Workflow warnings¹ |

¹ The source system has no warning color; this amber is an addition for
workflow status semantics, used only in status surfaces (toasts, notices,
indicators) — never chrome.

### Category accents (data-type signals)

Typed connections, handle dots, and minimap markers carry restrained category
tints — the system's "swatch dot" role. Solid colors only; the old video
gradient is gone.

| Type | Token | Light | Dark |
| --- | --- | --- | --- |
| Image | `--current-aqua` | `#0a7281` (teal) | `#2fb4c6` |
| Text | `--current-blue` | `#1151ff` (info) | `#7aa2ff` |
| Video | `--current-blue-indigo` | `#6d4fd4` (purple) | `#b197fc` |
| Audio | `--current-pink` | `#c9127e` (pink) | `#ff8fcf` |
| 3D | `--current-aqua-cyan` | `#0e8a9c` (cyan) | `#4cc3d0` |
| Ease curve | `--current-steel-blue` | `#0034e3` (info deep) | `#91a7ff` |

Labels always accompany handle colors — color is never the only signal.

## Neutral ramp

Tailwind's `neutral` scale is remapped per appearance so utility-classed
markup (`bg-neutral-800`, `text-neutral-100`) follows the system automatically.
Light run: 100 `#111111` → 950 `#ffffff`; dark run inverts it
(100 `#ffffff` → 950 `#111111`). The `blue` scale maps to the info-accent
family.

## Shape and spacing

- `--current-radius-pill: 999px` — every button, chip, icon control, kbd,
  segmented control.
- `--current-radius-field: 0.75rem` — single-line inputs, selects, search.
- `--current-radius-container: 0px` — cards, sheets, panels, menus, nodes,
  media thumbnails.
- Spacing stays on the 8px base grid (2/4/8/12/18/24/30/48).
- Media (node previews, thumbnails, output cards) is full-bleed at zero
  radius — the photograph is the card, staged on soft-cloud.

## Accessibility

Enforced by `appearance-contract.test.ts` in both appearances:

- Body text ≥ 4.5:1 against its surface (primary, secondary on panel;
  tertiary on canvas).
- Pill text ≥ 4.5:1; media-overlay text ≥ 7:1.
- Focus rings and strong borders ≥ 3:1.
- All status and category accents were chosen ≥ 4.5:1 against their
  appearance's panel surface.
- Focus is a two-layer halo (`--current-focus`), distinct from node selection
  (info-blue ring).
- `prefers-reduced-motion` disables all nonessential motion, including node
  breathing and connector pulses.
- Interactive chrome targets ≥ 36–48px; canvas-internal micro-controls keep
  ≥ 30px effective hit areas (handles have an invisible 30px hit zone).

## Do / Don't

- **Do** keep `--current-action` scarce — one ink (or inverted white) pill per
  view; secondary actions use soft-cloud pills.
- **Do** stage node media full-bleed on `--current-surface-control`.
- **Don't** add drop shadows, gradients, or frosted blur to chrome.
- **Don't** use status colors or category accents as backgrounds for chrome.
- **Don't** introduce new radii, new font weights, or a third button shape.
- **Don't** hardcode hexes in components — use the semantic tokens; the
  contract tests will flag drift.
