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

  it("keeps media overlay actions legible instead of inheriting the adaptive paper color", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const overlayAction = css.match(/\.current-media-action--overlay\s*\{([^}]*)\}/)?.[1];

    expect(overlayAction).toContain("color: var(--current-media-overlay-foreground)");
    expect(overlayAction).toContain("var(--current-media-overlay)");
    expect(overlayAction).toContain("var(--current-media-overlay-border)");
    expect(overlayAction).toContain("opacity: 1");
    expect(overlayAction).not.toContain("var(--current-paper)");
  });

  it("uses adaptive semantic roles across the core workspace", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const commandBar = css.match(/\.current-command-bar\s*\{([^}]*)\}/)?.[1];
    const canvas = css.match(/\/\* The stage[\s\S]*?\.react-flow\s*\{([^}]*)\}/)?.[1];
    const edge = css.match(/\.react-flow__edge-path\s*\{([^}]*)\}/)?.[1];
    const controls = css.match(/\.react-flow__controls\s*\{([^}]*)\}/)?.[1];
    const minimap = css.match(/\.react-flow__minimap\.current-transient-surface\s*\{([^}]*)\}/)?.[1];
    const node = css.match(/\/\* Current node chassis[\s\S]*?\.current-node\s*\{([^}]*)\}/)?.[1];
    const footer = css.match(/\.current-node-status\s*\{([^}]*)\}/)?.[1];
    const inspector = css.match(/\.current-panel\[data-side="right"\]\s*\{([^}]*)\}/)?.[1];
    const inspectorField = css.match(/\.current-inspector__field,[\s\S]*?\{([^}]*)\}/)?.[1];
    const inspectorRun = css.match(/\.current-inspector__run\s*\{([^}]*)\}/)?.[1];

    expect(commandBar).toContain("color: var(--current-text-primary)");
    expect(commandBar).toContain("background: var(--current-surface-chrome)");
    expect(commandBar).toContain("border-bottom: 1px solid var(--current-border)");
    expect(canvas).toContain("var(--current-canvas)");
    expect(edge).toContain("opacity: 0.78");
    expect(edge).toContain("opacity 160ms ease");
    expect(controls).toContain("background: var(--current-surface-elevated)");
    expect(controls).toContain("border: 1px solid var(--current-border)");
    expect(minimap).toContain("background: var(--current-surface-elevated)");
    expect(node).toContain("background: var(--current-surface-elevated)");
    expect(node).toContain("border: 1px solid var(--current-border)");
    expect(footer).toContain("background: var(--current-surface-panel)");
    expect(footer).toContain("cursor: grab");
    expect(inspector).toContain("background: var(--current-surface-panel)");
    expect(inspector).toContain("border-left: 1px solid var(--current-border)");
    expect(inspectorField).toContain("color: var(--current-text-primary)");
    expect(inspectorField).toContain("background: var(--current-surface-control)");
    expect(inspectorRun).toContain("color: var(--current-action-foreground)");
    expect(inspectorRun).toContain("background: var(--current-action)");
  });

  it("uses adaptive semantic roles across secondary product surfaces", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const addPalette = css.match(/\n\.current-add-palette\s*\{([^}]*)\}/)?.[1];
    const addSearch = css.match(/\.current-add-palette__search\s*\{([^}]*)\}/)?.[1];
    const focusWorkspace = css.match(/\.current-focus-workspace\s*\{([^}]*)\}/)?.[1];
    const focusBar = css.match(/\.current-focus-workspace__bar\s*\{([^}]*)\}/)?.[1];
    const launchpad = css.match(/\.current-launchpad\s*\{([^}]*)\}/)?.[1];
    const launchRoute = css.match(/\.current-launchpad__route\s*\{([^}]*)\}/)?.[1];
    const launchDetail = css.match(/\.current-launchpad__detail\s*\{([^}]*)\}/)?.[1];
    const quickstart = css.match(/\.current-quickstart-view\s*\{([^}]*)\}/)?.[1];
    const templateCard = css.match(/\.current-template-card\s*\{([^}]*)\}/)?.[1];
    const templateSidebar = css.match(/\.current-template-explorer aside\s*\{([^}]*)\}/)?.[1];
    const outputs = css.match(/\.current-outputs\s*\{([^}]*)\}/)?.[1];
    const outputCard = css.match(/\.current-output-card\s*\{([^}]*)\}/)?.[1];
    const proposalItem = css.match(/\.current-workflow-proposal li\s*\{([^}]*)\}/)?.[1];
    const ftux = css.match(/\.current-ftux\s*\{([^}]*)\}/)?.[1];
    const runOptions = css.match(/\.current-run-control__options\s*\{([^}]*)\}/)?.[1];
    const runValidation = css.match(/\.current-run-control__validation\s*\{([^}]*)\}/)?.[1];

    expect(addPalette).toContain("color: var(--current-text-primary)");
    expect(addPalette).toContain("background: var(--current-surface-elevated)");
    expect(addPalette).toContain("border: 1px solid var(--current-border)");
    expect(addSearch).toContain("background: var(--current-surface-control)");
    expect(focusWorkspace).toContain("color: var(--current-text-primary)");
    expect(focusWorkspace).toContain("background: var(--current-canvas)");
    expect(focusBar).toContain("background: var(--current-surface-chrome)");
    expect(launchpad).toContain("color: var(--current-text-primary)");
    expect(launchpad).toContain("var(--current-canvas)");
    expect(launchRoute).toContain("background: var(--current-surface-elevated)");
    expect(launchDetail).toContain("background: var(--current-surface-elevated)");
    expect(quickstart).toContain("color: var(--current-text-primary)");
    expect(templateCard).toContain("background: var(--current-surface-elevated)");
    expect(templateSidebar).toContain("background: var(--current-surface-panel)");
    expect(outputs).toContain("color: var(--current-text-primary)");
    expect(outputs).toContain("background: var(--current-canvas)");
    expect(outputCard).toContain("background: var(--current-surface-elevated)");
    expect(proposalItem).toContain("background: var(--current-surface-elevated)");
    expect(ftux).toContain("color: var(--current-text-primary)");
    expect(runOptions).toContain("color: var(--current-action-foreground)");
    expect(runOptions).toContain("background: var(--current-action)");
    expect(runValidation).toContain("color: var(--current-status-danger)");
    expect(runValidation).toContain("var(--current-surface-elevated)");
  });

  it("gives add-palette category labels comfortable pill padding", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-add-palette__categories button\s*\{[^}]*padding:\s*8px 14px/);
  });

  it("bounds launchpad detail views so template results own vertical scrolling", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const launchpadDetail = css.match(/\.current-launchpad__detail\s*\{([^}]*)\}/)?.[1];
    const templateResults = css.match(/\.current-template-explorer__results\s*\{([^}]*)\}/)?.[1];

    expect(launchpadDetail).toMatch(/(?:^|;)\s*height:\s*calc\(100% - 96px\)/);
    expect(templateResults).toContain("min-height: 0");
    expect(templateResults).toContain("overflow-y: auto");
  });

  it("keeps adaptive chrome free of fixed light-only and dark-only color bypasses", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-project__trigger:hover\s*\{[^}]*var\(--current-surface-control-hover\)/);
    expect(css).toMatch(/\.current-activity__row\s*\{[^}]*border:\s*1px solid var\(--current-border\)/);
    expect(css).toMatch(/\.current-activity__row p\s*\{[^}]*color:\s*var\(--current-status-danger\)/);
    expect(css).toMatch(/\.current-activity__row > span\s*\{[^}]*color:\s*var\(--current-text-tertiary\)/);
    expect(css).toMatch(/\.current-output-thumbnail-size input::-(?:webkit-slider-thumb|moz-range-thumb)\s*\{[^}]*var\(--current-shadow\)/);
    expect(css).toMatch(/\.current-settings-tabs__tab\[aria-pressed="true"\]\s*\{[^}]*var\(--current-shadow\)/);
    expect(css).toMatch(/\.current-toast--success\s*\{[^}]*color:\s*var\(--current-status-success\)/);
    expect(css).toMatch(/\.current-toast--warning\s*\{[^}]*color:\s*var\(--current-status-warning\)/);
    expect(css).toMatch(/\.current-toast--error\s*\{[^}]*color:\s*var\(--current-status-danger\)/);
    expect(css).toMatch(/\.react-flow__handle\s*\{[^}]*border:\s*2px solid var\(--current-surface-elevated\)/);
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
    expect(css).toMatch(/\.current-focus-workspace__back\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-focus-workspace__back:hover:not\(:disabled\)\s*\{[\s\S]*?var\(--current-surface-control-hover\)/);
    expect(css).toMatch(/\.current-focus-workspace__back:focus-visible\s*\{[\s\S]*?var\(--current-focus\)/);
  });

  it("distinguishes keyboard focus from node selection and disables continuous motion", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.react-flow__node:focus-visible \.current-node\s*\{[\s\S]*?outline:[\s\S]*?var\(--current-aqua\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.current-connector-pulse[\s\S]*?animation:\s*none/);
  });

  it("removes nonessential motion globally when the system requests it", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{([\s\S]*?)\n\s*\}\s*\}/)?.[1];

    expect(reducedMotion).toContain("scroll-behavior: auto !important");
    expect(reducedMotion).toContain("animation-duration: 0.01ms !important");
    expect(reducedMotion).toContain("animation-iteration-count: 1 !important");
    expect(reducedMotion).toContain("transition-duration: 0.01ms !important");
  });

  it("uses a root appearance selector so the dark palette reaches the entire workspace", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/:root\[data-appearance="dark"\]\s*\{[\s\S]*?--background:\s*#172130[\s\S]*?--current-paper:\s*#1d2a3b[\s\S]*?--current-canvas:\s*#172130[\s\S]*?--current-divider:\s*#2f435b[\s\S]*?--current-graphite:\s*#b6c2d2[\s\S]*?--current-minimap-neutral:\s*#59708a/);
  });

  it("gives the dark workspace navy canvas, controls, and action states", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/current-command-bar\s*\{[\s\S]*?background:\s*var\(--current-surface-chrome\)/);
    expect(css).toMatch(/current-button--secondary\s*\{[\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/current-button--secondary:hover:not\(:disabled\)\s*\{[\s\S]*?background:\s*var\(--current-surface-control-hover\)/);
    expect(css).toMatch(/:root\[data-appearance="dark"\]\s*\{[\s\S]*?--current-canvas:\s*#172130/);
    expect(css).toMatch(/\.current-canvas-shell\s*\{[^}]*background:\s*var\(--current-canvas\)/);
    expect(css).toMatch(/\.current-canvas-flow\s*\{[^}]*--xy-background-color:\s*var\(--current-canvas\)/);
    expect(css).toMatch(/\.react-flow\s*\{[\s\S]*?var\(--current-canvas\)/);
    expect(css).toMatch(/\.react-flow__controls\s*\{[\s\S]*?background:\s*var\(--current-surface-elevated\)/);
    expect(css).toMatch(/\.react-flow__controls-button:hover\s*\{[\s\S]*?background:\s*var\(--current-surface-control-hover\)/);
    expect(css).toMatch(/\.current-media-action\s*\{[\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/current-media-action:hover:not\(:disabled\)[\s\S]*?background:\s*var\(--current-surface-control-hover\)/);
  });

  it("uses navy dark surfaces without a top-edge node highlight", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const nodeRule = css.match(/\/\* Current node chassis[\s\S]*?\.current-node\s*\{([^}]*)\}/)?.[1];
    const hoverNodeRule = css.match(/\.current-node:hover\s*\{([^}]*)\}/)?.[1];
    const runningNodeRule = css.match(/\.current-node\[data-state="running"\]\s*\{([^}]*)\}/)?.[1];
    const errorNodeRule = css.match(/\.current-node\[data-state="error"\]\s*\{([^}]*)\}/)?.[1];
    const selectedNodeRule = css.match(/\.current-node--selected,[\s\S]*?\{([^}]*)\}/)?.[1];
    const darkRunningKeyframes = css.match(/@keyframes current-node-breathe\s*\{([\s\S]*?)^\}/m)?.[1];
    const whiteInsetHighlight = /inset\s+0\s+0\.5px\s+0\s+(?:rgba?\(\s*255(?:\s*,\s*|\s+)255(?:\s*,\s*|\s+)255\b|#(?:fff|ffffff)\b|white\b)/i;

    expect(css).toMatch(/:root\[data-appearance="dark"\]\s*\{[\s\S]*?--current-canvas:\s*#172130/);
    expect(nodeRule).toBeDefined();
    expect(hoverNodeRule).toBeDefined();
    expect(runningNodeRule).toBeDefined();
    expect(errorNodeRule).toBeDefined();
    expect(selectedNodeRule).toBeDefined();
    expect(darkRunningKeyframes).toBeDefined();
    expect(nodeRule).toMatch(/border:\s*1px solid var\(--current-border\)/);
    expect(nodeRule).not.toMatch(whiteInsetHighlight);
    expect(hoverNodeRule).not.toMatch(whiteInsetHighlight);
    expect(runningNodeRule).not.toMatch(whiteInsetHighlight);
    expect(errorNodeRule).not.toMatch(whiteInsetHighlight);
    expect(selectedNodeRule).not.toMatch(whiteInsetHighlight);
    expect(darkRunningKeyframes).not.toMatch(whiteInsetHighlight);
  });

  it("keeps launchpad copy and recent projects legible in dark appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-launchpad\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-launchpad__intro h1\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-launchpad__description\s*\{[\s\S]*?color:\s*var\(--current-text-secondary\)/);
    expect(css).toMatch(/\.current-launchpad__recents button\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
  });

  it("keeps quickstart detail surfaces on the Current navy palette in dark appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-launchpad__detail \.text-neutral-100,[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-quickstart-view input,[\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/\.current-template-card\s*\{[\s\S]*?background:\s*var\(--current-surface-elevated\)/);
    expect(css).toMatch(/\.current-template-explorer aside\s*\{[\s\S]*?background:\s*var\(--current-surface-panel\)/);
  });

  it("gives the dark navigator a navy surface without a bright keyline", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.react-flow__minimap\.current-transient-surface\s*\{[\s\S]*?background:\s*var\(--current-surface-elevated\)/);
    expect(css).toMatch(/\.react-flow__minimap\.current-transient-surface\s*\{[\s\S]*?border:\s*1px solid var\(--current-border\)/);
  });

  it("uses appearance-aware ink and action surfaces in the workflow browser", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-workflow-browser\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-workflow-browser \.text-neutral-100,[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-workflow-browser \.text-neutral-300,[\s\S]*?color:\s*var\(--current-text-secondary\)/);
    expect(css).toMatch(/\.current-workflow-browser__directory-action\s*\{[\s\S]*?background:\s*var\(--current-surface-control\)/);
  });

  it("uses the Current navy hierarchy for the inspector", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-panel\[data-side="right"\]\s*\{[\s\S]*?background:\s*var\(--current-surface-panel\)/);
    expect(css).toMatch(/\.current-panel\[data-side="right"\]\s*\{[\s\S]*?border-left:\s*1px solid var\(--current-border\)/);
    expect(css).toMatch(/\.current-inspector__field,[\s\S]*?background:\s*var\(--current-surface-control\)/);
    expect(css).toMatch(/\.current-inspector__browse\s*\{[\s\S]*?background:\s*var\(--current-surface-control\)/);
  });

  it("keeps group action icons legible in both appearances", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-selection-toolbar \.current-toolbar-action\s*\{[\s\S]*?color:\s*var\(--current-text-primary\)/);
    expect(css).toMatch(/\.current-transient-surface\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--current-surface-elevated\)/);
    expect(css).toMatch(/\.current-selection-toolbar \.current-toolbar-action:hover:not\(:disabled\)\s*\{[\s\S]*?background:\s*var\(--current-surface-control-hover\)/);
    expect(css).toMatch(/\.current-selection-toolbar__separator\s*\{[\s\S]*?background:\s*var\(--current-border\)/);
  });

  it("adapts the supplied Current assets to the active appearance", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.current-brand-asset--wordmark-white\s*\{[\s\S]*?display:\s*none/);
    expect(css).toMatch(/\.current-brand-asset--wordmark-white\s*\{[\s\S]*?height:\s*15px/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--wordmark-black\s*\{[\s\S]*?display:\s*none/);
    expect(css).toMatch(/:root\[data-appearance="dark"\] \.current-brand-asset--wordmark-white\s*\{[\s\S]*?display:\s*block/);
    expect(css).not.toContain("current-brand-asset--icon-color");
    expect(css).not.toContain("current-brand-asset--wordmark-color");
  });
});
