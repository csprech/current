# Current Adaptive Appearance Refinement

## Purpose

Refine Current as a complete desktop product system so light and dark appearances are equally intentional, readable, and functional. The work must preserve every established workflow while making the command bar, canvas, nodes, inspector, menus, dialogs, onboarding, Templates, Outputs, and supporting utility surfaces feel authored as one product.

Current should feel at home beside high-end native creative applications: calm hierarchy, compact professional controls, precise state feedback, platform-aware typography, and restrained motion. The design should reference macOS interaction discipline without copying protected Apple assets or simulating decorative operating-system chrome.

## Approved direction

Use a fully adaptive, token-led appearance system.

Every product surface—including the inspector, nodes, popovers, sheets, native controls, embedded quickstart pages, and focus workspaces—adapts between light and dark appearance. Dark remains the default when no preference has been stored. The user's explicit appearance choice persists.

The implementation must extend the existing Current direction rather than replace it:

- Desktop only.
- Final Cut Pro-level utility and Freeform-like canvas calm.
- Current navy centered on `#172130`.
- Current blue `#5578f6` as the signature identity, selection, and connection color.
- Current aqua `#47cbb3` for typed image connections, focus emphasis, and narrowly scoped functional feedback.
- Supplied Current logos and icons remain the only brand identity assets.

## Architecture

### Semantic appearance roles

Components must consume semantic roles rather than hardcoded light or dark colors. The role system covers:

- Page and canvas background.
- Application chrome.
- Primary panel surface.
- Elevated and transient surfaces.
- Resting, hovered, pressed, selected, and disabled controls.
- Primary, secondary, and tertiary text.
- Dividers and non-text boundaries.
- Brand, action, focus, selection, success, warning, danger, and typed-connection colors.
- Appearance-aware shadows and translucent materials.

Legacy Tailwind neutral utilities may remain where necessary, but their values must resolve through the same appearance contract. New one-off hex values are not permitted when a semantic role already exists.

### Approved palette anchors

| Role | Light appearance | Dark appearance |
| --- | --- | --- |
| Canvas | `#f2f4f7` | `#172130` |
| Chrome | translucent `#ffffff` | `#1d2a3b` |
| Panel | `#f7f8fa` | `#213147` |
| Elevated surface | `#ffffff` | `#26384e` |
| Resting control | `#eef1f5` | `#2b3f57` |
| Hovered control | `#e5eaf1` | `#344b66` |
| Divider | `#d8dee7` | `#3a516c` |
| Primary text | `#1d2430` | `#f5f5f7` |
| Secondary text | `#566274` | `#b6c2d2` |
| Tertiary text | `#616e80` | `#93a4b9` |
| Action fill | `#4164d9` | `#4164d9` |
| Brand/selection | `#5578f6` | `#5578f6` |
| Dark accent text | not required | `#6f8cff` |
| Typed image/focus accent | `#47cbb3` | `#47cbb3` |

The brighter brand blue is not used as normal-size text on white or as a filled button with white text. The deeper action blue provides a 5.19:1 white-text contrast ratio. Brand blue remains available for identity, selection keylines, connectors, non-text indicators, and larger display treatments.

### Contrast targets

- Normal text: at least 4.5:1 against its rendered surface.
- Large text, essential icons, focus indicators, control boundaries, and meaningful graphical states: at least 3:1 against adjacent colors.
- Hover, active, selected, and focus states increase contrast relative to rest.
- Disabled state may reduce emphasis but must remain identifiable and must never be the only way an error or requirement is communicated.
- Translucent surfaces are evaluated against their actual composited backgrounds, not their declared alpha color in isolation.

### Typography and metrics

Use the Apple system font stack already available through the operating system. Do not bundle or imitate proprietary font files. Use:

- Medium and semibold weights for compact hierarchy.
- Tight tracking only for large display titles.
- Positive tracking for compact eyebrow labels where they remain useful.
- Tabular figures for changing counts, costs, dimensions, percentages, and timestamps.
- Balanced wrapping for launchpad and empty-state headlines.
- Consistent compact desktop control heights and optical icon alignment.

## Core workspace

### Command bar

The command bar is continuous application chrome.

