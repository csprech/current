# Current Brand and Dark-Mode Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the approved white Current icon everywhere, switch the wordmark between black and white by appearance, render the React Flow canvas in Current navy in dark mode, and make the per-node Run action a readable cobalt primary control.

**Architecture:** Keep `data-appearance` and the semantic CSS variables as the only theme source. Simplify `CurrentMark` so consumers cannot request color variants, bind both visible canvas layers to `--current-canvas`, and apply the existing semantic primary-action primitive to the per-node Run control. No workflow state, execution callback, React Flow behavior, or persistence contract changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `@xyflow/react`, Vitest, Testing Library, semantic CSS custom properties.

---

## File Structure

- `src/components/current/CurrentMark.tsx`: render the single approved icon plus the two adaptive wordmark assets.
- `src/components/current/__tests__/CurrentMark.test.tsx`: guard identity accessibility and prohibit color variants in the rendered component.
- `src/components/workspace/Launchpad.tsx`: stop requesting a color wordmark.
- `src/components/quickstart/QuickstartInitialView.tsx`: stop requesting a color wordmark.
- `src/app/icon.svg`: mirror the approved `current-icon-white` app artwork.
- `src/app/icon.test.ts`: prove the app icon and approved white icon asset are identical.
- `src/app/globals.css`: own adaptive wordmark visibility, semantic canvas binding, and Run-action layout.
- `src/app/globals.test.ts`: guard brand variant visibility and semantic canvas CSS contracts.
- `src/components/WorkflowCanvas.tsx`: replace fixed-light canvas utilities with semantic canvas classes.
- `src/components/__tests__/WorkflowCanvas.test.tsx`: guard both visible canvas layers without coupling interaction tests to a visual utility class.
- `src/components/nodes/FloatingNodeHeader.tsx`: apply the cobalt primary-action treatment to Run.
- `src/components/nodes/__tests__/FloatingNodeHeader.test.tsx`: guard Run contrast classes, accessible naming, and callback behavior.
- `src/app/appearance-contract.test.ts`: existing contrast coverage; run unchanged to verify white on the action fill remains at least 4.5:1.

### Task 1: Simplify Current identity assets

**Files:**
- Modify: `src/components/current/CurrentMark.tsx`
- Modify: `src/components/current/__tests__/CurrentMark.test.tsx`
- Modify: `src/components/workspace/Launchpad.tsx`
- Modify: `src/components/quickstart/QuickstartInitialView.tsx`
- Modify: `src/app/globals.css:151-183`
- Modify: `src/app/globals.test.ts:280-288`
- Modify: `src/app/icon.svg`
- Create: `src/app/icon.test.ts`

- [ ] **Step 1: Write failing component, CSS, and app-icon tests**

Replace the brand-family test in `CurrentMark.test.tsx` with this contract:

```tsx
it("renders only the approved white icon and adaptive wordmarks", () => {
  const { container } = render(<CurrentMark showWordmark />);

  expect(container.querySelectorAll('img[src="/brand/current-icon-white.svg"]')).toHaveLength(1);
  expect(container.querySelectorAll('img[src="/brand/current-logo-black.svg"]')).toHaveLength(1);
  expect(container.querySelectorAll('img[src="/brand/current-logo-white.svg"]')).toHaveLength(1);
  expect(container.querySelector('img[src="/brand/current-icon-color.svg"]')).not.toBeInTheDocument();
  expect(container.querySelector('img[src="/brand/current-logo-color.svg"]')).not.toBeInTheDocument();
});
```

Replace the adaptive-brand assertion in `globals.test.ts` with:

```ts
it("uses black and white wordmarks while keeping the approved white icon visible", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

  expect(css).toMatch(/\.current-brand-asset--wordmark-white\s*\{[\s\S]*?display:\s*none/);
  expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--wordmark-black\s*\{[\s\S]*?display:\s*none/);
  expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--wordmark-white\s*\{[\s\S]*?display:\s*block/);
  expect(css).not.toContain("current-brand-asset--icon-color");
  expect(css).not.toContain("current-brand-asset--wordmark-color");
});
```

Create `src/app/icon.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Current app icon", () => {
  it("matches the approved white icon artwork", () => {
    const appIcon = readFileSync(path.join(process.cwd(), "src/app/icon.svg"), "utf8");
    const approvedIcon = readFileSync(
      path.join(process.cwd(), "public/brand/current-icon-white.svg"),
      "utf8",
    );

    expect(appIcon).toBe(approvedIcon);
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentMark.test.tsx src/app/globals.test.ts src/app/icon.test.ts
```

Expected: FAIL because `CurrentMark` still renders color variants, the old CSS variant selectors are present, and `src/app/icon.svg` still matches the color icon artwork.

- [ ] **Step 3: Implement the minimal identity mapping**

Replace `CurrentMark.tsx` with:

