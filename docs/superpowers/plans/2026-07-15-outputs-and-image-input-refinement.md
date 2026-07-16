# Outputs and Image Input Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Outputs the sole asset-browsing destination and refine completed image input metadata.

**Architecture:** Embed `AssetLibrary` in `OutputsWorkspace` to retain its search, filters, lazy loading, preview, and drag-to-canvas contract. Remove the duplicate Library toolbar control. Give `ImageInputNode` an explicit filename state label and round only its top media corners, leaving the status footer as the node's rounded base.

**Tech Stack:** Next.js, React, TypeScript, Zustand, React Flow, Vitest, Testing Library.

---

### Task 1: Refine image input media and status

**Files:**

- Modify: `src/components/nodes/ImageInputNode.tsx`
- Modify: `src/components/__tests__/ImageInputNode.test.tsx`

- [ ] **Step 1: Write failing tests**

Add a populated-image case that expects `rounded-t-lg` on the image and expects `portrait.png` rather than `Complete` in the status region.

```tsx
expect(screen.getByAltText("portrait.png")).toHaveClass("rounded-t-lg");
expect(screen.getByRole("status")).toHaveTextContent("portrait.png");
expect(screen.getByRole("status")).not.toHaveTextContent("Complete");
```

- [ ] **Step 2: Verify red**

Run `npx vitest run src/components/__tests__/ImageInputNode.test.tsx`. It must fail because the existing image has `rounded-lg` and the status says `Complete`.

- [ ] **Step 3: Implement the smallest fix**

Pass `stateLabel={nodeData.image ? nodeData.filename || "Image" : undefined}` to `BaseNode`. Change the populated image and image wrapper classes from `rounded-lg` to `rounded-t-lg`.

- [ ] **Step 4: Verify green and commit**

Run `npx vitest run src/components/__tests__/ImageInputNode.test.tsx`, then commit with `fix(ui): refine image input metadata`.

### Task 2: Unify Outputs and asset browsing

**Files:**

- Modify: `src/components/workspace/OutputsWorkspace.tsx`
- Modify: `src/components/workspace/CurrentCommandBar.tsx`
- Modify: `src/components/workspace/__tests__/OutputsWorkspace.test.tsx`
- Modify: `src/components/workspace/__tests__/CurrentCommandBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Mock `AssetLibrary` in the Outputs workspace test and expect it in embedded mode. Add a command-bar assertion that `Open library` is absent while the `Outputs` segmented control remains present.

```tsx
expect(screen.getByTestId("asset-library")).toHaveTextContent("true");
expect(screen.queryByRole("button", { name: "Open library" })).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: "Outputs" })).toBeInTheDocument();
```

- [ ] **Step 2: Verify red**

Run `npx vitest run src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx`. It must fail because Outputs has separate grids and the Library icon remains.

- [ ] **Step 3: Implement the smallest change**

Replace the output/history grids in `OutputsWorkspace` with `AssetLibrary embedded`, retaining the Outputs landmark, heading, and Back to Canvas action. Remove `LibraryIcon` and its command-bar button; do not change the Canvas/Outputs segmented control.

- [ ] **Step 4: Verify green and commit**

Run `npx vitest run src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx`, then commit with `feat(ui): unify outputs and asset browsing`.

### Task 3: Integrated verification

- [ ] Run `npx vitest run src/components/__tests__/ImageInputNode.test.tsx src/components/workspace/__tests__/OutputsWorkspace.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx` and confirm zero failures.
- [ ] Inspect `http://localhost:3000`: image input has square lower media corners and filename status, Outputs shows the asset browser, and the Library icon is absent.
- [ ] Run `git diff --check && git status --short` before handoff.