- Light appearance uses a softly translucent white surface with a cool divider and tinted shadow.
- Dark appearance uses elevated navy with a navy-tinted shadow.
- Active workspace views combine a tonal filled background, readable foreground, and pressed state; color alone is insufficient.
- Icon-only controls have accessible labels, tooltips, hover, pressed, focus, and disabled states.
- The Run control uses the accessible action fill and white foreground in both appearances.
- Project title, save status, view selection, appearance control, API-key access, Outputs, and run actions keep their existing functionality and layout responsibilities.

### Canvas, controls, and navigator

- Light canvas uses cool silver with low-contrast blue-gray dots.
- Dark canvas uses `#172130` with slightly brighter navy dots.
- Resting connections remain visible. Hovered, selected, or focus-related connections gain opacity and emphasis.
- Typed connections continue to use the approved Current cool-color family.
- Navigator and zoom controls use the same elevated-surface and interaction-state tokens as the command bar.
- Canvas selection, connection previews, grouping, panning, zooming, and keyboard shortcuts remain unchanged.
- The minimap viewport, node marks, and canvas background remain readable in both appearances without a bright white field or keyline.

### Nodes

All node families share a consistent anatomy:

1. Identity and type header.
2. Working content.
3. Status/output footer.

Node presentation rules:

- Resting borders are tonal rather than white.
- Selection uses a precise Current-blue keyline and restrained outer bloom.
- Hover increases separation without changing the node's semantic state.
- Running, warning, and error states change the keyline, icon, and status message rather than recoloring the entire node.
- Node titles, metadata, dimensions, filenames, provider labels, and state copy meet their contrast target.
- Media actions use adaptive raised controls and remain legible over both light and dark media.
- The non-interactive node body, header drag region, and status footer may drag the node.
- Inputs, text areas, sliders, media controls, menus, buttons, and connectors remain protected from accidental dragging.
- The image footer shows the file name as the primary label when available and preserves square lower image corners where the footer attaches.

### Inspector

The inspector fully adapts rather than remaining permanently dark.

- Light appearance uses a cool utility panel separated from the canvas by tone, spacing, and a restrained edge.
- Dark appearance uses layered Current navy, not neutral charcoal.
- Section hierarchy comes from spacing, label weight, and grouping before divider lines.
- Model rows, fields, select controls, checkboxes, sliders, disclosure controls, Browse, and Run use semantic tokens.
- Native controls receive explicit foreground, background, border, accent, and `color-scheme` behavior.
- Validation and missing-key errors appear inline beside the relevant control with a direct recovery action.
- Existing node-selection and execution functionality does not change.

## Secondary surfaces

Launchpad, Templates, Outputs, workflow browser, Add Node, onboarding, project settings, dialogs, lightboxes, activity panels, and focus workspaces use the same appearance roles.

### Surface hierarchy

- No embedded page carries a hardcoded white card into dark appearance or a gray-black panel into light appearance.
- Menus, sheets, dialogs, and transient toolbars use a shared adaptive elevated-surface treatment.
- Depth uses navy-tinted or cool-gray shadows with one consistent lighting direction.
- Borders communicate boundaries; they are not decorative outlines around every object.
- Selected rows use both surface and foreground changes.
- Empty, loading, error, success, and disabled states remain readable in both appearances.

### Scrolling and navigation

- Trackpad and wheel gestures work inside Templates, Outputs, inspectors, dialogs, long menus, and workflow browsers.
- Headers and action bars remain fixed while their content regions scroll.
- Nested surfaces use deliberate `overscroll-behavior` so canvas zoom and page scrolling do not steal gestures.
- Every detail page has a clear Back or Close action.
- Scroll containers expose visible focus when keyboard navigation enters them.
- The Outputs thumbnail size control retains its existing function and uses compact, aligned typography.

### Add Node and command surfaces

- Search, category selection, result hover, active result, keyboard selection, footer actions, and shortcut hints adapt as a single surface.
- Result rows remain draggable where supported and use an appropriate drag cursor.
- Search and result regions keep focus and scroll ownership.
- Icons use the Current icon style and a consistent optical stroke.
- Keyboard help reflects controls that actually exist.

### Forms and native controls

- Every input has a visible or accessible label and meaningful name.
- Placeholders, values, helper copy, and inline errors use separate semantic text tiers.
- Checkboxes, switches, sliders, selects, text fields, text areas, and media controls adopt the active appearance.
- Focus uses a visible two-layer treatment that survives both light and dark surfaces.
- Disabled controls retain readable labels and do not rely on extreme opacity.
- Destructive actions keep confirmation or undo behavior.

