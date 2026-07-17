# Current product redesign

**Date:** 2026-07-10  
**Status:** Approved design  
**Working product name:** Current

## Summary

Transform the legacy app into **Current**, a desktop-only professional creative application with the focused power of Final Cut Pro and the spatial ease of Freeform. The overhaul preserves every existing capability while rebuilding the product hierarchy, visual system, node family, secondary surfaces, and interaction feedback around a coherent Mac-first design system.

Current uses an adaptive hybrid workspace: a luminous neutral canvas for creative work, restrained translucent chrome for global controls, opaque white nodes for content, and a dark graphite inspector for professional configuration. The product is system-led rather than component-by-component. Shared primitives and behavior rules are established before existing features migrate to them.

“Current” is the working name for implementation. The identity is intentionally separable so a later naming decision does not require redesigning the interface.

## Goals

- Make the application feel like a new flagship Apple creative product rather than a styled web dashboard.
- Preserve all current workflow, node, connection, execution, project, history, asset, annotation, assistant, and onboarding capabilities.
- Create one maintainable design system that governs every control and surface.
- Reduce persistent interface clutter through progressive disclosure and contextual controls.
- Make workflow state, execution progress, errors, and recovery immediately understandable.
- Optimize exclusively for desktop workspaces, Mac keyboard and trackpad behavior, and long professional sessions.
- Meet accessible contrast, keyboard, focus, labeling, and reduced-motion expectations.
- Protect canvas rendering and interaction performance on large workflows.

## Non-goals

- Rewriting the workflow engine, Zustand store architecture, API providers, execution ordering, persistence format, or server routes.
- Removing, combining, or reducing node capabilities.
- Building a mobile or touch-first responsive experience.
- Migrating away from Next.js, React, Tailwind CSS, React Flow, Konva, or Zustand.
- Reproducing Apple assets, trademarks, or exact proprietary interfaces.
- Completing a trademark or legal availability review for the name Current.

## Product principles

### Content owns the window

The workflow canvas is the primary product surface. Persistent chrome stays compact, and secondary tools appear only when requested or relevant. The interface should feel open even when the workflow is complex.

### Progressive disclosure

Global actions live in one command bar. Selection actions appear near the selection. Detailed settings live in the inspector. Specialized work such as annotation receives a focused workspace. Controls should not be duplicated across these layers.

### Depth communicates ownership

Materials are functional. The canvas is the stage, nodes sit on the stage, translucent chrome floats above it, and the dark inspector is a stable professional instrument. Blur and shadows do not decorate surfaces without communicating hierarchy.

### State is explicit

Running, complete, skipped, locked, disabled, and error states include words or icons in addition to color, animation, or opacity. Errors identify what happened and offer a specific recovery action.

### Brand color has meaning

Current’s cobalt-to-aqua signature represents action, creation, and data flow. It is not a decorative gradient. System red, amber, and green are reserved for error, warning, and success.

## Workspace architecture

### Unified command bar

A single 52-pixel command bar contains:

- Current identity and the active project name.
- A compact Canvas/Outputs view switcher.
- Undo and redo.
- Add Node and command search.
- Toggles for secondary panels such as Library, Activity, Assistant, and Inspector.
- The primary Run action, which becomes Stop while execution is active.

File, project, cost, history, and settings commands remain available but move into appropriately grouped menus or panels. The bar must not reproduce every feature as a permanent icon.

### Canvas

The luminous cool-neutral canvas fills all remaining window space. It retains existing React Flow navigation, selection, minimap, controls, group behavior, edge editing, trackpad panning, and zooming.

There is no permanent left sidebar. Assets, generation history, workflow history, and related reference tools open in a replaceable left panel. The inspector, assistant, and activity views open in a replaceable right panel. At most one panel occupies each side.

### Contextual inspector

Selecting one configurable node opens a 236- to 320-pixel dark graphite inspector on the right. The inspector is selection-driven, collapsible, and state-preserving. It uses Basic, Model, and More sections where necessary, with the most frequently changed parameters first.

Full parameters live in the inspector. Only controls required to understand or operate a node remain inline. When the assistant or activity view replaces the inspector, the selected node and inspector scroll position remain unchanged.

### Add palette

The existing crowded floating node strip becomes a searchable Add palette opened by the toolbar, `Command-K`, existing creation shortcuts, or connection-drop behavior. It provides:

- Search by node name, purpose, model, and category.
- Outcome-oriented categories: Input, Generate, Process, Route, and Output.
- Recent and frequently used nodes.
- Click-to-add and drag-to-place behavior.
- Existing automatic connection behavior when opened from a dropped connection.

### Local selection controls

Actions that apply only to selected nodes appear in a compact floating toolbar near the selection. This includes regenerate, duplicate, delete, alignment, distribution, grouping, and other existing selection operations. The toolbar appears on selection or keyboard focus and withdraws during panning or dragging.

## Visual system

### Brand palette

