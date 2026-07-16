# Current Navy Node Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace neutral dark-mode chrome and bright node keylines with a polished Current navy visual system.

**Architecture:** Keep all work in dark-appearance CSS overrides so light mode and node component behavior remain unchanged. Use the existing Current CSS variables for shared navy surfaces, then provide narrowly scoped overrides for React Flow and `.current-node` states.

**Tech Stack:** Next.js, React, React Flow, CSS custom properties, Vitest.

---

### Task 1: Lock the navy palette and node chassis contract

**Files:**
- Modify: `src/app/globals.test.ts`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Write the failing style assertions**

```ts
it("uses Current navy surfaces and removes white node keylines in dark appearance", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  expect(css).toMatch(/:root\[data-appearance="dark"\][\s\S]*?--current-canvas:\s*#172130/);
  expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-node\s*\{[\s\S]*?border:\s*1px solid #2f435b/);
  expect(css).not.toMatch(/:root\[data-appearance="dark"\] \.current-node\s*\{[\s\S]*?inset 0 0\.5px 0 rgba\(255, 255, 255/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/app/globals.test.ts`

Expected: FAIL because the dark canvas is still `#111113` and no dark node override exists.

- [ ] **Step 3: Commit the test**

```bash
git add src/app/globals.test.ts
git commit -m "test: define Current navy dark surfaces"
```

### Task 2: Apply the Current navy surface hierarchy

**Files:**
- Modify: `src/app/globals.css:60-130`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Update dark variables and React Flow chrome**

```css
:root[data-appearance="dark"] {
  --background: #172130;
  --current-paper: #1d2a3b;
  --current-canvas: #172130;
  --current-divider: #2f435b;
  --current-graphite: #b6c2d2;
  --current-minimap-neutral: #59708a;
}
:root[data-appearance="dark"] .react-flow {
  background: radial-gradient(120% 90% at 50% -25%, #26384e 0%, transparent 55%), #172130;
}
:root[data-appearance="dark"] .react-flow__controls { background: #26384e !important; }
:root[data-appearance="dark"] .react-flow__controls-button:hover { background: #344b66 !important; }
```

- [ ] **Step 2: Update dark command and action surfaces**

```css
html[data-appearance="dark"] .current-command-bar { background: rgb(29 42 59 / 92%); }
html[data-appearance="dark"] .current-button--secondary { background: #26384e; }
html[data-appearance="dark"] .current-button--secondary:hover:not(:disabled) { background: #344b66; }
:root[data-appearance="dark"] .current-media-action,
:root[data-appearance="dark"] .current-node-header__more { background: #26384e; border-color: #415a76; }
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run: `npx vitest run src/app/globals.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit the palette implementation**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat(ui): apply Current navy dark palette"
```

### Task 3: Give nodes a polished dark chassis

**Files:**
- Modify: `src/app/globals.css:691-753`
- Test: `src/app/globals.test.ts`

- [ ] **Step 1: Add dark-only node surface overrides**

```css
:root[data-appearance="dark"] .current-node {
  background: linear-gradient(180deg, #1d2a3b 0%, #192637 100%);
  border: 1px solid #2f435b;
  box-shadow: 0 1px 2px rgb(0 0 0 / 24%), 0 14px 34px -12px rgb(0 0 0 / 44%);
}
:root[data-appearance="dark"] .current-node:hover {
  border-color: #415a76;
  box-shadow: 0 2px 5px rgb(0 0 0 / 28%), 0 18px 42px -14px rgb(0 0 0 / 52%);
}
:root[data-appearance="dark"] .current-node--selected,
:root[data-appearance="dark"] .current-node[data-selected="true"] {
  border-color: var(--current-blue) !important;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--current-blue) 62%, transparent), 0 0 24px -4px color-mix(in srgb, var(--current-blue) 46%, transparent), 0 16px 36px -14px rgb(0 0 0 / 54%) !important;
}
```

- [ ] **Step 2: Remove white inset highlights from dark running and error node states**

```css
:root[data-appearance="dark"] .current-node[data-state="running"] {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--current-blue) 46%, transparent), 0 16px 36px -14px rgb(0 0 0 / 54%) !important;
}
:root[data-appearance="dark"] .current-node[data-state="error"] {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--current-danger) 42%, transparent), 0 16px 36px -14px rgb(0 0 0 / 54%) !important;
}
```

- [ ] **Step 3: Run all targeted UI tests**

Run: `npx vitest run src/app/globals.test.ts src/components/current/__tests__/AppearanceToggle.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx`

Expected: PASS.

- [ ] **Step 4: Visually verify the local preview**

Open `http://localhost:3000/` and confirm the canvas is `#172130`, controls are blue-slate, and nodes read as tonal surfaces without a bright white perimeter.

- [ ] **Step 5: Commit the node polish**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat(ui): refine dark node surfaces"
```
