# Current Product Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing node workflow editor into the desktop-only Current creative application without changing workflow semantics or removing capabilities.

**Architecture:** Keep `workflowStore.ts`, React Flow, execution modules, persistence, and API routes authoritative. Add a focused Current UI layer, a small amount of presentation state to the existing store, a unified workspace shell, and shared node/surface primitives; migrate existing feature components onto those boundaries incrementally. Every task ends with focused tests and an atomic commit.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand 5, `@xyflow/react`, Vitest, Testing Library.

---

## File map

### New shared UI

- `src/components/current/CurrentMark.tsx` — product mark and wordmark.
- `src/components/current/CurrentButton.tsx` — primary, secondary, and quiet button variants.
- `src/components/current/CurrentIconButton.tsx` — labeled icon-only control with a desktop-sized visual and accessible hit area.
- `src/components/current/CurrentSegmentedControl.tsx` — reusable view/tab switcher.
- `src/components/current/CurrentPanel.tsx` — left/right panel frame.
- `src/components/current/CurrentSheet.tsx` — centered configuration surface with Escape and focus return.
- `src/components/current/CurrentAlert.tsx` — destructive confirmation surface.
- `src/components/current/InlineNotice.tsx` — inline error, warning, and success feedback.
- `src/components/current/CurrentIcons.tsx` — the small custom icon set used by global chrome.
- `src/components/current/index.ts` — stable exports for the Current UI layer.

### New workspace UI

- `src/components/workspace/CurrentCommandBar.tsx` — global product and project commands.
- `src/components/workspace/ProjectMenu.tsx` — save/open/export/version/settings commands.
- `src/components/workspace/RunControl.tsx` — run/stop and run-scope menu.
- `src/components/workspace/AddPalette.tsx` — searchable and draggable node creation palette.
- `src/components/workspace/nodeCatalog.ts` — single node category, search, label, and role-glyph registry.
- `src/components/workspace/WorkspacePanelHost.tsx` — exclusive left/right panel placement.
- `src/components/workspace/LibraryPanel.tsx` — asset and generation-history tabs.
- `src/components/workspace/ActivityPanel.tsx` — workflow-level execution progress.
- `src/components/workspace/OutputsWorkspace.tsx` — focused grid of workflow output nodes and generation history.
- `src/components/workspace/Launchpad.tsx` — project start surface.
- `src/components/workspace/FocusWorkspace.tsx` — shell for annotation and long-form editors.

### New node UI

- `src/components/nodes/NodeStatusFooter.tsx` — explicit state and output metadata.
- `src/components/nodes/nodePresentation.ts` — role glyphs, display labels, typed colors, minimap colors, and status derivation.
- `src/components/nodes/__tests__/nodePresentation.test.ts` — presentation mapping contract.

### Existing boundaries to migrate

- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx` — design tokens, metadata, and shell composition.
- `src/store/workflowStore.ts` — exclusive panel state only; no workflow schema change.
- `src/components/Header.tsx`, `src/components/FloatingActionBar.tsx` — temporary compatibility exports removed after command bar and Add palette land.
- `src/components/WorkflowCanvas.tsx` — workspace composition, panels, launchpad, node creation, minimap, drag overlays, and focused editors.
- `src/components/nodes/BaseNode.tsx`, `FloatingNodeHeader.tsx`, `ControlPanel.tsx`, `HandleLabel.tsx` — shared node chassis, header, inspector, and accessible port treatment.
- Existing panels, dialogs, quickstart views, onboarding, and all node components — visual migration without behavior removal.

## Task 1: Lock the regression baseline

**Files:**
- Modify only if a characterization is missing: `src/components/__tests__/Header.test.tsx`
- Modify only if a characterization is missing: `src/components/__tests__/FloatingActionBar.test.tsx`
- Modify only if a characterization is missing: `src/components/__tests__/WorkflowCanvas.test.tsx`

- [ ] **Step 1: Run the complete current test suite**

Run:

```bash
npm run test:run
```

Expected: all existing tests pass. If a pre-existing failure appears, record the exact test and stop; do not mix an unrelated fix into the redesign.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: the Next.js production build completes successfully.

- [ ] **Step 3: Confirm the preserved behavior contracts are already covered**

The following assertions must exist before implementation continues:

```tsx
expect(screen.getByTitle("Save project")).toBeInTheDocument();
expect(screen.getByText("Run")).toBeInTheDocument();
expect(mockAddNode).toHaveBeenCalledWith("imageInput", expect.any(Object));
expect(mockExecuteWorkflow).toHaveBeenCalled();
expect(mockStopWorkflow).toHaveBeenCalled();
```

Add only a missing assertion to its existing test file.

- [ ] **Step 4: Re-run the three characterization files**

Run:

```bash
npx vitest run src/components/__tests__/Header.test.tsx src/components/__tests__/FloatingActionBar.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit only if characterization coverage changed**

```bash
git add src/components/__tests__/Header.test.tsx src/components/__tests__/FloatingActionBar.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
git commit -m "test: characterize workspace redesign contracts"
```

## Task 2: Establish Current tokens and identity

**Files:**
- Create: `src/components/current/CurrentMark.tsx`
- Create: `src/components/current/__tests__/CurrentMark.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing identity test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentMark } from "@/components/current/CurrentMark";

describe("CurrentMark", () => {
  it("renders an accessible Current identity", () => {
    render(<CurrentMark showWordmark />);
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentMark.test.tsx
```

Expected: FAIL because `CurrentMark` does not exist.

- [ ] **Step 3: Implement the mark**

```tsx
interface CurrentMarkProps {
  showWordmark?: boolean;
  className?: string;
}

export function CurrentMark({ showWordmark = false, className = "" }: CurrentMarkProps) {
  return (
    <span className={`current-identity ${className}`}>
      <svg role="img" aria-label="Current" viewBox="0 0 32 32" className="current-mark">
        <defs>
          <linearGradient id="current-flow" x1="4" y1="4" x2="28" y2="28">
            <stop offset="0" stopColor="var(--current-blue)" />
            <stop offset="1" stopColor="var(--current-aqua)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#current-flow)" />
        <path d="M6 12c4-3 8 3 12 0s6-2 8-1M6 20c4 3 8-3 12 0s6 2 8 1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {showWordmark && <span className="current-wordmark">current</span>}
    </span>
  );
}
```

Add these root tokens to `globals.css` and replace the Iris theme variables rather than layering duplicate palettes:

```css
:root {
  --current-blue: #5578f6;
  --current-aqua: #47cbb3;
  --current-blue-indigo: #6a70e8;
  --current-aqua-cyan: #3db9c4;
  --current-steel-blue: #528adf;
  --current-paper: #ffffff;
  --current-canvas: #f4f5f7;
  --current-divider: #d9dbe0;
  --current-graphite: #4c4e55;
  --current-inspector: #25262b;
  --current-danger: #e5484d;
  --current-warning: #d99a2b;
  --current-success: #2fa66d;
  --current-focus: 0 0 0 3px rgb(85 120 246 / 22%);
}
```

Update metadata exactly:

```ts
export const metadata: Metadata = {
  title: "Current — Creative workflows in motion",
  description: "A desktop creative canvas for building and running image, video, audio, text, and 3D workflows.",
};
```

- [ ] **Step 4: Verify the identity test passes**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentMark.test.tsx
```

Expected: PASS. Header continues using its compatibility implementation until Task 5.

- [ ] **Step 5: Commit the foundation**

```bash
git add src/components/current/CurrentMark.tsx src/components/current/__tests__/CurrentMark.test.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat(ui): establish Current identity and tokens"
```

## Task 3: Build the shared control and surface primitives

**Files:**
- Create: `src/components/current/CurrentButton.tsx`
- Create: `src/components/current/CurrentIconButton.tsx`
- Create: `src/components/current/CurrentSegmentedControl.tsx`
- Create: `src/components/current/CurrentPanel.tsx`
- Create: `src/components/current/CurrentSheet.tsx`
- Create: `src/components/current/CurrentAlert.tsx`
- Create: `src/components/current/InlineNotice.tsx`
- Create: `src/components/current/CurrentIcons.tsx`
- Create: `src/components/current/index.ts`
- Create: `src/components/current/__tests__/CurrentPrimitives.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the failing primitive behavior tests**

```tsx
it("labels icon-only controls", () => {
  render(<CurrentIconButton label="Open library"><span aria-hidden>◫</span></CurrentIconButton>);
  expect(screen.getByRole("button", { name: "Open library" })).toBeInTheDocument();
});

it("returns focus when a sheet closes", () => {
  const onClose = vi.fn();
  render(<CurrentSheet open title="Project settings" onClose={onClose}><p>Settings</p></CurrentSheet>);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledOnce();
});

it("uses one selected segment", () => {
  render(<CurrentSegmentedControl value="canvas" onChange={vi.fn()} options={[{ value: "canvas", label: "Canvas" }, { value: "outputs", label: "Outputs" }]} />);
  expect(screen.getByRole("button", { name: "Canvas" })).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 2: Verify the primitive tests fail**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx
```

Expected: FAIL because the primitives do not exist.

- [ ] **Step 3: Implement the stable primitive APIs**

Use these public signatures:

```ts
export type CurrentButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type CurrentPanelSide = "left" | "right";
export type NoticeTone = "error" | "warning" | "success" | "info";

export interface CurrentPanelProps {
  side: CurrentPanelSide;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export interface CurrentSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: "compact" | "standard" | "wide";
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}
```

Implement Escape handling in `CurrentSheet` with one document listener while open, restore `returnFocusRef.current?.focus()` after close, set `role="dialog"`, `aria-modal="true"`, and connect the heading through `aria-labelledby`.

Add shared CSS classes `.current-button`, `.current-icon-button`, `.current-panel`, `.current-sheet`, `.current-alert`, and `.current-inline-notice`. Use 120–160ms control transitions and 180–240ms surface transitions; add a `prefers-reduced-motion` block that disables translation and continuous animation.

- [ ] **Step 4: Run primitive tests**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentPrimitives.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the UI layer**

```bash
git add src/components/current src/app/globals.css
git commit -m "feat(ui): add Current control and surface primitives"
```

## Task 4: Add exclusive workspace panel state

**Files:**
- Modify: `src/store/workflowStore.ts`
- Create: `src/store/__tests__/workspacePanels.test.ts`

- [ ] **Step 1: Write the failing panel-state tests**

```ts
it("keeps at most one panel open on each side", () => {
  const store = useWorkflowStore.getState();
  store.setActiveLeftPanel("library");
  store.setActiveRightPanel("assistant");
  expect(useWorkflowStore.getState().activeLeftPanel).toBe("library");
  expect(useWorkflowStore.getState().activeRightPanel).toBe("assistant");
});

it("toggles an already-open panel closed", () => {
  const store = useWorkflowStore.getState();
  store.toggleRightPanel("activity");
  store.toggleRightPanel("activity");
  expect(useWorkflowStore.getState().activeRightPanel).toBeNull();
});

it("switches between canvas and outputs without changing workflow data", () => {
  const before = useWorkflowStore.getState().nodes;
  useWorkflowStore.getState().setWorkspaceView("outputs");
  expect(useWorkflowStore.getState().workspaceView).toBe("outputs");
  expect(useWorkflowStore.getState().nodes).toBe(before);
});
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
npx vitest run src/store/__tests__/workspacePanels.test.ts
```

Expected: FAIL because panel state is absent.

- [ ] **Step 3: Add only presentation state to the existing store**

```ts
export type LeftWorkspacePanel = "library" | null;
export type RightWorkspacePanel = "assistant" | "activity" | null;
export type WorkspaceView = "canvas" | "outputs";

// WorkflowStore fields
activeLeftPanel: LeftWorkspacePanel;
activeRightPanel: RightWorkspacePanel;
workspaceView: WorkspaceView;
setActiveLeftPanel: (panel: LeftWorkspacePanel) => void;
setActiveRightPanel: (panel: RightWorkspacePanel) => void;
toggleLeftPanel: (panel: Exclude<LeftWorkspacePanel, null>) => void;
toggleRightPanel: (panel: Exclude<RightWorkspacePanel, null>) => void;
setWorkspaceView: (view: WorkspaceView) => void;
```

Initialize both panel fields to `null` and `workspaceView` to `"canvas"`. Implement actions as:

```ts
toggleLeftPanel: (panel) => set((state) => ({ activeLeftPanel: state.activeLeftPanel === panel ? null : panel })),
toggleRightPanel: (panel) => set((state) => ({ activeRightPanel: state.activeRightPanel === panel ? null : panel })),
setWorkspaceView: (workspaceView) => set({ workspaceView }),
```

Do not include these fields in workflow serialization or undo history.

- [ ] **Step 4: Run store tests**

Run:

```bash
npx vitest run src/store/__tests__/workspacePanels.test.ts src/store/__tests__/workflowStore.integration.test.ts src/store/__tests__/undoRedo.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit panel state**

```bash
git add src/store/workflowStore.ts src/store/__tests__/workspacePanels.test.ts
git commit -m "feat(workspace): add exclusive panel state"
```

## Task 5: Replace the header with the unified command bar

**Files:**
- Create: `src/components/workspace/CurrentCommandBar.tsx`
- Create: `src/components/workspace/ProjectMenu.tsx`
- Create: `src/components/workspace/RunControl.tsx`
- Create: `src/components/workspace/__tests__/CurrentCommandBar.test.tsx`
- Create: `src/components/workspace/__tests__/RunControl.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/__tests__/Header.test.tsx`
- Modify: `src/components/onboarding/TutorialOverlay.tsx`

- [ ] **Step 1: Write failing command-bar and run-control tests**

```tsx
it("renders Current, the project, and one primary Run control", () => {
  render(<CurrentCommandBar />);
  expect(screen.getByText("current")).toBeInTheDocument();
  expect(screen.getByText("Campaign Study")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
});

it("stops an active workflow", () => {
  render(<RunControl />);
  fireEvent.click(screen.getByRole("button", { name: "Stop workflow" }));
  expect(mockStopWorkflow).toHaveBeenCalledOnce();
});

it("opens the requested workspace panel", () => {
  render(<CurrentCommandBar />);
  fireEvent.click(screen.getByRole("button", { name: "Open library" }));
  expect(mockToggleLeftPanel).toHaveBeenCalledWith("library");
});
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
npx vitest run src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/workspace/__tests__/RunControl.test.tsx
```

Expected: FAIL because workspace command components do not exist.

- [ ] **Step 3: Implement the 52px command hierarchy**

Compose `CurrentCommandBar` in this order:

```tsx
<header className="current-command-bar">
  <div className="current-command-bar__identity"><CurrentMark showWordmark /><ProjectMenu /></div>
  <CurrentSegmentedControl value="canvas" options={[{ value: "canvas", label: "Canvas" }, { value: "outputs", label: "Outputs" }]} onChange={setWorkspaceView} />
  <div className="current-command-bar__actions">
    <CurrentIconButton label="Undo" disabled={!canUndo} onClick={undo}><UndoIcon /></CurrentIconButton>
    <CurrentIconButton label="Redo" disabled={!canRedo} onClick={redo}><RedoIcon /></CurrentIconButton>
    <CurrentIconButton label="Add node" onClick={openAddPalette}><AddIcon /></CurrentIconButton>
    <CurrentIconButton label="Open library" onClick={() => toggleLeftPanel("library")}><LibraryIcon /></CurrentIconButton>
    <CurrentIconButton label="Open activity" onClick={() => toggleRightPanel("activity")}><ActivityIcon /></CurrentIconButton>
    <CurrentIconButton label="Open assistant" onClick={() => toggleRightPanel("assistant")}><AssistantIcon /></CurrentIconButton>
    <RunControl />
  </div>
</header>
```

Move existing new/open/save/export/revert/version/settings, comment navigation, costs, and shortcut behavior into `ProjectMenu` without changing their store calls. `RunControl` must retain full workflow, from selected node, selected node only, and selected nodes behavior.

Make `Header.tsx` a temporary compatibility export:

```ts
export { CurrentCommandBar as Header } from "@/components/workspace/CurrentCommandBar";
```

Update tutorial selectors to target the command-bar data attributes.

- [ ] **Step 4: Run command and legacy header tests**

Run:

```bash
npx vitest run src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/workspace/__tests__/RunControl.test.tsx src/components/__tests__/Header.test.tsx
```

Expected: PASS with Header assertions updated to Current labels and accessible names.

- [ ] **Step 5: Commit the command bar**

```bash
git add src/components/workspace/CurrentCommandBar.tsx src/components/workspace/ProjectMenu.tsx src/components/workspace/RunControl.tsx src/components/workspace/__tests__ src/app/page.tsx src/components/Header.tsx src/components/__tests__/Header.test.tsx src/components/onboarding/TutorialOverlay.tsx
git commit -m "feat(workspace): add unified Current command bar"
```

## Task 6: Replace the floating action bar with Add Palette

**Files:**
- Create: `src/components/workspace/nodeCatalog.ts`
- Create: `src/components/workspace/AddPalette.tsx`
- Create: `src/components/workspace/__tests__/AddPalette.test.tsx`
- Modify: `src/components/FloatingActionBar.tsx`
- Modify: `src/components/__tests__/FloatingActionBar.test.tsx`
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing Add Palette tests**

```tsx
it("filters nodes by name and category", () => {
  render(<AddPalette open onClose={vi.fn()} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search nodes" }), { target: { value: "video" } });
  expect(screen.getByRole("button", { name: "Generate video" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Prompt" })).not.toBeInTheDocument();
});

it("adds a node at the pane center", () => {
  render(<AddPalette open onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Image input" }));
  expect(mockAddNode).toHaveBeenCalledWith("imageInput", expect.any(Object));
});

it("preserves drag creation", () => {
  render(<AddPalette open onClose={vi.fn()} />);
  fireEvent.dragStart(screen.getByRole("button", { name: "Prompt" }), { dataTransfer });
  expect(dataTransfer.setData).toHaveBeenCalledWith("application/node-type", "prompt");
});
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
npx vitest run src/components/workspace/__tests__/AddPalette.test.tsx
```

Expected: FAIL because Add Palette does not exist.

- [ ] **Step 3: Create one complete catalog**

`nodeCatalog.ts` must contain every registered non-group node exactly once:

```ts
export const NODE_CATALOG = [
  { type: "imageInput", label: "Image input", category: "Input", keywords: ["photo", "reference"] },
  { type: "audioInput", label: "Audio input", category: "Input", keywords: ["sound", "music"] },
  { type: "videoInput", label: "Video input", category: "Input", keywords: ["movie", "clip"] },
  { type: "glbViewer", label: "3D viewer", category: "Input", keywords: ["glb", "model"] },
  { type: "prompt", label: "Prompt", category: "Input", keywords: ["text"] },
  { type: "array", label: "Array", category: "Input", keywords: ["list", "batch"] },
  { type: "promptConstructor", label: "Prompt constructor", category: "Input", keywords: ["template", "variables"] },
  { type: "nanoBanana", label: "Generate image", category: "Generate", keywords: ["gemini", "picture"] },
  { type: "generateVideo", label: "Generate video", category: "Generate", keywords: ["movie", "motion"] },
  { type: "generate3d", label: "Generate 3D", category: "Generate", keywords: ["glb", "mesh"] },
  { type: "generateAudio", label: "Generate audio", category: "Generate", keywords: ["speech", "music"] },
  { type: "llmGenerate", label: "Generate text", category: "Generate", keywords: ["llm", "language"] },
  { type: "annotation", label: "Annotate", category: "Process", keywords: ["draw", "mask"] },
  { type: "splitGrid", label: "Split grid", category: "Process", keywords: ["tiles", "cells"] },
  { type: "videoStitch", label: "Stitch video", category: "Process", keywords: ["join", "combine"] },
  { type: "videoTrim", label: "Trim video", category: "Process", keywords: ["cut", "clip"] },
  { type: "easeCurve", label: "Ease curve", category: "Process", keywords: ["speed", "timing"] },
  { type: "videoFrameGrab", label: "Grab frame", category: "Process", keywords: ["still", "extract"] },
  { type: "removeBackground", label: "Remove background", category: "Process", keywords: ["cutout", "alpha"] },
  { type: "imageCompare", label: "Compare images", category: "Process", keywords: ["before", "after"] },
  { type: "router", label: "Router", category: "Route", keywords: ["branch", "pass"] },
  { type: "switch", label: "Switch", category: "Route", keywords: ["toggle", "branch"] },
  { type: "conditionalSwitch", label: "Conditional switch", category: "Route", keywords: ["rule", "condition"] },
  { type: "output", label: "Output", category: "Output", keywords: ["result", "final"] },
  { type: "outputGallery", label: "Output gallery", category: "Output", keywords: ["results", "collection"] },
] satisfies NodeCatalogItem[];
```

Implement search, category chips, recents, click, drag, Escape, and `Command-K`. Reuse this palette from `ConnectionDropMenu` by filtering compatible source or target node types rather than maintaining a second label registry.

Make `FloatingActionBar.tsx` a temporary compatibility export for `AddPalette`, then remove its rendering from `page.tsx` after `CurrentCommandBar` owns opening it.

- [ ] **Step 4: Run palette and connection tests**

Run:

```bash
npx vitest run src/components/workspace/__tests__/AddPalette.test.tsx src/components/__tests__/FloatingActionBar.test.tsx src/components/__tests__/ConnectionDropMenu.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: PASS after legacy tests assert Add Palette behavior instead of the old persistent strip.

- [ ] **Step 5: Commit Add Palette**

```bash
git add src/components/workspace/nodeCatalog.ts src/components/workspace/AddPalette.tsx src/components/workspace/__tests__/AddPalette.test.tsx src/components/FloatingActionBar.tsx src/components/__tests__/FloatingActionBar.test.tsx src/components/WorkflowCanvas.tsx src/app/page.tsx src/components/ConnectionDropMenu.tsx src/components/__tests__/ConnectionDropMenu.test.tsx
git commit -m "feat(workspace): replace node strip with Add Palette"
```

## Task 7: Centralize node presentation and typed colors

**Files:**
- Create: `src/components/nodes/nodePresentation.ts`
- Create: `src/components/nodes/__tests__/nodePresentation.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/components/edges/SharedEdgeGradients.tsx`
- Modify: `src/components/edges/EditableEdge.tsx`
- Modify: `src/components/edges/ReferenceEdge.tsx`
- Modify: `src/components/nodes/HandleLabel.tsx`

- [ ] **Step 1: Write failing presentation mapping tests**

```ts
expect(getHandlePresentation("text")).toEqual(expect.objectContaining({ label: "Text", color: "var(--current-blue)" }));
expect(getHandlePresentation("image")).toEqual(expect.objectContaining({ label: "Image", color: "var(--current-aqua)" }));
expect(getHandlePresentation("video").gradient).toBe(true);
expect(getNodeRole("nanoBanana")).toBe("generator");
expect(getNodeRole("outputGallery")).toBe("output");
expect(getMinimapColor("generateAudio")).toBe("#6A70E8");
```

- [ ] **Step 2: Verify the mapping test fails**

Run:

```bash
npx vitest run src/components/nodes/__tests__/nodePresentation.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement exhaustive mappings**

Use a `Record<HandleType, HandlePresentation>` for text, image, video, audio, 3D, ease curve, and generic connections. Use a `Record<NodeType, NodeRole>` that assigns every catalog entry to input, generator, processor, router, or output. TypeScript must fail compilation when a new node or handle type lacks presentation.

Define the shared status derivation used by every node:

```ts
export type CurrentNodeState = "idle" | "selected" | "running" | "complete" | "skipped" | "locked" | "disabled" | "error";

export interface NodeStatusInput {
  running?: boolean;
  error?: string | null;
  skipped?: boolean;
  locked?: boolean;
  disabled?: boolean;
  complete?: boolean;
}

export function deriveNodeStatus(input: NodeStatusInput): { state: CurrentNodeState; label: string; detail?: string } {
  if (input.error) return { state: "error", label: "Error", detail: input.error };
  if (input.running) return { state: "running", label: "Running" };
  if (input.locked) return { state: "locked", label: "Locked" };
  if (input.disabled) return { state: "disabled", label: "Disabled" };
  if (input.skipped) return { state: "skipped", label: "Skipped", detail: "Missing optional input" };
  if (input.complete) return { state: "complete", label: "Complete" };
  return { state: "idle", label: "Ready" };
}
```

Replace the switch statement in `WorkflowCanvas` minimap with:

```tsx
<MiniMap nodeColor={(node) => getMinimapColor(node.type as NodeType)} />
```

Replace pink, orange, lime, and arbitrary edge gradients with the Current blue/aqua family. Add `aria-label={`${label} connection port`}` and visible labels during hover, drag, and keyboard focus.

- [ ] **Step 4: Run presentation and edge tests**

Run:

```bash
npx vitest run src/components/nodes/__tests__/nodePresentation.test.ts src/components/__tests__/ReferenceEdge.test.tsx src/components/__tests__/EditableEdge.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit typed presentation**

```bash
git add src/components/nodes/nodePresentation.ts src/components/nodes/__tests__/nodePresentation.test.ts src/app/globals.css src/components/WorkflowCanvas.tsx src/components/edges src/components/nodes/HandleLabel.tsx
git commit -m "feat(nodes): unify typed colors and edge presentation"
```

## Task 8: Implement the Current node chassis and explicit states

**Files:**
- Modify: `src/components/nodes/BaseNode.tsx`
- Modify: `src/components/nodes/FloatingNodeHeader.tsx`
- Create: `src/components/nodes/NodeStatusFooter.tsx`
- Modify: `src/components/__tests__/BaseNode.test.tsx`
- Create: `src/components/nodes/__tests__/NodeStatusFooter.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing semantic-state tests**

```tsx
it("labels running state without relying on animation", () => {
  render(<BaseNode id="node-1" isExecuting><div>Content</div></BaseNode>);
  expect(screen.getByText("Running")).toBeInTheDocument();
  expect(screen.getByTestId("current-node")).toHaveAttribute("data-state", "running");
});

it("shows the reason for a skipped node", () => {
  render(<NodeStatusFooter state="skipped" label="Skipped" detail="Missing optional image input" />);
  expect(screen.getByText("Missing optional image input")).toBeInTheDocument();
});

it("offers recovery for an error", () => {
  const retry = vi.fn();
  render(<NodeStatusFooter state="error" label="Connection failed" detail="Provider did not respond" action={{ label: "Retry", onClick: retry }} />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Verify the state tests fail**

Run:

```bash
npx vitest run src/components/__tests__/BaseNode.test.tsx src/components/nodes/__tests__/NodeStatusFooter.test.tsx
```

Expected: FAIL against old Iris class assertions and missing footer.

- [ ] **Step 3: Add the semantic chassis without changing resize behavior**

Extend `BaseNodeProps`:

```ts
interface BaseNodeProps {
  // existing props remain
  stateLabel?: string;
  stateDetail?: string;
  statusFooter?: ReactNode;
}
```

Keep all current `NodeResizer`, aspect-fit, settings height, multi-resize, hover suppression, and containment logic. Replace Iris material classes with `current-node` plus `data-state`. Render a visually hidden default label for running and error states when a specialized footer is absent.

Restyle `FloatingNodeHeader` as the identity portion of the same chassis: role glyph, editable title, lock, comment, expand, run, and overflow. Controls remain reachable by keyboard and appear visually on hover, focus-within, or selection.

- [ ] **Step 4: Run node chassis tests**

Run:

```bash
npx vitest run src/components/__tests__/BaseNode.test.tsx src/components/nodes/__tests__/NodeStatusFooter.test.tsx src/components/__tests__/GenerateImageNode.test.tsx src/components/__tests__/ImageInputNode.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the chassis**

```bash
git add src/components/nodes/BaseNode.tsx src/components/nodes/FloatingNodeHeader.tsx src/components/nodes/NodeStatusFooter.tsx src/components/nodes/__tests__/NodeStatusFooter.test.tsx src/components/__tests__/BaseNode.test.tsx src/app/globals.css
git commit -m "feat(nodes): add Current node chassis and states"
```

## Task 9: Migrate every specialized node to the chassis

**Files:**
- Modify: `src/components/nodes/AnnotationNode.tsx`
- Modify: `src/components/nodes/ArrayNode.tsx`
- Modify: `src/components/nodes/AudioInputNode.tsx`
- Modify: `src/components/nodes/ConditionalSwitchNode.tsx`
- Modify: `src/components/nodes/EaseCurveNode.tsx`
- Modify: `src/components/nodes/Generate3DNode.tsx`
- Modify: `src/components/nodes/GenerateAudioNode.tsx`
- Modify: `src/components/nodes/GenerateImageNode.tsx`
- Modify: `src/components/nodes/GenerateVideoNode.tsx`
- Modify: `src/components/nodes/GLBViewerNode.tsx`
- Modify: `src/components/nodes/GroupNode.tsx`
- Modify: `src/components/nodes/ImageCompareNode.tsx`
- Modify: `src/components/nodes/ImageInputNode.tsx`
- Modify: `src/components/nodes/LLMGenerateNode.tsx`
- Modify: `src/components/nodes/OutputGalleryNode.tsx`
- Modify: `src/components/nodes/OutputNode.tsx`
- Modify: `src/components/nodes/PromptConstructorNode.tsx`
- Modify: `src/components/nodes/PromptNode.tsx`
- Modify: `src/components/nodes/RemoveBackgroundNode.tsx`
- Modify: `src/components/nodes/RouterNode.tsx`
- Modify: `src/components/nodes/SplitGridNode.tsx`
- Modify: `src/components/nodes/SwitchNode.tsx`
- Modify: `src/components/nodes/VideoFrameGrabNode.tsx`
- Modify: `src/components/nodes/VideoInputNode.tsx`
- Modify: `src/components/nodes/VideoStitchNode.tsx`
- Modify: `src/components/nodes/VideoTrimNode.tsx`
- Modify: `src/components/nodes/ModelParameters.tsx`
- Modify: `src/components/nodes/SettingsTabBar.tsx`
- Test: all files under `src/components/__tests__/*Node.test.tsx` and `src/components/nodes/__tests__`

- [ ] **Step 1: Add a failing anti-Iris contract to representative node tests**

```tsx
expect(container.querySelector(".iris-card")).not.toBeInTheDocument();
expect(container.querySelector("[data-testid='current-node']")).toBeInTheDocument();
expect(screen.getByText(/Ready|Running|Complete|Skipped|Error/)).toBeInTheDocument();
```

Add the contract to Image Input, Generate Image, Generate Video, LLM Generate, Router, and Output tests; these cover each role and media pattern.

- [ ] **Step 2: Verify representative tests fail**

Run:

```bash
npx vitest run src/components/__tests__/ImageInputNode.test.tsx src/components/__tests__/GenerateImageNode.test.tsx src/components/__tests__/GenerateVideoNode.test.tsx src/components/__tests__/LLMGenerateNode.test.tsx src/components/__tests__/OutputNode.test.tsx
```

Expected: FAIL until the nodes use Current chassis/state markup.

- [ ] **Step 3: Apply one explicit migration rule to all listed nodes**

For every node:

```tsx
const status = deriveNodeStatus({
  running: "isLoading" in data && Boolean(data.isLoading),
  error: "error" in data && typeof data.error === "string" ? data.error : null,
  complete:
    ("outputImage" in data && Boolean(data.outputImage)) ||
    ("outputVideo" in data && Boolean(data.outputVideo)) ||
    ("outputAudio" in data && Boolean(data.outputAudio)) ||
    ("outputText" in data && Boolean(data.outputText)),
});

<BaseNode
  id={id}
  selected={selected}
  isExecuting={data.isLoading}
  hasError={Boolean(data.error)}
  stateLabel={status.label}
  stateDetail={status.detail}
  statusFooter={<NodeStatusFooter state={status.state} label={status.label} detail={status.detail} />}
>
  {existingNodeContent}
</BaseNode>
```

Remove card-level category background colors and legacy Iris classes. Keep all uploads, playback, generation, provider, inline parameter, resize, optional input, and output logic intact. Map metadata explicitly:

- Inputs: media dimensions or duration, format, optional state.
- Generators: provider/model, resolution or duration, elapsed progress, error recovery.
- Processors: operation name and output format.
- Routers/switches: active branch and rule count.
- Outputs: latest result type and availability.

Use `InlineNotice` inside node content for validation messages. Do not change executor or store data types.

- [ ] **Step 4: Run the complete node component suite**

Run:

```bash
npx vitest run src/components/__tests__ src/components/nodes/__tests__
```

Expected: PASS.

- [ ] **Step 5: Commit the node-family migration**

```bash
git add src/components/nodes src/components/__tests__
git commit -m "feat(nodes): migrate specialized nodes to Current"
```

## Task 10: Introduce panel host, Library, Activity, Assistant, and Inspector

**Files:**
- Create: `src/components/workspace/WorkspacePanelHost.tsx`
- Create: `src/components/workspace/LibraryPanel.tsx`
- Create: `src/components/workspace/ActivityPanel.tsx`
- Create: `src/components/workspace/OutputsWorkspace.tsx`
- Create: `src/components/workspace/__tests__/WorkspacePanelHost.test.tsx`
- Create: `src/components/workspace/__tests__/ActivityPanel.test.tsx`
- Create: `src/components/workspace/__tests__/OutputsWorkspace.test.tsx`
- Modify: `src/components/AssetLibrary.tsx`
- Modify: `src/components/GlobalImageHistory.tsx`
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/components/nodes/ControlPanel.tsx`
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/components/__tests__/GlobalImageHistory.test.tsx`

- [ ] **Step 1: Write failing exclusive-panel and activity tests**

```tsx
it("renders one right panel at a time", () => {
  render(<WorkspacePanelHost {...props} />);
  expect(screen.getByRole("complementary", { name: "Activity" })).toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: "Assistant" })).not.toBeInTheDocument();
});

it("lists running and waiting nodes", () => {
  render(<ActivityPanel onClose={vi.fn()} />);
  expect(screen.getByText("Generate image")).toBeInTheDocument();
  expect(screen.getByText("64%")).toBeInTheDocument();
  expect(screen.getByText("Waiting")).toBeInTheDocument();
});

it("shows workflow outputs without mutating the canvas", () => {
  render(<OutputsWorkspace onBack={vi.fn()} />);
  expect(screen.getByRole("main", { name: "Workflow outputs" })).toBeInTheDocument();
  expect(screen.getByText("Latest generations")).toBeInTheDocument();
  expect(screen.getByText("Output nodes")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the panel tests fail**

Run:

```bash
npx vitest run src/components/workspace/__tests__/WorkspacePanelHost.test.tsx src/components/workspace/__tests__/ActivityPanel.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx
```

Expected: FAIL because panel host and Activity do not exist.

- [ ] **Step 3: Implement exclusive panel composition**

```tsx
return (
  <>
    {activeLeftPanel === "library" && <LibraryPanel onClose={() => setActiveLeftPanel(null)} />}
    {activeRightPanel === "assistant" ? (
      <ChatPanel {...chatProps} isOpen onClose={() => setActiveRightPanel(null)} />
    ) : activeRightPanel === "activity" ? (
      <ActivityPanel onClose={() => setActiveRightPanel(null)} />
    ) : (
      <ControlPanel />
    )}
  </>
);
```

`LibraryPanel` owns Assets and History tabs and reuses the existing file discovery, thumbnails, dragging, filtering, and clear-history actions. Remove standalone fixed triggers from `AssetLibrary` and `GlobalImageHistory`; their content becomes tab bodies.

When `workspaceView === "outputs"`, `WorkflowCanvas` renders `OutputsWorkspace` in place of the React Flow viewport. `OutputsWorkspace` reads existing output/output-gallery nodes and `globalImageHistory`, groups them under “Output nodes” and “Latest generations,” and provides Back to Canvas through `setWorkspaceView("canvas")`. It must not copy, mutate, or serialize output data.

Restyle Chat and Control Panel with `CurrentPanel`. Keep chat streaming, tool calls, workflow edits, selection context, model fetching, parameters, and provider errors unchanged. `ActivityPanel` derives ordered rows from `nodes`, `currentNodeIds`, skipped IDs, and node error/loading data; do not add a second execution engine.

- [ ] **Step 4: Run panel and canvas tests**

Run:

```bash
npx vitest run src/components/workspace/__tests__/WorkspacePanelHost.test.tsx src/components/workspace/__tests__/ActivityPanel.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/__tests__/GlobalImageHistory.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit panel migration**

```bash
git add src/components/workspace/WorkspacePanelHost.tsx src/components/workspace/LibraryPanel.tsx src/components/workspace/ActivityPanel.tsx src/components/workspace/OutputsWorkspace.tsx src/components/workspace/__tests__ src/components/AssetLibrary.tsx src/components/GlobalImageHistory.tsx src/components/ChatPanel.tsx src/components/nodes/ControlPanel.tsx src/components/WorkflowCanvas.tsx src/components/__tests__/GlobalImageHistory.test.tsx
git commit -m "feat(workspace): consolidate Current side panels"
```

## Task 11: Migrate dialogs, destructive alerts, and focused editors

**Files:**
- Modify: `src/components/CostDialog.tsx`
- Modify: `src/components/KeyboardShortcutsDialog.tsx`
- Modify: `src/components/ProjectSetupModal.tsx`
- Modify: `src/components/SplitGridSettingsModal.tsx`
- Modify: `src/components/WorkflowBrowserModal.tsx`
- Modify: `src/components/WorkflowVersionHistory.tsx`
- Modify: `src/components/modals/ModelSearchDialog.tsx`
- Modify: `src/components/modals/PromptEditorModal.tsx`
- Modify: `src/components/modals/PromptConstructorEditorModal.tsx`
- Modify: `src/components/AnnotationModal.tsx`
- Create: `src/components/workspace/FocusWorkspace.tsx`
- Create: `src/components/workspace/__tests__/FocusWorkspace.test.tsx`
- Modify: related existing dialog tests.

- [ ] **Step 1: Write failing surface-taxonomy tests**

```tsx
it("uses a sheet for project settings", () => {
  render(<ProjectSetupModal isOpen mode="settings" onSave={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "Project settings" })).toHaveAttribute("data-surface", "sheet");
});

it("uses a focused workspace for annotation", () => {
  render(<FocusWorkspace title="Annotate" onBack={vi.fn()}><div>Canvas</div></FocusWorkspace>);
  expect(screen.getByRole("main", { name: "Annotate" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to canvas" })).toBeInTheDocument();
});

it("requires explicit confirmation for cost reset", () => {
  render(<CostDialog isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Reset cost" }));
  expect(screen.getByRole("alertdialog", { name: "Reset incurred cost?" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify surface tests fail**

Run:

```bash
npx vitest run src/components/__tests__/ProjectSetupModal.test.tsx src/components/__tests__/CostDialog.test.tsx src/components/workspace/__tests__/FocusWorkspace.test.tsx
```

Expected: FAIL until Current surfaces replace wrappers and browser confirm.

- [ ] **Step 3: Apply the approved taxonomy**

Use `CurrentSheet` for project setup, browser, models, costs, shortcuts, split-grid settings, and version history. Use `FocusWorkspace` for annotation, prompt editing, and prompt-constructor editing:

```tsx
<FocusWorkspace title="Edit prompt" onBack={onClose} primaryAction={<CurrentButton onClick={() => onSubmit(prompt)}>Done</CurrentButton>}>
  {editor}
</FocusWorkspace>
```

Use `CurrentAlert` for cost reset, AI revert, and any irreversible loss. Preserve all form validation, provider selection, browsing, version restore, canvas annotation, and editor submit behavior. Escape closes the nearest temporary surface and focus returns to its invoking control.

- [ ] **Step 4: Run all migrated surface tests**

Run:

```bash
npx vitest run src/components/__tests__/CostDialog.test.tsx src/components/__tests__/KeyboardShortcutsDialog.test.tsx src/components/__tests__/ProjectSetupModal.test.tsx src/components/__tests__/SplitGridSettingsModal.test.tsx src/components/__tests__/WorkflowBrowserModal.test.tsx src/components/__tests__/ModelSearchDialog.test.tsx src/components/__tests__/AnnotationModal.test.tsx src/components/__tests__/PromptEditorModal.test.tsx src/components/__tests__/PromptConstructorEditorModal.test.tsx src/components/workspace/__tests__/FocusWorkspace.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the surface migration**

```bash
git add src/components/current src/components/workspace/FocusWorkspace.tsx src/components/workspace/__tests__/FocusWorkspace.test.tsx src/components/CostDialog.tsx src/components/KeyboardShortcutsDialog.tsx src/components/ProjectSetupModal.tsx src/components/SplitGridSettingsModal.tsx src/components/WorkflowBrowserModal.tsx src/components/WorkflowVersionHistory.tsx src/components/modals src/components/AnnotationModal.tsx src/components/__tests__
git commit -m "feat(ui): migrate sheets alerts and focused editors"
```

## Task 12: Replace the welcome modal with the Current launchpad

**Files:**
- Create: `src/components/workspace/Launchpad.tsx`
- Create: `src/components/workspace/__tests__/Launchpad.test.tsx`
- Modify: `src/components/quickstart/WelcomeModal.tsx`
- Modify: `src/components/quickstart/QuickstartInitialView.tsx`
- Modify: `src/components/quickstart/QuickstartTemplatesView.tsx`
- Modify: `src/components/quickstart/TemplateExplorerView.tsx`
- Modify: `src/components/quickstart/PromptWorkflowView.tsx`
- Modify: `src/components/quickstart/WorkflowBrowserView.tsx`
- Modify: `src/components/quickstart/TemplateCard.tsx`
- Modify: `src/components/onboarding/FTUXModal.tsx`
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/components/__tests__/WelcomeModal.test.tsx`
- Modify: `src/components/__tests__/QuickstartInitialView.test.tsx`

- [ ] **Step 1: Write failing launchpad tests**

```tsx
it("offers every approved starting route", () => {
  render(<Launchpad {...props} />);
  expect(screen.getByRole("button", { name: "New canvas" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Describe a workflow" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open project" })).toBeInTheDocument();
});

it("is a workspace view, not a modal", () => {
  render(<Launchpad {...props} />);
  expect(screen.getByRole("main", { name: "Current launchpad" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify launchpad tests fail**

Run:

```bash
npx vitest run src/components/workspace/__tests__/Launchpad.test.tsx
```

Expected: FAIL because Launchpad does not exist.

- [ ] **Step 3: Implement launchpad routing while preserving quickstart logic**

Render Launchpad inside the workspace whenever `showQuickstart` is true and hide React Flow from the accessibility tree during that state. Keep existing handlers:

```tsx
<Launchpad
  onNewCanvas={() => { clearWorkflow(); setShowQuickstart(false); setShowNewProjectSetup(true); }}
  onDescribeWorkflow={() => setLaunchpadView("vibe")}
  onBrowseTemplates={() => setLaunchpadView("templates")}
  onOpenProject={() => setLaunchpadView("browse")}
  onWorkflowGenerated={handleWorkflowGenerated}
/>
```

Restyle templates by outcome, retain proposal validation, directory selection, workflow loading, and Back navigation. Present first-run API keys and tutorial setup in a `CurrentSheet`, not a separate visual language.

- [ ] **Step 4: Run launchpad and quickstart tests**

Run:

```bash
npx vitest run src/components/workspace/__tests__/Launchpad.test.tsx src/components/__tests__/WelcomeModal.test.tsx src/components/__tests__/QuickstartInitialView.test.tsx src/components/__tests__/QuickstartTemplatesView.test.tsx src/components/__tests__/PromptWorkflowView.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit launchpad**

```bash
git add src/components/workspace/Launchpad.tsx src/components/workspace/__tests__/Launchpad.test.tsx src/components/quickstart src/components/onboarding/FTUXModal.tsx src/components/WorkflowCanvas.tsx src/components/__tests__
git commit -m "feat(workspace): replace welcome modal with launchpad"
```

## Task 13: Replace browser alerts with inline recovery

**Files:**
- Modify: `src/components/WorkflowCanvas.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/CostDialog.tsx`
- Modify: `src/components/nodes/ImageInputNode.tsx`
- Modify: `src/components/nodes/AudioInputNode.tsx`
- Modify: `src/components/nodes/VideoInputNode.tsx`
- Modify: `src/components/nodes/AnnotationNode.tsx`
- Modify: `src/components/__tests__/WorkflowCanvas.test.tsx`
- Modify: `src/components/__tests__/ImageInputNode.test.tsx`
- Modify: `src/components/__tests__/AudioInputNode.test.tsx`
- Modify: `src/components/__tests__/VideoInputNode.test.tsx`
- Modify: `src/components/__tests__/AnnotationNode.test.tsx`

- [ ] **Step 1: Write failing recovery tests**

```tsx
it("shows an inline file validation error", async () => {
  render(<ImageInputNode {...props} />);
  fireEvent.change(screen.getByLabelText("Choose image"), { target: { files: [oversizedFile] } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Image too large. Maximum size is 10MB.");
  expect(window.alert).not.toHaveBeenCalled();
});

it("reports workflow import failure without browser alert", async () => {
  render(<WorkflowCanvas />);
  await dropInvalidWorkflow();
  expect(await screen.findByRole("alert")).toHaveTextContent("This workflow file could not be opened.");
});
```

- [ ] **Step 2: Verify the recovery tests fail**

Run:

```bash
npx vitest run src/components/__tests__/ImageInputNode.test.tsx src/components/__tests__/WorkflowCanvas.test.tsx
```

Expected: FAIL because current handlers call `alert`.

- [ ] **Step 3: Replace every application alert found by the audit**

Use local error state plus `InlineNotice` for upload, split-grid, import, save, open-folder, and annotation errors:

```tsx
const [validationError, setValidationError] = useState<string | null>(null);

{validationError && (
  <InlineNotice tone="error" onDismiss={() => setValidationError(null)}>
    {validationError}
  </InlineNotice>
)}
```

Use `CurrentAlert` for cost reset and AI-change revert. After changes, this command must return no application call sites:

```bash
rg -n "\b(alert|confirm)\(" src/components
```

The `javascript:alert(1)` URL-validation test string is expected and must remain.

- [ ] **Step 4: Run recovery tests**

Run:

```bash
npx vitest run src/components/__tests__/WorkflowCanvas.test.tsx src/components/__tests__/ImageInputNode.test.tsx src/components/__tests__/AudioInputNode.test.tsx src/components/__tests__/VideoInputNode.test.tsx src/components/__tests__/AnnotationNode.test.tsx src/components/__tests__/CostDialog.test.tsx src/components/__tests__/Header.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit recovery behavior**

```bash
git add src/components
git commit -m "fix(ui): replace browser alerts with inline recovery"
```

## Task 14: Remove Iris remnants and enforce Current accessibility

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/icon.svg`
- Modify: `src/components/Toast.tsx`
- Modify: `src/components/MultiSelectToolbar.tsx`
- Modify: `src/components/EdgeToolbar.tsx`
- Modify: `src/components/ConnectionDropMenu.tsx`
- Modify: all files returned by the Iris audit command.
- Modify: `src/components/__tests__/Toast.test.tsx`
- Modify: `package.json` only if product display metadata exists there; keep the package identifier `node-banana` to avoid tooling and storage migration.

- [ ] **Step 1: Add failing brand and accessibility assertions**

```tsx
expect(screen.getByRole("button", { name: "Close notification" })).toBeInTheDocument();
expect(screen.getByRole("toolbar", { name: "Selection actions" })).toBeInTheDocument();
expect(screen.getByRole("menu", { name: "Compatible nodes" })).toBeInTheDocument();
```

Add a source audit to the test script or verification checklist:

```bash
rg -n "iris-|iris\b|Node Banana|node-banana.png|banana_icon" src public
```

Expected before cleanup: matches remain.

- [ ] **Step 2: Verify focused accessibility tests fail**

Run:

```bash
npx vitest run src/components/__tests__/Toast.test.tsx src/components/__tests__/MultiSelectToolbar.test.tsx src/components/__tests__/ConnectionDropMenu.test.tsx
```

Expected: FAIL where accessible labels or Current markup are missing.

- [ ] **Step 3: Complete the brand and accessibility cleanup**

Remove `.iris-run`, `.iris-card`, `.iris-topbar`, `.iris-glass`, Iris spectrum variables, rainbow handle colors, and old brand text. Replace the favicon artwork with the Current wave mark.

Keep `node-banana` only where it is a technical identifier whose change would break package scripts, localStorage compatibility, or existing file formats. Do not rename localStorage keys or workflow schema fields.

Ensure:

- Icon-only controls have `aria-label`.
- Temporary surfaces have correct dialog/menu roles.
- Port labels appear on focus.
- Selection and focus use different visible treatments.
- Escape behavior is ordered: popover, sheet/focus workspace, panel.
- `prefers-reduced-motion` removes continuous connector and running-border animation.
- Target sizes use larger invisible hit areas where visual icons are under 28px.

- [ ] **Step 4: Run brand audit and accessibility-focused tests**

Run:

```bash
rg -n "iris-|iris\b|Node Banana|node-banana.png|banana_icon" src public
npx vitest run src/components/__tests__/Toast.test.tsx src/components/__tests__/MultiSelectToolbar.test.tsx src/components/__tests__/ConnectionDropMenu.test.tsx src/components/__tests__/BaseNode.test.tsx src/components/current/__tests__ src/components/workspace/__tests__
```

Expected: the audit prints no visual-brand matches; tests PASS.

- [ ] **Step 5: Commit cleanup**

```bash
git add src/app src/components public package.json
git commit -m "refactor(ui): complete Current brand and accessibility cleanup"
```

## Task 15: Verify the complete desktop product

**Files:**
- Modify only for discovered regressions: files already in scope above.
- Add regression tests beside the affected component; do not create a general catch-all test file.

- [ ] **Step 1: Run all automated tests**

Run:

```bash
npm run test:run
```

Expected: all tests PASS with no unhandled promise rejections or React act warnings introduced by the redesign.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: production build succeeds with no missing imports, invalid server/client boundaries, or TypeScript failures.

- [ ] **Step 3: Start the application and verify the full story in a browser**

Run:

```bash
npm run dev
```

At 1280×800, 1440×900, and 1728×1117 verify:

1. Launchpad routes open New Canvas, Describe, Templates, and Open Project.
2. Command bar opens project commands, Add Palette, Library, Activity, Assistant, and run options.
3. Every node type can be created, dragged, selected, resized, connected, configured, copied, and deleted.
4. Connection-drop creation filters compatible types.
5. Inspector follows selection and yields to Activity or Assistant without losing selection.
6. Run, Stop, run-from-selection, retry, skip, lock, undo/redo, save/load, and output flows work.
7. Assets and generated history drag back to the canvas.
8. Annotation and prompt editors return to the unchanged canvas.
9. Keyboard-only navigation, visible focus, focus return, Escape ordering, and documented shortcuts work.
10. Reduced-motion mode removes continuous movement while retaining state labels.

- [ ] **Step 4: Exercise a representative large workflow**

Load or create at least 40 mixed media and routing nodes. Pan, pinch-zoom, box-select, multi-drag, open/close panels, and execute a safe subset. Expected: no persistent jank, panel-driven full-canvas rerenders, lost selection, or broken media sizing.

- [ ] **Step 5: Run final source audits**

```bash
rg -n "iris-|iris\b|Node Banana|node-banana.png|banana_icon" src public
rg -n "\b(alert|confirm)\(" src/components
git diff --check
```

Expected: no visual-brand remnants, no application browser alerts, and no whitespace errors.

- [ ] **Step 6: Commit only verified regression fixes**

```bash
git add src
git commit -m "fix(ui): close Current verification regressions"
```

Skip this commit when verification required no code changes.
