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
});
