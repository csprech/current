# Current GitHub header

## Purpose

Give the repository landing page a professional, product-specific visual anchor without turning the README into a marketing site. The header should signal an infinite, node-based creative workspace before a reader reaches the first paragraph.

## Approved direction

**Infinite Canvas**: a wide, text-free dark-navy field with a restrained dotted canvas, a pair of flowing Current-blue and aqua arcs, and a few quiet translucent node surfaces. It is atmospheric rather than a literal product screenshot.

The supplied white Current wordmark, `public/brand/current-logo-white.svg`, is composited cleanly onto the header. No other text, slogan, watermark, platform badge, or third-party logo appears in the artwork.

## Composition

- Wide 3:1 landscape banner suitable for GitHub README presentation.
- Canvas depth uses the existing Current navy family: `#172130`, `#1d2a3b`, `#2f435b`, Current blue `#5578f6`, and aqua `#47cbb3`.
- The white Current wordmark sits in the left third with generous clear space. Connectors and node surfaces occupy the centre and right, so the identity remains legible at narrow repository-page widths.
- Background generation produces the texture and spatial lighting only; the approved vector wordmark is added afterward to preserve its exact geometry and color.

## Repository changes

- Add the final raster composition at `public/brand/current-github-header.png`.
- Add a centered responsive image at the top of `README.md` using that repository-local path and a concise `alt="Current"` label.
- Preserve every existing README section and setup instruction.

## Validation

- Confirm the generated header has a 3:1 landscape crop, legible white Current wordmark, no generated text, and no watermark.
- Confirm the image path resolves from GitHub Markdown and the README remains valid Markdown.
- Run the focused README/image checks and the existing production build before publishing.