- **Current blue:** `#5578F6`; primary actions, selection, focus, active controls.
- **Current aqua:** `#47CBB3`; image creation and the flowing endpoint of the brand signature.
- **Current flow:** cobalt-to-aqua gradient; product mark, active execution paths, and visible data movement only.
- **Paper:** `#FFFFFF`; primary floating content.
- **Canvas:** approximately `#F4F5F7`; workspace ground.
- **Divider:** approximately `#D9DBE0`; low-emphasis structure.
- **Graphite:** approximately `#4C4E55`; secondary dark controls.
- **Inspector:** approximately `#25262B`; professional configuration surfaces.

The existing lime primary action and Iris rainbow spectrum are removed.

### Typed connections

Connection types remain visually distinguishable but derive from the cool Current family:

- Text: Current blue.
- Image: Current aqua.
- Video: Current flow gradient.
- Audio: blue-indigo derived from Current blue.
- 3D: aqua-cyan derived from Current aqua.
- Ease curve and other technical data: steel blue.

Ports and connection previews always expose a type label and appropriate icon on hover, drag, or keyboard focus. Color is never the only type signal.

### Typography

Use the Mac system font stack so the application renders in San Francisco on macOS. No external display font is introduced.

- Display: 28px, approximately 690 weight, tight optical tracking.
- Surface title: 17px, approximately 660 weight.
- Control and body: 12–13px with readable line height.
- Metadata and labels: 10–11px, medium or semibold.
- Numeric data uses tabular figures.

Sentence case is the default. All-caps text is limited to rare compact metadata where it improves scanning.

### Materials

- Nodes are opaque white or near-white for legibility and panning performance.
- The command bar and temporary floating chrome may use restrained translucency and background blur.
- The inspector is opaque or nearly opaque graphite.
- Shadows share one upper-left lighting model and use cool tinted neutrals.
- Inner borders and half-pixel dividers provide edge definition on high-density displays.
- Corner radii vary by hierarchy: controls 7–10px, nodes 14–18px, panels and sheets 18–24px.

### Motion

- Hover, press, and control feedback: 120–160ms.
- Popovers, inspectors, and contextual toolbars: 180–240ms.
- Object placement and panels use restrained spring behavior without decorative bounce.
- Continuous animation appears only while execution is active.
- Motion uses transform and opacity rather than layout properties.
- Reduced-motion mode removes translation and continuous connector motion while preserving state changes.

## Node system

Every node uses one shared chassis with four regions:

1. **Identity header:** role glyph, node title, optional subtype, and contextual overflow.
2. **Content body:** media, prompt, curve, control, or output content appropriate to the node.
3. **Connection ports:** typed inputs and outputs anchored to consistent edges.
4. **Metadata footer:** execution state and the most useful output or configuration summary.

Node categories use role glyphs, labels, and content—not colored card backgrounds. Overflow and quick actions appear on hover, focus, or selection. Detailed parameters move to the inspector unless they are essential to the node’s direct task.

### Node states

- **Idle:** quiet white surface and stable metadata.
- **Hover:** slightly stronger elevation; contextual overflow becomes visible.
- **Selected:** a two-pixel optical Current-blue ring and open inspector.
- **Connecting:** compatible ports and labels emphasize; incompatible targets withdraw.
- **Running:** Current flows around the node edge and active connectors; numeric or textual progress remains visible.
- **Complete:** completion state and elapsed time appear in the footer without turning the whole node green.
- **Skipped:** reduced emphasis plus a visible reason label.
- **Locked:** explicit lock label; editing affordances withdraw.
- **Disabled:** reduced emphasis and a clear disabled label or switch state.
- **Error:** restrained system-red outline, direct explanation, and Retry or configuration recovery action.

Node resizing, native media aspect ratios, comments, groups, inline parameters, and all specialized node content remain functional.

## Secondary surfaces

### Launchpad

The welcome modal becomes a project launchpad shown when no project is open. It offers:

- New Canvas.
- Describe a Workflow.
- Browse Templates.
- Open Project.
- Recent projects with last-opened metadata.

Templates are organized by outcome rather than AI provider. Generated workflow proposals remain reviewable before application.

### Surface taxonomy

- **Popover:** Add Node, connection choices, compact menus, sorting, and reversible presets.
- **Side panel:** Library, asset history, workflow history, assistant, activity, and inspector.
- **Sheet:** Project setup, model browser, cost detail, keyboard shortcuts, and version history.
- **Focus workspace:** Annotation and long-form prompt construction or editing.
- **Alert:** irreversible destructive actions only.

Temporary surfaces close with Escape and return focus to their source. Panels replace peers on the same side instead of stacking. Focus workspaces always provide a persistent Back action and preserve the underlying canvas state.

## Execution and error behavior

Running a workflow creates feedback at three coordinated levels:

1. The Run control becomes Stop and shows overall activity.
2. The Activity panel lists ordered node progress, waiting states, completion, and failures.
3. Each affected node and connector exposes its local state.

Provider, validation, connection, and persistence failures remain near the action or node that caused them. Messages state the problem in plain language and provide a specific next action. Toasts are reserved for short confirmations that do not require action. Browser alerts are eliminated except where the platform requires them; destructive confirmations use a designed alert.