```tsx
interface CurrentMarkProps {
  showWordmark?: boolean;
  className?: string;
}

export function CurrentMark({
  showWordmark = false,
  className = "",
}: CurrentMarkProps) {
  return (
    <span role="img" aria-label="Current" className={`current-identity ${className}`}>
      <span aria-hidden="true" className="current-brand-icon">
        <img
          className="current-brand-asset current-brand-asset--icon-white"
          src="/brand/current-icon-white.svg"
          alt=""
        />
      </span>
      {showWordmark && (
        <span aria-hidden="true" className="current-brand-wordmark">
          <img
            className="current-brand-asset current-brand-asset--wordmark-black"
            src="/brand/current-logo-black.svg"
            alt=""
          />
          <img
            className="current-brand-asset current-brand-asset--wordmark-white"
            src="/brand/current-logo-white.svg"
            alt=""
          />
        </span>
      )}
    </span>
  );
}
```

Replace the old brand-variant rules in `globals.css` with:

```css
.current-brand-asset--wordmark-white { display: none; }

:root[data-appearance="dark"] .current-brand-asset--wordmark-black { display: none; }
:root[data-appearance="dark"] .current-brand-asset--wordmark-white { display: block; }
```

Update both color-wordmark call sites:

```tsx
<CurrentMark showWordmark />
```

Use that exact JSX in `Launchpad.tsx` and `QuickstartInitialView.tsx`, removing `wordmarkTone="color"`.

Make the app icon identical to the approved white-icon asset:

```bash
cp public/brand/current-icon-white.svg src/app/icon.svg
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/components/current/__tests__/CurrentMark.test.tsx src/app/globals.test.ts src/app/icon.test.ts src/components/workspace/__tests__/Launchpad.test.tsx src/components/__tests__/QuickstartInitialView.test.tsx
```

Expected: all five files pass.

- [ ] **Step 5: Audit production identity references**

Run:

```bash
rg -n 'current-(icon|logo)-color|wordmarkTone|current-brand-asset--(?:icon-color|wordmark-color)' src/components src/app/globals.css src/app/icon.svg
```

Expected: no matches. The color SVG files may remain in `public/brand/` as supplied source assets, but no product component or app icon may render them.

- [ ] **Step 6: Commit the identity correction**

```bash
git add src/components/current/CurrentMark.tsx src/components/current/__tests__/CurrentMark.test.tsx src/components/workspace/Launchpad.tsx src/components/quickstart/QuickstartInitialView.tsx src/app/globals.css src/app/globals.test.ts src/app/icon.svg src/app/icon.test.ts
git commit -m "fix(brand): enforce adaptive monochrome identity"
```

### Task 2: Bind the complete React Flow canvas to semantic appearance

**Files:**
- Modify: `src/components/WorkflowCanvas.tsx:2074-2079, 2150-2224`
- Modify: `src/components/__tests__/WorkflowCanvas.test.tsx:190-235, 329, 361, 421, 477, 504, 531, 558, 590`
- Modify: `src/app/globals.css:727-738`
- Modify: `src/app/globals.test.ts:188-200`

- [ ] **Step 1: Write the failing canvas contract and decouple interaction tests from the old utility**

Add this helper near `TestWrapper` in `WorkflowCanvas.test.tsx`:

```tsx
function getCanvasShell() {
  const shell = screen.getByTestId("canvas-workspace").parentElement;
  if (!shell) throw new Error("Missing workflow canvas shell");
  return shell;
}
```

Replace every interaction-test lookup of:

```tsx
document.querySelector(".bg-canvas-bg") as HTMLElement
```

with:

```tsx
getCanvasShell()
```

Add this rendering test:

```tsx
it("binds the shell and React Flow layer to the semantic canvas surface", () => {
  render(
    <TestWrapper>
      <WorkflowCanvas />
    </TestWrapper>,
  );

  expect(getCanvasShell()).toHaveClass("current-canvas-shell");
  expect(getCanvasShell()).not.toHaveClass("bg-canvas-bg");
  expect(document.querySelector(".react-flow")).toHaveClass("current-canvas-flow");
});
```

Extend the existing dark-workspace CSS test in `globals.test.ts` with:

```ts
expect(css).toMatch(/\.current-canvas-shell\s*\{[\s\S]*?background:\s*var\(--current-canvas\)/);
expect(css).toMatch(/\.current-canvas-flow\s*\{[\s\S]*?--xy-background-color:\s*var\(--current-canvas\)/);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx vitest run src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.test.ts
```

Expected: FAIL only on the new semantic canvas assertions because the shell still uses `bg-canvas-bg` and React Flow still uses `bg-neutral-900`.

- [ ] **Step 3: Implement semantic canvas ownership**

In `WorkflowCanvas.tsx`, change the outer shell classes to:

```tsx
className={`current-canvas-shell flex-1 min-h-0 overflow-hidden relative ${
  isDragOver ? "ring-2 ring-inset ring-blue-500" : ""
}`}
```

Change the `ReactFlow` class to:

```tsx
className="current-canvas-flow"
```

Add these rules immediately before the existing `.react-flow` material rule in `globals.css`:

```css
.current-canvas-shell {
  background: var(--current-canvas);
}

.current-canvas-flow {
  --xy-background-color: var(--current-canvas);
}
```

