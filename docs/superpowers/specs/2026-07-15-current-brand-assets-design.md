# Current brand asset adoption

## Purpose

Replace the provisional, hand-drawn Current mark with the approved brand SVGs while keeping the desktop product legible in both appearances and preserving the existing accessible identity contract.

## Asset source

The approved source files are supplied at:

- `/Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-icon-color.svg`
- `/Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-icon-white.svg`
- `/Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-black.svg`
- `/Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-color.svg`
- `/Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-white.svg`

Canonical copies will live in `public/brand/` so the product has no dependency on a local design-drive path at runtime.

## Adaptive identity mapping

| Context | Light appearance | Dark appearance |
| --- | --- | --- |
| Compact product identity | Color icon | White icon |
| Full wordmark | Black logo | White logo |
| Launchpad and other spacious brand moments | Color logo | White logo |
| Browser and installed-app icon | Color icon | Color icon |

The existing `CurrentMark` component remains the single product identity entry point. It will render the supplied SVG variants and CSS will select the correct variant from the existing `data-appearance` attribute. This avoids client-only appearance branching and protects the existing hydration behavior.

## Surfaces in scope

- Command bar identity
- Launchpad identity
- Onboarding identity
- App icon at `src/app/icon.svg`
- Any remaining direct Current wordmark or inline Current-mark usage found by source search

## Interaction and accessibility

- Keep the existing accessible name of `Current` on the identity component.
- Treat decorative SVG images as hidden from assistive technology when the containing identity already supplies the name.
- Do not change navigation, command-bar controls, layout behavior, or onboarding interactions.

## Validation

- Add focused coverage that verifies the approved asset paths and adaptive variants are exposed by `CurrentMark`.
- Verify the app icon is the approved color asset.
- Run the focused identity tests, the existing workspace tests, and a production build.
- Inspect the light and dark product chrome visually after implementation.
