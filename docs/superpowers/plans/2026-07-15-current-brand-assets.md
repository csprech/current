# Current Brand Asset Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the provisional Current mark and app icon with the approved, adaptive Current SVGs.

**Architecture:** Keep `CurrentMark` as the one identity API. It renders stable decorative image variants and existing `html[data-appearance]` CSS selects the visible asset, preventing appearance-driven hydration changes.

**Tech Stack:** Next.js App Router, React, CSS, Vitest, SVG.

---

### Task 1: Define the approved asset contract

**Files:**

- Create: `public/brand/current-icon-color.svg`
- Create: `public/brand/current-icon-white.svg`
- Create: `public/brand/current-logo-black.svg`
- Create: `public/brand/current-logo-color.svg`
- Create: `public/brand/current-logo-white.svg`
- Modify: `src/components/current/__tests__/CurrentMark.test.tsx`

- [ ] **Step 1: Write the failing asset-source test**

```tsx
it("exposes approved Current asset variants", () => {
  const { container } = render(<CurrentMark showWordmark />);
  const sources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));
  expect(sources).toEqual(expect.arrayContaining([
    "/brand/current-icon-color.svg",
    "/brand/current-icon-white.svg",
    "/brand/current-logo-black.svg",
    "/brand/current-logo-color.svg",
    "/brand/current-logo-white.svg",
  ]));
});
```

- [ ] **Step 2: Verify it fails before implementation**

Run: `npx vitest run src/components/current/__tests__/CurrentMark.test.tsx`

Expected: FAIL because `CurrentMark` currently contains an inline gradient SVG.

- [ ] **Step 3: Copy the supplied assets into the public bundle**

```bash
mkdir -p public/brand
cp /Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-icon-color.svg public/brand/current-icon-color.svg
cp /Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-icon-white.svg public/brand/current-icon-white.svg
cp /Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-black.svg public/brand/current-logo-black.svg
cp /Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-color.svg public/brand/current-logo-color.svg
cp /Users/craigsprecher/Desktop/NEO-DRIVE/CURRENT_NODES/SVG/current-logo-white.svg public/brand/current-logo-white.svg
```

- [ ] **Step 4: Commit the test and public assets**

```bash
git add public/brand src/components/current/__tests__/CurrentMark.test.tsx
git commit -m "test: define Current brand asset contract"
```

### Task 2: Render the approved assets through CurrentMark

**Files:**

- Modify: `src/components/current/CurrentMark.tsx`
- Modify: `src/components/current/__tests__/CurrentMark.test.tsx`
- Modify: `src/components/workspace/Launchpad.tsx`
- Modify: `src/components/quickstart/QuickstartInitialView.tsx`

- [ ] **Step 1: Replace the inline SVG with stable image variants**

```tsx
export function CurrentMark({ showWordmark = false, wordmarkTone = "adaptive", className = "" }: CurrentMarkProps) {
  return (
<span role="img" aria-label="Current" className={`current-identity ${className}`}>
  <span aria-hidden="true" className="current-brand-icon">
    <img className="current-brand-asset current-brand-asset--icon-color" src="/brand/current-icon-color.svg" alt="" />
    <img className="current-brand-asset current-brand-asset--white" src="/brand/current-icon-white.svg" alt="" />
  </span>
  {showWordmark && <span aria-hidden="true" className={`current-brand-wordmark current-brand-wordmark--${wordmarkTone}`}>
    <img className="current-brand-asset current-brand-asset--black" src="/brand/current-logo-black.svg" alt="" />
    <img className="current-brand-asset current-brand-asset--wordmark-color" src="/brand/current-logo-color.svg" alt="" />
    <img className="current-brand-asset current-brand-asset--white" src="/brand/current-logo-white.svg" alt="" />
  </span>}
</span>
  );
}
```

- [ ] **Step 2: Replace gradient uniqueness assertions with stable accessibility assertions**

