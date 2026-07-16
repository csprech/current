# Current GitHub Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished, repository-local Current GitHub header that presents the approved white Current wordmark over an Infinite Canvas visual without changing existing README content.

**Architecture:** Generate a text-free 3:1 navy Infinite Canvas background, then composite the approved `current-logo-white.svg` as a vector-rendered overlay so the brand geometry and white color remain exact. A small filesystem-based Vitest contract verifies that the checked-in PNG exists at the documented path, has the expected 3:1 dimensions, and is embedded above the README title.

**Tech Stack:** GitHub-flavored Markdown, PNG, approved SVG brand asset, Node.js, Sharp, Vitest.

---

### Task 1: Add the Current GitHub-header contract and final composition

**Files:**
- Create: `src/app/readme-header.test.ts`
- Create: `public/brand/current-github-header.png`
- Modify: `README.md:1`
- Read: `public/brand/current-logo-white.svg`

- [ ] **Step 1: Write the failing README/header contract test**

Create `src/app/readme-header.test.ts` with this complete test. It verifies the asset that GitHub will serve, its exact 3:1 GitHub-friendly crop, and the Markdown placement without coupling the README's existing prose to the image implementation.

```ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const headerPath = path.join(root, "public/brand/current-github-header.png");
const readmePath = path.join(root, "README.md");

describe("Current GitHub header", () => {
  it("ships a 3:1 branded header and embeds it before the README title", async () => {
    expect(fs.existsSync(headerPath)).toBe(true);

    const metadata = await sharp(headerPath).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1800);
    expect(metadata.height).toBe(600);

    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toMatch(
      /^<p align="center">\n  <img src="\.\/public\/brand\/current-github-header\.png" alt="Current" width="100%" \/>\n<\/p>\n\n# Current\n/
    );
  });
});
```

- [ ] **Step 2: Run the focused test to confirm the contract fails before the asset exists**

Run:

```bash
npx vitest run src/app/readme-header.test.ts
```

Expected: FAIL because `public/brand/current-github-header.png` does not exist and the header image markup is not yet at the top of `README.md`.

- [ ] **Step 3: Generate the text-free Infinite Canvas background**

Use the image-generation tool to create a single wide background. The generated image must contain no text, wordmark, logo, watermark, user-interface labels, badges, or people. The image must leave the left third quiet for the approved vector wordmark.

```text
Use case: stylized concept
Asset type: wide GitHub repository header background for Current, a desktop node-based creative AI workflow product.

Primary request: An abstract infinite canvas rendered as refined high-end product art. Use a deep Current navy backdrop (#172130), a very subtle blueprint grid of tiny muted-blue dots, two delicate flowing connectors crossing the center and right in Current blue (#5578f6) and aqua (#47cbb3), and three to five quiet translucent navy node surfaces suspended within the canvas.

Style: immaculate editorial product art, restrained depth, soft bloom, slight film grain, and no literal application screenshot.

Composition: wide 3:1 landscape. Preserve open low-detail negative space in the left third for a logo. Put the visual energy in the center and right.

Constraints: no text, letters, words, logos, watermark, UI labels, people, platform badges, or third-party marks. Do not draw a logo. Preserve dark navy contrast.
```

Inspect the generated image before use. Move the approved background image to `public/brand/current-github-header-background.png` temporarily; it is an intermediate compositing input and must be deleted after the final PNG is produced.

- [ ] **Step 4: Composite the exact approved white wordmark and produce the final 1800×600 PNG**

Run this script from the repository root. It scales the generated background to the planned 3:1 output, rasterizes the supplied `current-logo-white.svg` at 360 pixels wide, centers that exact asset vertically in the reserved left space, and removes the temporary background afterward.

```bash
node --input-type=module <<'NODE'
import fs from "node:fs";
import sharp from "sharp";

const backgroundPath = "public/brand/current-github-header-background.png";
const wordmarkPath = "public/brand/current-logo-white.svg";
const outputPath = "public/brand/current-github-header.png";

const wordmark = await sharp(wordmarkPath)
  .resize({ width: 360 })
  .png()
  .toBuffer();

await sharp(backgroundPath)
  .resize({ width: 1800, height: 600, fit: "cover", position: "centre" })
  .composite([{ input: wordmark, left: 132, top: 265 }])
  .png()
  .toFile(outputPath);

fs.rmSync(backgroundPath);
NODE
```

- [ ] **Step 5: Add the responsive README image without changing existing README sections**

Insert this exact block immediately before the existing `# Current` heading in `README.md`. Do not edit any of the existing title, product copy, setup instructions, tables, or license text.

```md
<p align="center">
  <img src="./public/brand/current-github-header.png" alt="Current" width="100%" />
</p>

# Current
```

- [ ] **Step 6: Run the focused contract test and inspect the finished image**

Run:

```bash
npx vitest run src/app/readme-header.test.ts
sips -g pixelWidth -g pixelHeight public/brand/current-github-header.png
```

Expected: Vitest reports one passing test. `sips` reports `pixelWidth: 1800` and `pixelHeight: 600`. Visually inspect the file to confirm the left-side wordmark is crisp, all generated regions remain text-free, and the navy dotted canvas, blue connector, aqua connector, and restrained node surfaces remain legible at a narrow preview size.

- [ ] **Step 7: Run the production build, review the diff, and commit the header**

Run:

```bash
npm run build
git diff --check
git status --short
git add README.md public/brand/current-github-header.png src/app/readme-header.test.ts
git commit -m "docs: add Current GitHub header"
```

Expected: the production build completes successfully, whitespace validation is silent, the temporary `current-github-header-background.png` is absent, and the commit contains only the README embedding, final PNG, and contract test.

### Task 2: Publish the professional README header to the Current repository

**Files:**
- Read: `README.md`
- Read: `public/brand/current-github-header.png`

- [ ] **Step 1: Confirm the committed repository state is the intended public scope**

Run:

```bash
git show --stat --oneline HEAD
git status --short
```

Expected: `HEAD` is `docs: add Current GitHub header`; its stat lists `README.md`, `public/brand/current-github-header.png`, and `src/app/readme-header.test.ts`; the working tree is clean.

- [ ] **Step 2: Publish the current feature work to the authorized Current repository default branch**

Run:

```bash
git push current HEAD:main
```

Expected: GitHub accepts the push to `https://github.com/csprech/current.git`; no `origin`, `develop`, or unrelated remote is pushed.

## Plan self-review

- **Spec coverage:** Task 1 implements the approved Infinite Canvas atmosphere, Current navy palette, exact white wordmark, 3:1 composition, GitHub-local image path, and README placement. Task 2 publishes the finished repository state to the authorized Current remote.
- **Placeholder scan:** The plan uses exact repository paths, an exact image-generation prompt, precise Sharp dimensions and placement, and concrete validation commands. The generated background source is deliberately temporary, because the checked-in final composition is the required repository deliverable.
- **Type consistency:** The Vitest contract references the same `public/brand/current-github-header.png` path and `1800 × 600` output created by the compositing step and embedded by the README step.

