# Current Adaptive Appearance Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Current desktop surface fully adaptive, readable, and functional in light and dark appearance while preserving all workflow behavior.

**Architecture:** Extend the existing CSS variable system with semantic surface, text, action, boundary, status, and focus roles, then migrate primitives and product surfaces onto those roles in dependency order. Keep the existing React component architecture and Zustand behavior; use focused component changes only where accessibility or interaction contracts require markup.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, vanilla CSS custom properties, React Flow, Zustand, Vitest, Testing Library.

---

## Task 1: Establish the semantic appearance contract

**Files:**

- Modify: `src/app/globals.css`
- Create: `src/app/appearance-contract.test.ts`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Write the failing semantic-token and contrast tests**

Create `src/app/appearance-contract.test.ts` with a small CSS-variable parser, WCAG luminance helpers, and explicit assertions for both themes:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function themeVariables(theme: "light" | "dark") {
  const body = theme === "light"
    ? css.match(/\n:root\s*\{([\s\S]*?)\n\}/)?.[1]
    : css.match(/:root\[data-appearance="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!body) throw new Error(`Missing ${theme} appearance block`);
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe.each(["light", "dark"] as const)("%s appearance contract", (theme) => {
  const vars = themeVariables(theme);

  it("defines every semantic role", () => {
    expect(vars).toMatchObject({
      "current-canvas": expect.any(String),
      "current-surface-chrome": expect.any(String),
      "current-surface-panel": expect.any(String),
      "current-surface-elevated": expect.any(String),
      "current-surface-control": expect.any(String),
      "current-surface-control-hover": expect.any(String),
      "current-border": expect.any(String),
      "current-border-strong": expect.any(String),
      "current-text-primary": expect.any(String),
      "current-text-secondary": expect.any(String),
      "current-text-tertiary": expect.any(String),
      "current-action": expect.any(String),
      "current-action-foreground": expect.any(String),
      "current-accent-text": expect.any(String),
      "current-focus-inner": expect.any(String),
      "current-focus-outer": expect.any(String),
    });
  });

  it("keeps text and filled actions at 4.5:1", () => {
    expect(contrast(vars["current-text-primary"], vars["current-surface-panel"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-text-secondary"], vars["current-surface-panel"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-text-tertiary"], vars["current-canvas"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-action-foreground"], vars["current-action"])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps strong control boundaries and focus rings at 3:1", () => {
    expect(contrast(vars["current-border-strong"], vars["current-surface-elevated"])).toBeGreaterThanOrEqual(3);
    expect(contrast(vars["current-focus-outer"], vars["current-canvas"])).toBeGreaterThanOrEqual(3);
  });
});
```

Add a static contract in `src/app/globals.test.ts` that requires the new semantic variables and prevents primary buttons from using `--current-paper` as foreground color.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
npx vitest run src/app/appearance-contract.test.ts src/app/globals.test.ts
```

Expected: FAIL because the semantic variable set and button contract do not exist yet.

- [ ] **Step 3: Add the light semantic palette**

Refactor the main `:root` declaration in `src/app/globals.css` to define these roles while retaining compatibility aliases used by existing surfaces:

```css
:root {
  color-scheme: light;
  --background: #f2f4f7;
  --foreground: #1d2430;
  --current-canvas: #f2f4f7;
  --current-surface-chrome: rgb(255 255 255 / 94%);
  --current-surface-panel: #f7f8fa;
  --current-surface-elevated: #ffffff;
  --current-surface-control: #eef1f5;
  --current-surface-control-hover: #e5eaf1;
  --current-border: #d8dee7;
  --current-border-strong: #7f8da0;
  --current-text-primary: #1d2430;
  --current-text-secondary: #566274;
  --current-text-tertiary: #616e80;
  --current-action: #4164d9;
  --current-action-hover: #3658c9;
  --current-action-foreground: #ffffff;
  --current-accent-text: #4164d9;
  --current-status-success: #18875d;
  --current-status-warning: #a35f00;
  --current-status-danger: #c53c45;
  --current-status-info: #4164d9;
  --current-focus-inner: #ffffff;
  --current-focus-outer: #4164d9;
  --current-focus: 0 0 0 2px var(--current-focus-inner), 0 0 0 4px var(--current-focus-outer);
  --current-shadow: rgb(35 48 68 / 14%);
  --current-shadow-strong: rgb(35 48 68 / 28%);
  --current-paper: var(--current-surface-elevated);
  --current-divider: var(--current-border);
  --current-graphite: var(--current-text-primary);
  --current-secondary-text: var(--current-text-secondary);
  --current-inspector: var(--current-surface-panel);
}
```

Keep the existing brand blue `#5578f6` for identity marks and aqua `#47cbb3` for typed media accents. Use `--current-action` for controls with normal-size white labels because it passes 4.5:1.

- [ ] **Step 4: Add the dark semantic palette**

Replace the dark root overrides with the approved Current navy system:

```css
:root[data-appearance="dark"] {
  color-scheme: dark;
  --background: #172130;
  --foreground: #f5f5f7;
  --current-canvas: #172130;
  --current-surface-chrome: #1d2a3b;
  --current-surface-panel: #213147;
  --current-surface-elevated: #26384e;
  --current-surface-control: #2b3f57;
  --current-surface-control-hover: #344b66;
  --current-border: #3a516c;
  --current-border-strong: #6f86a0;
  --current-text-primary: #f5f5f7;
  --current-text-secondary: #b6c2d2;
  --current-text-tertiary: #93a4b9;
  --current-action: #4164d9;
  --current-action-hover: #3658c9;
  --current-action-foreground: #ffffff;
  --current-accent-text: #6f8cff;
  --current-status-success: #47c58d;
  --current-status-warning: #ffb85a;
  --current-status-danger: #ff7b84;
  --current-status-info: #6f8cff;
  --current-focus-inner: #172130;
  --current-focus-outer: #6f8cff;
  --current-focus: 0 0 0 2px var(--current-focus-inner), 0 0 0 4px var(--current-focus-outer);
  --current-shadow: rgb(5 10 18 / 28%);
  --current-shadow-strong: rgb(5 10 18 / 48%);
  --current-paper: var(--current-surface-elevated);
  --current-divider: var(--current-border);
  --current-graphite: var(--current-text-primary);
  --current-secondary-text: var(--current-text-secondary);
  --current-inspector: var(--current-surface-panel);
}
```

- [ ] **Step 5: Pass the appearance contract**

Run:

```bash
npx vitest run src/app/appearance-contract.test.ts src/app/globals.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the semantic foundation**

```bash
git add src/app/globals.css src/app/appearance-contract.test.ts src/app/globals.test.ts
git commit -m "refactor(theme): establish adaptive semantic tokens"
```

## Task 2: Migrate shared controls and transient surfaces

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/components/current/CurrentButton.tsx`
- Modify: `src/components/current/CurrentIconButton.tsx`
- Modify: `src/components/current/CurrentSegmentedControl.tsx`
- Modify: `src/components/current/CurrentPanel.tsx`
- Modify: `src/components/current/CurrentSheet.tsx`
- Modify: `src/components/current/InlineNotice.tsx`
- Modify: `src/components/current/CurrentAlert.tsx`
- Test: `src/components/current/__tests__/CurrentPrimitives.test.tsx`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Write failing primitive-state assertions**

Add CSS contract assertions covering primary, secondary, hover, pressed, disabled, focus-visible, segmented selection, panels, sheets, and notices. Extend `currentPrimitives.test.tsx` to confirm disabled state, `aria-pressed`, and focusable accessible names survive the style migration.

- [ ] **Step 2: Confirm the focused tests fail**

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx src/app/globals.test.ts
```

Expected: FAIL on semantic state selectors.

- [ ] **Step 3: Migrate the primitive CSS**

Implement the shared control contract:

```css
.current-button {
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 10px;
  font: 600 0.875rem/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.current-button--primary {
  color: var(--current-action-foreground);
  background: var(--current-action);
}

.current-button--primary:hover:not(:disabled) {
  background: var(--current-action-hover);
}

.current-button--secondary {
  color: var(--current-text-primary);
  background: var(--current-surface-control);
  border-color: var(--current-border);
}

.current-button--secondary:hover:not(:disabled) {
  background: var(--current-surface-control-hover);
  border-color: var(--current-border-strong);
}

.current-button:disabled,
.current-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.current-button:focus-visible,
.current-icon-button:focus-visible,
.current-segmented-control button:focus-visible {
  outline: none;
  box-shadow: var(--current-focus);
}
```

Map icon buttons, segmented controls, panels, sheets, alerts, and inline notices to semantic roles. Remove dark-only patches that merely reverse a hard-coded light color.

- [ ] **Step 4: Keep component behavior stable**

Only adjust component props or markup when the tests expose a missing state. Do not change callbacks, keyboard handlers, modal focus management, or sheet stacking.

- [ ] **Step 5: Run focused tests**

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx src/app/globals.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit shared primitives**

```bash
git add src/app/globals.css src/components/current src/app/globals.test.ts
git commit -m "refactor(ui): adapt Current controls and surfaces"
```

## Task 3: Refine the core workspace, canvas, nodes, and inspector

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/components/workspace/CurrentCommandBar.tsx`
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/components/workspace/WorkspacePanelHost.tsx`
- Modify: `src/components/nodes/ControlPanel.tsx`
- Modify: `src/components/nodes/BaseNode.tsx`
- Modify: `src/components/nodes/NodeStatusFooter.tsx`
- Test: `src/components/nodes/__tests__/NodeStatusFooter.test.tsx`
- Test: `src/components/workspace/__tests__/CurrentCommandBar.test.tsx`
- Test: `src/components/__tests__/WorkflowCanvas.test.tsx`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Add failing workspace appearance and drag-surface tests**

Add static CSS assertions requiring semantic command-bar, canvas, React Flow controls, navigator, node, connector, selection, and inspector rules. Extend `NodeStatusFooter.test.tsx` with the explicit drag contract:

```ts
const footer = screen.getByTestId("node-status-footer");
expect(footer).toHaveAttribute("data-drag-surface", "true");
expect(footer).not.toHaveClass("nodrag");
expect(screen.getByRole("button", { name: /view error details/i })).toHaveClass("nodrag", "nopan");
```

If the footer does not expose a test id, query the existing semantic status element and keep the assertion scoped to it.

- [ ] **Step 2: Run the workspace tests and confirm failure**

```bash
npx vitest run src/components/nodes/__tests__/NodeStatusFooter.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.test.ts
```

Expected: FAIL because the footer drag marker and complete semantic surface migration are absent.

- [ ] **Step 3: Make the node footer an explicit drag surface**

Update `NodeStatusFooter.tsx`:

```tsx
<div
  className="current-node-status nopan"
  data-drag-surface="true"
  data-state={state}
>
```

Retain `nodrag nopan` on all interactive descendants. Add `cursor: grab` to the status footer and `cursor: grabbing` while a node is being dragged. Do not add click handlers or pointer capture to the footer.

- [ ] **Step 4: Apply adaptive workspace surfaces**

Map the command bar and canvas shell to `--current-surface-chrome` and `--current-canvas`. Keep chrome compact, translucent, and separated with a quiet border and restrained shadow. Use `backdrop-filter` only when supported and provide an opaque semantic fallback.

For React Flow:

```css
.react-flow__edge-path {
  opacity: 0.78;
  transition: opacity 160ms ease, stroke-width 160ms ease;
}

.react-flow__edge:hover .react-flow__edge-path,
.react-flow__edge.selected .react-flow__edge-path {
  opacity: 1;
}

.react-flow__controls,
.react-flow__minimap {
  color: var(--current-text-primary);
  background: var(--current-surface-elevated);
  border: 1px solid var(--current-border);
  box-shadow: 0 14px 36px var(--current-shadow);
}
```

Use the dark canvas in the navigator rather than a white rectangle. Keep typed connections distinct with brand blue for text and aqua for image data.

- [ ] **Step 5: Polish node hierarchy without a white outline**

Use semantic navy or light surfaces, one-pixel low-contrast borders, a stronger selected state, and a soft elevation shadow. Remove white perimeter borders from node shells and selected nodes. Keep node content, handles, action controls, and status labels functionally unchanged.

Style the status footer as part of the node shell instead of a separate grey slab. Preserve the image filename behavior in image-input footers and the no-rounded-bottom image treatment.

- [ ] **Step 6: Make the inspector fully adaptive**

Replace hard-coded charcoal inspector colors with semantic panel, elevated, control, text, and boundary roles. Use a darker navy panel in dark mode and a quiet light panel in light mode. Ensure selects, checkboxes, browse controls, close control, and the Run button have complete hover, active, focus-visible, and disabled states.

The Run button must use `--current-action` and `--current-action-foreground`, not the identity blue or paper alias.

- [ ] **Step 7: Run core workspace tests**

```bash
npx vitest run src/components/nodes/__tests__/NodeStatusFooter.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the workspace pass**

```bash
git add src/app/globals.css src/components/workspace/CurrentCommandBar.tsx src/components/WorkflowCanvas.tsx src/components/workspace/WorkspacePanelHost.tsx src/components/nodes/ControlPanel.tsx src/components/nodes/BaseNode.tsx src/components/nodes/NodeStatusFooter.tsx src/components/nodes/__tests__/NodeStatusFooter.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.test.ts
git commit -m "refactor(workspace): polish adaptive canvas and nodes"
```

## Task 4: Migrate every secondary product surface

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/components/workspace/Launchpad.tsx`
- Modify: `src/components/quickstart/QuickstartInitialView.tsx`
- Modify: `src/components/quickstart/QuickstartTemplatesView.tsx`
- Modify: `src/components/quickstart/WorkflowBrowserView.tsx`
- Modify: `src/components/quickstart/TemplateExplorerView.tsx`
- Modify: `src/components/workspace/OutputsWorkspace.tsx`
- Modify: `src/components/workspace/FocusWorkspace.tsx`
- Modify: `src/components/workspace/AddPalette.tsx`
- Modify: `src/components/onboarding/FTUXModal.tsx`
- Modify: `src/components/onboarding/FTUXWelcomeStep.tsx`
- Modify: `src/components/onboarding/FTUXApiKeysStep.tsx`
- Modify: `src/components/onboarding/FTUXModelDefaultsStep.tsx`
- Modify: `src/components/onboarding/FTUXReadyStep.tsx`
- Test: `src/components/__tests__/TemplateExplorerView.test.tsx`
- Test: `src/components/workspace/__tests__/OutputsWorkspace.test.tsx`
- Test: `src/components/workspace/__tests__/AddPalette.test.tsx`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Add failing secondary-surface contracts**

Extend `globals.test.ts` to require semantic colors for launchpad, quickstart, workflow browser, template cards and sidebar, outputs controls and cards, focus workspace, Add Node palette, onboarding, proposals, and dialogs. Keep the assertions tied to selectors already owned by each surface.

Retain the existing template and outputs wheel-gesture tests and add a regression assertion that their primary scroll regions keep `overscroll-contain` and do not globally suppress wheel events.

- [ ] **Step 2: Confirm the secondary tests fail**

```bash
npx vitest run src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/app/globals.test.ts
```

Expected: FAIL on the unmigrated light-only declarations.

- [ ] **Step 3: Migrate launchpad, quickstart, and workflow browser**

Use the same semantic hierarchy across the home and browsing surfaces:

- canvas/background for the page field;
- chrome for top bars;
- panel for grouped navigation;
- elevated for cards and dialogs;
- control and control-hover for actionable rows;
- primary, secondary, and tertiary text according to information hierarchy.

Keep the white Current logo on the dark launchpad and the color or black logo variant where contrast requires it in light appearance. Do not change recent-project loading, directory access, project creation, or tutorial state.

- [ ] **Step 4: Migrate templates and workflow description**

Remove pale cards floating on the dark shell. Template cards, filters, search, metadata badges, and Use Workflow buttons must adapt as a unified system. Keep the existing two-column desktop grid, category behavior, workflow instantiation, and scroll container.

Apply the same roles to the workflow-description editor, helper copy, review state, and footer action bar.

- [ ] **Step 5: Migrate outputs and focus workspace**

Keep outputs as the single library-style media destination. Style thumbnail controls, gallery cards, filters, empty states, metadata, and Back to Canvas with semantic roles. Preserve the thumbnail-size slider, generation loading, downloads, and wheel scrolling.

Apply the same adaptive shell to Focus Workspace without changing its editing or return-to-canvas behavior.

- [ ] **Step 6: Migrate Add Node, onboarding, proposals, and remaining dialogs**

Polish Add Node as a compact macOS-style command palette with strong search affordance, readable tabs, clear keyboard selection, a semantic results region, and stable footer shortcuts. Use tonal selection rather than an oversized dark bar in light appearance.

Apply semantic surfaces and text to FTUX, tutorial, proposal review, settings, API-key entry, confirmation alerts, and all empty or error states. Remove duplicate dark-mode patches after their base rules become adaptive.

- [ ] **Step 7: Run secondary-surface tests**

```bash
npx vitest run src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/app/globals.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the secondary product pass**

```bash
git add src/app/globals.css src/components/workspace/Launchpad.tsx src/components/quickstart/QuickstartInitialView.tsx src/components/quickstart/QuickstartTemplatesView.tsx src/components/quickstart/WorkflowBrowserView.tsx src/components/quickstart/TemplateExplorerView.tsx src/components/workspace/OutputsWorkspace.tsx src/components/workspace/FocusWorkspace.tsx src/components/workspace/AddPalette.tsx src/components/onboarding/FTUXModal.tsx src/components/onboarding/FTUXWelcomeStep.tsx src/components/onboarding/FTUXApiKeysStep.tsx src/components/onboarding/FTUXModelDefaultsStep.tsx src/components/onboarding/FTUXReadyStep.tsx src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/app/globals.test.ts
git commit -m "refactor(surfaces): complete adaptive product theming"
```

## Task 5: Complete accessibility, form semantics, and motion contracts

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/components/current/CurrentIconButton.tsx`
- Modify: `src/components/workspace/AddPalette.tsx`
- Modify: `src/components/quickstart/TemplateExplorerView.tsx`
- Modify: `src/components/workspace/OutputsWorkspace.tsx`
- Test: `src/components/current/__tests__/CurrentPrimitives.test.tsx`
- Test: `src/components/workspace/__tests__/AddPalette.test.tsx`
- Test: `src/components/__tests__/TemplateExplorerView.test.tsx`
- Test: `src/components/workspace/__tests__/OutputsWorkspace.test.tsx`

- [ ] **Step 1: Add failing semantic-control tests**

Add assertions for visible native tooltips, named search fields, named range controls, autocomplete behavior, focus-visible styling, reduced motion, and scroll containment:

```ts
expect(screen.getByRole("button", { name: "Outputs" })).toHaveAttribute("title", "Outputs");
expect(screen.getByRole("searchbox", { name: "Search nodes" })).toHaveAttribute("name", "node-search");
expect(screen.getByRole("searchbox", { name: "Search templates" })).toHaveAttribute("name", "template-search");
expect(screen.getByRole("slider", { name: "Thumbnail size" })).toHaveAttribute("name", "output-thumbnail-size");
```

- [ ] **Step 2: Confirm the focused tests fail**

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx
```

Expected: FAIL on at least the new title and form-name contracts.

- [ ] **Step 3: Give every icon control a native fallback tooltip**

Update `CurrentIconButton.tsx` to retain caller-provided titles and otherwise use the accessible label:

```tsx
const resolvedTitle = title ?? label;

return (
  <button
    {...buttonProps}
    aria-label={label}
    title={resolvedTitle}
  >
    {children}
  </button>
);
```

Do not replace accessible names with title-only labeling.

- [ ] **Step 4: Name search and sizing controls**

Update Add Node search:

```tsx
<input
  name="node-search"
  autoComplete="off"
  placeholder="Search nodes…"
  aria-label="Search nodes"
  role="searchbox"
/>
```

Update template search with `name="template-search"`, `autoComplete="off"`, and the visible placeholder `Search templates…`. Update the outputs range with `name="output-thumbnail-size"` while retaining `aria-label="Thumbnail size"` and the existing value behavior.

- [ ] **Step 5: Standardize focus, scroll, and motion behavior**

Apply `--current-focus` to every interactive selector that currently removes outlines. Use `overscroll-behavior: contain` only on modal or gallery scroll regions that own scrolling; do not prevent trackpad or mouse-wheel defaults on the document shell.

Add a reduced-motion contract:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Keep standard transitions between 140ms and 220ms and restrict them to changed visual properties.

- [ ] **Step 6: Run the focused accessibility tests**

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit accessibility and interaction contracts**

```bash
git add src/app/globals.css src/components/current/CurrentIconButton.tsx src/components/workspace/AddPalette.tsx src/components/quickstart/TemplateExplorerView.tsx src/components/workspace/OutputsWorkspace.tsx src/components/current/__tests__/CurrentPrimitives.test.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/components/__tests__/TemplateExplorerView.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx
git commit -m "fix(accessibility): complete adaptive control contracts"
```

## Task 6: Verify the complete desktop product matrix

**Files:**

- Verify: all modified source and test files
- Verify: `docs/superpowers/specs/2026-07-16-adaptive-appearance-refinement-design.md`

- [ ] **Step 1: Run the entire test suite**

```bash
npm run test:run
```

Expected: all tests pass without snapshots or contracts being skipped.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: production build completes with no TypeScript, SSR, or hydration errors.

- [ ] **Step 3: Audit remaining hard-coded surface colors**

```bash
rg -n "#[0-9a-fA-F]{3,8}|rgba?\(" src/app/globals.css src/components --glob "*.css" --glob "*.tsx"
```

Classify every match. Brand marks, typed connector colors, media overlays, and semantic token definitions may remain. Replace surface, text, control, focus, or boundary colors still bypassing semantic roles.

- [ ] **Step 4: Audit interactive-control coverage**

```bash
rg -n "outline:\s*none|overflow:\s*hidden|preventDefault\(\)|stopPropagation\(\)" src/app/globals.css src/components
```

Confirm every outline removal has a visible focus replacement, every overflow lock is scoped to the intended panel, and every event cancellation protects a deliberate interaction rather than blocking scrolling.

- [ ] **Step 5: Perform the visual matrix on the running localhost**

Verify both appearances at desktop width for:

1. Launchpad and recent projects.
2. New Project and settings tabs.
3. Add Node palette, search, keyboard selection, and scrolling.
4. Canvas, command bar, node states, connectors, selection toolbar, controls, and navigator.
5. Inspector fields, API-key access, Browse, and Run.
6. Outputs gallery, thumbnail slider, downloads, and two-finger scrolling.
7. Templates, categories, workflow cards, and two-finger scrolling.
8. Workflow description, proposal review, onboarding, tutorial, alerts, and empty/error states.
9. Appearance switching, persistence after reload, and dark default with no stored preference.
10. Keyboard-only traversal and reduced-motion behavior.

The automated browser may be unavailable under local URL policy. If so, keep the dev server running and provide this matrix to the user for direct inspection in the already-open localhost preview; do not claim visual sign-off from code inspection alone.

- [ ] **Step 6: Check the final diff**

```bash
git diff --check
git status --short
git log --oneline --decorate -8
```

Expected: no whitespace errors, only intentional changes, and one atomic commit for each completed task.

- [ ] **Step 7: Prepare the final handoff**

Summarize the adaptive token system, the surfaces migrated, accessibility fixes, node and inspector polish, and exact verification results. Include the localhost URL and call out any manual visual checks that remain for the user.