Unsaved state remains visible in the project identity area. Save failures preserve the unsaved state and offer Retry and project-location recovery.

## State and data flow

The existing Zustand workflow store remains the source of truth for nodes, edges, selection, workflow metadata, execution, autosave, panels already represented in application state, and undo/redo.

New visual primitives receive state and actions through existing hooks rather than duplicating workflow data. Selection drives the inspector. Toolbar commands call existing store actions. The Add palette calls existing node creation and connection logic. Activity derives from existing execution state and node statuses.

Ephemeral presentation state—open popover, active inspector tab, or local hover state—stays local unless it must survive surface replacement or navigation. State that must persist across panel replacement is added to the appropriate store with a narrow interface.

No project file schema change is required for the redesign. If an implementation detail later requires persistence, it must be backward-compatible and independently tested.

## Desktop interaction and accessibility

- The minimum supported workspace is 1280×800.
- Primary validation sizes are 1280×800, 1440×900, and 1728×1117.
- Existing keyboard shortcuts remain available and documented.
- Keyboard focus is visible with a Current-blue focus ring distinct from selection.
- Escape closes the nearest temporary surface in a predictable order.
- Focus returns to the invoking control after a popover, sheet, or focus workspace closes.
- Ports, icon-only buttons, node states, progress, and errors have accessible names.
- Connection type and state never rely on hue alone.
- Text and essential controls meet WCAG AA contrast.
- Pointer targets remain comfortable for desktop use; small visible icons receive larger invisible hit areas.
- Trackpad gestures preserve existing pan and zoom behavior, while scrollable panels consume their own scroll input.
- Reduced-motion preferences are honored throughout.

## Performance constraints

- Do not apply backdrop blur to nodes or per-node content.
- Animate transform and opacity only during frequent interactions.
- Preserve existing image hit-testing and canvas-interaction optimizations.
- Avoid store subscriptions that rerender the full canvas for panel-only state.
- Lazy-load existing heavy tools such as Three.js and Konva as they are today.
- Validate panning, zooming, selection, and execution feedback on a representative large workflow.

## Implementation boundaries

Introduce a focused Current UI layer rather than rewriting application logic. Likely boundaries include:

- Design tokens and global materials.
- Reusable controls, fields, segmented controls, icon buttons, status rows, panels, popovers, sheets, and alerts.
- A new application shell and command bar.
- A shared node chassis used by existing specialized nodes.
- A panel host coordinating left and right secondary surfaces.
- A launchpad replacing the initial modal presentation.
- Focus workspace shells for annotation and prompt editing.

Existing feature components migrate incrementally. Unrelated store, provider, and API refactors are out of scope.

## Implementation sequence

Each phase is an atomic commit and leaves the application buildable:

1. Current tokens, typography, iconography rules, controls, materials, and motion primitives.
2. Unified command bar, canvas shell, panel hosts, and Add palette.
3. Shared node chassis, ports, metadata, and state treatments across every node type.
4. Inspector, Library, Assistant, Activity, history, and related side panels.
5. Sheets, popovers, alerts, launchpad, onboarding, annotation, and prompt focus workspaces.
6. Remove obsolete Iris styling, duplicate controls, legacy modal wrappers, and dead assets.
7. Accessibility, performance, regression, visual, and production-build verification.

## Verification strategy

### Automated regression

- Run the existing unit and integration suite before migration and after each phase.
- Preserve tests for workflow execution, connection validation, node defaults, undo/redo, save/load, skip propagation, loops, generated outputs, and node-specific behavior.
- Add component tests for the command bar, panel host, Add palette, node chassis, state labels, sheets, alerts, and launchpad.
- Add integration tests for selection-to-inspector flow, panel replacement, focus return, keyboard commands, node creation, connection-drop creation, execution progress, retry, skip, lock, save failure, and output completion.

### Visual and interaction verification

- Inspect every node type in idle, hover, selected, running, complete, skipped or disabled where applicable, locked, and error states.
- Verify the primary desktop sizes and content overflow at minimum height.
- Test mouse and trackpad pan, zoom, drag, resize, connect, multi-select, and panel scrolling.
- Verify keyboard-only navigation, visible focus, Escape behavior, and shortcut preservation.
- Verify reduced-motion behavior and essential contrast.
- Exercise onboarding, launchpad, project setup, model search, annotation, prompt editing, costs, version history, asset history, assistant, and workflow browsing.
- Run a production build and perform a large-workflow panning and execution smoke test.

## Acceptance criteria

- Every existing user-facing capability remains reachable and functional.
- The product consistently uses the Current visual system; Iris lime and rainbow accents are absent.
- The canvas is the dominant surface, with no permanent left sidebar.
- The command bar, inspector, Add palette, local selection controls, panels, sheets, and focus workspaces follow this specification.
- All node types use the shared chassis and explicit state system.
- Errors provide direct explanations and recovery without routine browser alerts.
- Existing tests pass, new behavior is covered, and the production build succeeds.
- Keyboard-only use, reduced motion, focus return, labeled ports, and contrast checks pass.
- Representative large workflows remain fluid during pan, zoom, selection, and execution.
