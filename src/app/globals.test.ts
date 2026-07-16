import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Current Add Palette brand colors", () => {
  it("uses the approved Current accent and focus tokens", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const palette = css.slice(css.indexOf("/* Current Add Palette */"));
    expect(palette).toContain("var(--current-blue)");
    expect(palette).toContain("var(--current-focus)");
    expect(palette).not.toMatch(/#8b78c8|#e7e3f2|#4d3e77|#4f3b7d|225, 219, 241|237, 234, 245/);
  });

  it("keeps the focused-workspace back control legible on the dark command bar", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.current-focus-workspace__back\s*\{[\s\S]*?color:\s*var\(--current-paper\)/);
    expect(css).toMatch(/\.current-focus-workspace__back:hover:not\(:disabled\)\s*\{[\s\S]*?var\(--current-blue\)/);
    expect(css).toMatch(/\.current-focus-workspace__back:focus-visible\s*\{[\s\S]*?var\(--current-focus\)/);
  });

  it("distinguishes keyboard focus from node selection and disables continuous motion", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.react-flow__node:focus-visible \.current-node\s*\{[\s\S]*?outline:[\s\S]*?var\(--current-aqua\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.current-connector-pulse[\s\S]*?animation:\s*none/);
  });

  it("uses a root appearance selector so the dark palette reaches the entire workspace", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:root\[data-appearance="dark"\]\s*\{[\s\S]*?--background:\s*#172130[\s\S]*?--current-paper:\s*#1d2a3b[\s\S]*?--current-canvas:\s*#172130[\s\S]*?--current-divider:\s*#2f435b[\s\S]*?--current-graphite:\s*#b6c2d2[\s\S]*?--current-minimap-neutral:\s*#59708a/);
  });

  it("gives the dark workspace navy canvas, controls, and action states", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/current-command-bar\s*\{[\s\S]*?background:\s*#1d2a3b/);
    expect(css).toMatch(/current-button--secondary\s*\{[\s\S]*?background:\s*#26384e/);
    expect(css).toMatch(/current-button--secondary:hover:not\(:disabled\)\s*\{[\s\S]*?background:\s*#344b66/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.react-flow\s*\{[\s\S]*?#172130/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.react-flow__controls\s*\{[\s\S]*?background:\s*#26384e/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.react-flow__controls-button:hover\s*\{[\s\S]*?background:\s*#344b66/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-media-action,[\s\S]*?background:\s*#26384e/);
    expect(css).toMatch(/current-media-action:hover:not\(:disabled\)[\s\S]*?background:\s*#344b66/);
  });

  it("uses navy dark surfaces without a top-edge node highlight", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const darkNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node\s*\{([^}]*)\}/)?.[1];
    const darkHoverNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node:hover\s*\{([^}]*)\}/)?.[1];
    const darkRunningNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node\[data-state="running"\]\s*\{([^}]*)\}/)?.[1];
    const darkErrorNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node\[data-state="error"\]\s*\{([^}]*)\}/)?.[1];
    const darkSelectedClassNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node--selected[\s\S]*?\{([^}]*)\}/)?.[1];
    const darkSelectedDataNodeRule = css.match(/:root\[data-appearance="dark"\] \.current-node\[data-selected="true"\][\s\S]*?\{([^}]*)\}/)?.[1];
    const darkRunningKeyframes = css.match(/@keyframes current-node-breathe\s*\{([\s\S]*?)^\}/m)?.[1];
    const whiteInsetHighlight = /inset\s+0\s+0\.5px\s+0\s+(?:rgba?\(\s*255(?:\s*,\s*|\s+)255(?:\s*,\s*|\s+)255\b|#(?:fff|ffffff)\b|white\b)/i;

    expect(css).toMatch(/:root\[data-appearance="dark"\]\s*\{[\s\S]*?--current-canvas:\s*#172130/);
    expect(darkNodeRule).toBeDefined();
    expect(darkHoverNodeRule).toBeDefined();
    expect(darkRunningNodeRule).toBeDefined();
    expect(darkErrorNodeRule).toBeDefined();
    expect(darkSelectedClassNodeRule).toBeDefined();
    expect(darkSelectedDataNodeRule).toBeDefined();
    expect(darkRunningKeyframes).toBeDefined();
    expect(darkNodeRule).toMatch(/border:\s*1px solid #2f435b/);
    expect(darkNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkHoverNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkRunningNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkErrorNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkSelectedClassNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkSelectedDataNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkRunningKeyframes).not.toMatch(whiteInsetHighlight);
  });

  it("keeps launchpad copy and recent projects legible in dark appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-launchpad\s*\{[\s\S]*?color:\s*#f5f5f7/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-launchpad__intro h1\s*\{[\s\S]*?color:\s*#f5f5f7/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-launchpad__description\s*\{[\s\S]*?color:\s*#b6c2d2/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-launchpad__recents button\s*\{[\s\S]*?color:\s*#e7edf5/);
  });

  it("gives the dark navigator a navy surface without a bright keyline", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:root\[data-appearance="dark"\] \.react-flow__minimap\.current-transient-surface\s*\{[\s\S]*?background:\s*#1d2a3b/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.react-flow__minimap\.current-transient-surface\s*\{[\s\S]*?border:\s*none/);
  });

  it("uses appearance-aware ink and action surfaces in the workflow browser", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-workflow-browser\s*\{[\s\S]*?color:\s*var\(--current-inspector\)/);
    expect(css).toMatch(/\.current-workflow-browser \.text-neutral-100,[\s\S]*?color:\s*var\(--current-inspector\)/);
    expect(css).toMatch(/\.current-workflow-browser \.text-neutral-300,[\s\S]*?color:\s*var\(--current-graphite\)/);
    expect(css).toMatch(/\.current-workflow-browser__directory-action\s*\{[\s\S]*?background:\s*var\(--current-canvas\)/);
  });
});