## Interaction and motion

- Standard state transitions run for 140–220 ms.
- Hover changes surface and/or foreground contrast.
- Pressed controls compress subtly through transform, never through layout-affecting properties.
- Focus is visible only for keyboard-style focus through `:focus-visible`.
- Animations use transform and opacity where practical.
- Reduced-motion preference disables decorative node breathing, blur transitions, and nonessential movement.
- Tooltips support icon-only actions but do not replace accessible names.
- No continuous decorative motion competes with a running workflow.

## Functional behavior and error handling

This is a presentation-system refinement, not a workflow redesign. The following remain stable:

- Node creation, connection validation, execution ordering, and generated output flow.
- Project loading, saving, auto-save, and unsaved-change protection.
- API-key entry and provider configuration.
- Templates, workflow proposal, Outputs, and asset reuse.
- Node dragging, selection, grouping, panning, zooming, and keyboard shortcuts.
- Inspector selection and model-parameter updates.

Errors are inline and actionable. Missing API keys, invalid connections, failed generations, empty outputs, unavailable models, and save failures include:

- A readable status label.
- A status icon that is not the sole signal.
- Specific next-step copy.
- A direct recovery action where one exists.
- An appropriate live region for asynchronous updates.

## Implementation stages

1. Semantic tokens and contrast contracts.
2. Buttons, icon buttons, segmented controls, fields, menus, sheets, panels, and status primitives.
3. Command bar, canvas controls, nodes, connectors, navigator, and inspector.
4. Launchpad, Templates, Outputs, Add Node, onboarding, settings, dialogs, and focus workspaces.
5. Interaction, accessibility, regression, and visual-matrix verification.

Each stage is independently tested and committed before the next stage begins.

## Verification

### Automated contracts

- Both appearance roots define every required semantic token.
- Representative foreground/background pairs meet the intended contrast target.
- Core surfaces do not fall back to prohibited hardcoded white, gray-black, or low-contrast action combinations.
- The active appearance sets native `color-scheme`.
- Motion has a reduced-motion alternative.
- Icon-only buttons have accessible names.
- Form controls have labels and appearance-aware states.
- Scroll ownership tests cover Templates, Outputs, inspector, and modal content.
- Node dragging tests cover the status footer and protected interactive descendants.

### Regression coverage

Component and integration tests cover:

- Appearance switching and persistence.
- Hover, pressed, selected, focus, disabled, loading, empty, success, warning, and error states.
- Menu keyboard navigation and modal focus containment.
- Command bar actions and existing workspace-view selection.
- Node selection, dragging, connections, grouping, and execution entry points.
- Inspector field updates.
- Template and Outputs scrolling.
- Existing workflow execution paths.

Run the focused tests after each stage. Before completion, run the full Vitest suite, production build, TypeScript checks exposed by the build, and `git diff --check`.

### Visual acceptance matrix

Review light and dark appearances for:

- Launchpad.
- Core canvas with empty, simple, and dense workflows.
- Selected, running, warning, error, image, prompt, generation, and output nodes.
- Inspector with common native and custom controls.
- Command bar, project menu, Run menu, and appearance selection.
- Add Node.
- Templates and workflow proposal.
- Outputs at minimum, middle, and maximum thumbnail sizes.
- Workflow browser.
- Project settings and API-key entry.
- Onboarding, dialogs, lightboxes, and focus workspaces.

The local in-app browser URL was blocked by the browser-control policy during design review. Implementation must therefore keep the automated matrix exhaustive and leave the local preview server available for the user's final visual review. No browser-policy workaround is permitted.

## Acceptance criteria

The refinement is complete when:

- Light and dark are visibly coherent appearances of the same Current product.
- All normal text and essential controls meet their intended contrast target.
- Primary actions remain unmistakable in both appearances.
- No core surface uses a mismatched hardcoded light or dark treatment.
- Nodes, connectors, navigator, and inspector remain legible over their canvas.
- Trackpad, wheel, dragging, focus, and keyboard behavior remain functional.
- All established workflows and tests remain intact.
- The full test suite and production build pass.
- The user can inspect the local desktop preview in both appearances without encountering known unreadable or nonfunctional surfaces.