Keep the existing `.react-flow` gradient and `.react-flow__background` rules. The shell prevents light bleed-through, while `--xy-background-color` survives React Flow stylesheet ordering and controls both the root and SVG background layer.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.test.ts
```

Expected: PASS, including the existing panning, drop, and canvas interaction tests that now use `getCanvasShell()`.

- [ ] **Step 5: Audit fixed-light canvas utilities**

Run:

```bash
rg -n 'bg-canvas-bg|className="bg-neutral-900"' src/components/WorkflowCanvas.tsx
```

Expected: no matches.

- [ ] **Step 6: Commit the canvas correction**

```bash
git add src/components/WorkflowCanvas.tsx src/components/__tests__/WorkflowCanvas.test.tsx src/app/globals.css src/app/globals.test.ts
git commit -m "fix(canvas): honor dark appearance across React Flow"
```

### Task 3: Promote Run node to a contextual primary action

**Files:**
- Modify: `src/components/nodes/FloatingNodeHeader.tsx:597-616`
- Modify: `src/components/nodes/__tests__/FloatingNodeHeader.test.tsx:22-44`
- Modify: `src/app/globals.css:999-1018`

- [ ] **Step 1: Write the failing Run-action behavior test**

Add this focused test to `FloatingNodeHeader.test.tsx`:

```tsx
it("presents and invokes Run node as the contextual primary action", () => {
  const onRunNode = vi.fn();
  render(
    <FloatingNodeHeader
      id="generate-1"
      type="nanoBanana"
      position={{ x: 10, y: 20 }}
      width={320}
      selected
      title="Generate Image"
      onRunNode={onRunNode}
    />,
  );

  const run = screen.getByRole("button", { name: "Run this node" });
  expect(run).toHaveClass(
    "current-media-action",
    "current-media-action--primary",
    "current-node-header__run",
  );
  expect(run).not.toHaveClass("text-neutral-500", "border-neutral-600");

  fireEvent.click(run);
  expect(onRunNode).toHaveBeenCalledWith("generate-1");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/components/nodes/__tests__/FloatingNodeHeader.test.tsx
```

Expected: FAIL because the Run button still carries legacy neutral utility classes instead of the three semantic action classes.

- [ ] **Step 3: Apply the semantic Run treatment without changing behavior**

Change only the Run button's `className` in `FloatingNodeHeader.tsx`:

```tsx
className="current-media-action current-media-action--primary current-node-header__run nodrag nopan"
```

Keep `onClick`, `disabled`, `title`, `aria-label`, the play SVG, and the expanding label span unchanged.

Add this layout modifier after the existing primary media-action rules in `globals.css`:

```css
.current-node-header__run {
  display: inline-flex;
  width: auto;
  min-width: 2rem;
  align-items: center;
  gap: 0;
  overflow: hidden;
}

.current-node-header__run:hover:not(:disabled) {
  padding-right: 0.5rem;
}
```

The shared primary modifier supplies cobalt fill, white foreground, hover fill, focus, and disabled behavior. The Run-specific modifier preserves the existing compact icon and expanding label interaction.

- [ ] **Step 4: Run component and contrast tests and verify GREEN**

Run:

```bash
npx vitest run src/components/nodes/__tests__/FloatingNodeHeader.test.tsx src/app/appearance-contract.test.ts src/app/globals.test.ts
```

Expected: PASS. The appearance contract must continue to report at least 4.5:1 between `--current-action-foreground` and `--current-action` in both appearances.

- [ ] **Step 5: Commit the Run-action correction**

```bash
git add src/components/nodes/FloatingNodeHeader.tsx src/components/nodes/__tests__/FloatingNodeHeader.test.tsx src/app/globals.css
git commit -m "fix(nodes): raise Run action contrast"
```

### Task 4: Complete regression and visual verification

**Files:**
- Verify only; modify the relevant task files only if a failing test exposes a missed requirement.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
npm run test:run
```

Expected: all Vitest files and tests pass with no unhandled errors.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js production compilation, TypeScript validation, and static generation complete successfully.

- [ ] **Step 3: Run repository hygiene checks**

Run:

```bash
git diff --check
git status --short
```

Expected: `git diff --check` and `git status --short` both print nothing; production changes should already be in the three atomic commits.

- [ ] **Step 4: Verify the desktop visual matrix in the running product**

Open the development server and inspect these exact states at desktop width:

1. Light launchpad: one `current-icon-white` cobalt tile and a black wordmark.
2. Dark launchpad: the same icon tile and a white wordmark.
3. Light canvas: cool silver surface behind and between nodes.
4. Dark canvas: uninterrupted `#172130` surface behind the dot pattern, nodes, controls, and navigator.
5. Selected generation node in each appearance: cobalt Run control with white play icon and expanded `Run node` label on hover.
6. Keyboard focus and disabled/executing Run states remain distinct and readable.

If a state fails, add a focused failing regression test to the owning task before changing production code, rerun that task's RED-GREEN cycle, and amend only that task's commit.

- [ ] **Step 5: Confirm final commit history and clean worktree**

Run:

```bash
git log --oneline --decorate -5
git status --short --branch
```

Expected: the design and plan documentation commits are followed by three atomic implementation commits, and the worktree is clean.