```tsx
it("keeps each mark as one accessible identity", () => {
  const { container } = render(<><CurrentMark /><CurrentMark /></>);
  expect(screen.getAllByRole("img", { name: "Current" })).toHaveLength(2);
  expect(container.querySelectorAll("linearGradient")).toHaveLength(0);
});
```

- [ ] **Step 3: Verify CurrentMark passes**

Run: `npx vitest run src/components/current/__tests__/CurrentMark.test.tsx`

Expected: PASS with the correct public sources and one accessible name per mark.

- [ ] **Step 4: Add a `wordmarkTone` prop and use it for spacious identity surfaces**

```tsx
interface CurrentMarkProps {
  showWordmark?: boolean;
  wordmarkTone?: "adaptive" | "color";
  className?: string;
}

<CurrentMark showWordmark wordmarkTone="color" />
```

Pass `wordmarkTone="color"` from `Launchpad.tsx` and `QuickstartInitialView.tsx`. Keep the command bar on the default adaptive wordmark.

- [ ] **Step 5: Commit the identity implementation**

```bash
git add src/components/current/CurrentMark.tsx src/components/current/__tests__/CurrentMark.test.tsx src/components/workspace/Launchpad.tsx src/components/quickstart/QuickstartInitialView.tsx
git commit -m "feat(brand): use approved Current identity assets"
```

### Task 3: Select variants through appearance CSS

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/app/globals.test.ts`

- [ ] **Step 1: Write the failing CSS contract**

```ts
expect(css).toMatch(/\.current-brand-asset--white\s*\{[^}]*display:\s*none/);
expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--icon-color\s*\{[^}]*display:\s*none/);
expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--white\s*\{[^}]*display:\s*block/);
```

- [ ] **Step 2: Verify the CSS test fails**

Run: `npx vitest run src/app/globals.test.ts`

Expected: FAIL because the provisional `.current-mark` styles remain.

- [ ] **Step 3: Add the adaptive dimensions and selectors**

```css
.current-brand-icon { display: grid; width: 2rem; height: 2rem; }
.current-brand-wordmark { width: 6.5rem; height: 1.5rem; }
.current-brand-asset { width: 100%; height: 100%; object-fit: contain; }
.current-brand-asset--white { display: none; }
.current-brand-asset--wordmark-color { display: none; }
.current-brand-wordmark--color .current-brand-asset--black { display: none; }
.current-brand-wordmark--color .current-brand-asset--wordmark-color { display: block; }
:root[data-appearance="dark"] .current-brand-asset--icon-color,
:root[data-appearance="dark"] .current-brand-asset--wordmark-color,
:root[data-appearance="dark"] .current-brand-asset--black { display: none; }
:root[data-appearance="dark"] .current-brand-asset--white { display: block; }
```

- [ ] **Step 4: Verify the CSS and CurrentMark tests pass**

Run: `npx vitest run src/app/globals.test.ts src/components/current/__tests__/CurrentMark.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit adaptive appearance support**

```bash
git add src/app/globals.css src/app/globals.test.ts
git commit -m "feat(brand): adapt Current assets by appearance"
```

### Task 4: Replace the installed-app icon and verify consumers

**Files:**

- Modify: `src/app/icon.svg`

- [ ] **Step 1: Replace the app icon from the canonical public asset**

```bash
cp public/brand/current-icon-color.svg src/app/icon.svg
```

- [ ] **Step 2: Run focused consumers and the production build**

Run: `npx vitest run src/components/current/__tests__/CurrentMark.test.tsx src/components/workspace/__tests__/CurrentCommandBar.test.tsx src/components/workspace/__tests__/Launchpad.test.tsx && npm run build`

Expected: all focused tests pass and the build completes.

- [ ] **Step 3: Visually verify both appearances**

Confirm that command bar, launchpad, onboarding, and browser icon use supplied assets. Light uses black or color variants, dark uses white variants, and the app icon always uses the color icon.

- [ ] **Step 4: Commit and publish**

```bash
git add src/app/icon.svg public/brand
git commit -m "feat(brand): adopt approved Current app icon"
git push current HEAD:main
```
