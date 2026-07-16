import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Current Add Palette brand colors", () => {
  it("defines adaptive semantic roles and keeps primary actions independent from paper", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const lightTheme = css.match(/\n:root\s*\{([\s\S]*?)\n\}/)?.[1];
    const darkTheme = css.match(/:root\[data-appearance="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1];
    const primaryButton = css.match(/\.current-button--primary\s*\{([^}]*)\}/)?.[1];

    for (const theme of [lightTheme, darkTheme]) {
      expect(theme).toContain("--current-surface-chrome:");
      expect(theme).toContain("--current-surface-panel:");
      expect(theme).toContain("--current-surface-elevated:");
      expect(theme).toContain("--current-surface-control:");
      expect(theme).toContain("--current-text-primary:");
      expect(theme).toContain("--current-action:");
      expect(theme).toContain("--current-action-foreground:");
      expect(theme).toContain("--current-border-strong:");
    }

    expect(primaryButton).toContain("color: var(--current-action-foreground)");
    expect(primaryButton).toContain("background: var(--current-action)");
    expect(primaryButton).not.toContain("var(--current-paper)");
  });

  it("uses semantic roles for shared controls and transient surfaces", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const button = css.match(/\.current-button\s*\{([^}]*)\}/)?.[1];
    const secondary = css.match(/\.current-button--secondary\s*\{([^}]*)\}/)?.[1];
    const iconButton = css.match(/\.current-icon-button\s*\{([^}]*)\}/)?.[1];
    const segmented = css.match(/\.current-segmented-control\s*\{([^}]*)\}/)?.[1];
    const selectedSegment = css.match(/\.current-segmented-control button\[aria-pressed="true"\]\s*\{([^}]*)\}/)?.[1];
    const panel = css.match(/\.current-panel\s*\{([^}]*)\}/)?.[1];
    const sheet = css.match(/\.current-sheet\s*\{([^}]*)\}/)?.[1];

    expect(button).toContain("min-height: 2.125rem");
    expect(button).toContain("box-shadow 160ms ease");
    expect(secondary).toContain("color: var(--current-text-primary)");
    expect(secondary).toContain("background: var(--current-surface-control)");
    expect(secondary).toContain("border-color: var(--current-border)");
    expect(iconButton).toContain("color: var(--current-text-primary)");
    expect(segmented).toContain("background: var(--current-surface-control)");
    expect(selectedSegment).toContain("background: var(--current-surface-elevated)");
    expect(panel).toContain("color: var(--current-text-primary)");
    expect(panel).toContain("background: var(--current-surface-panel)");
    expect(sheet).toContain("color: var(--current-text-primary)");
    expect(sheet).toContain("background: var(--current-surface-elevated)");
    expect(css).toMatch(/\.current-icon-button\[aria-pressed="true"\][\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/\.current-inline-notice--error\s*\{[\s\S]*?var\(--current-status-danger\)/);
    expect(css).toMatch(/\.current-inline-notice--warning\s*\{[\s\S]*?var\(--current-status-warning\)/);
    expect(css).toMatch(/\.current-inline-notice--success\s*\{[\s\S]*?var\(--current-status-success\)/);
    expect(css).toMatch(/\.current-inline-notice--info\s*\{[\s\S]*?var\(--current-status-info\)/);
  });

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
    expect(css).toMatch(/current-button--secondary\s*\{[\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/current-button--secondary:hover:not\(:disabled\)\s*\{[\s\S]*?background:\s*var\(--current-surface-control-hover\)/);
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

  it("keeps quickstart detail surfaces on the Current navy palette in dark appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-launchpad__detail \.text-neutral-100,[\s\S]*?color:\s*#f5f5f7/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-quickstart-view input,[\s\S]*?background:\s*#172130/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-template-card\s*\{[\s\S]*?background:\s*#1d2a3b/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-template-explorer aside\s*\{[\s\S]*?background:\s*#172130/);
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

  it("uses the Current navy hierarchy for the inspector", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-panel\[data-side="right"\]\s*\{[\s\S]*?background:\s*linear-gradient\(180deg, #1b2a3e 0%, #111c2b 100%\)/);
    expect(css).toMatch(/\.current-panel\[data-side="right"\]\s*\{[\s\S]*?border-left:\s*1px solid #2f435b/);
    expect(css).toMatch(/\.current-inspector__field,[\s\S]*?background:\s*#223247/);
    expect(css).toMatch(/\.current-inspector__browse\s*\{[\s\S]*?background:\s*#26384e/);
  });

  it("keeps group action icons legible in both appearances", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-selection-toolbar \.current-toolbar-action\s*\{[\s\S]*?color:\s*var\(--current-graphite\)/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-selection-toolbar\.current-transient-surface\s*\{[\s\S]*?background:\s*#1d2a3b/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-selection-toolbar \.current-toolbar-action\s*\{[\s\S]*?color:\s*#e7edf5/);
    expect(css).toMatch(/\.current-selection-toolbar__separator\s*\{[\s\S]*?background:\s*var\(--current-divider\)/);
  });

  it("adapts the supplied Current assets to the active appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-brand-asset--white\s*\{[\s\S]*?display:\s*none/);
    expect(css).toMatch(/\.current-brand-wordmark--color \.current-brand-asset--black\s*\{[\s\S]*?display:\s*none/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--icon-color,[\s\S]*?display:\s*none/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--white\s*\{[\s\S]*?display:\s*block/);
  });
});
