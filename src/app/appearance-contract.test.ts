import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function themeVariables(theme: "light" | "dark") {
  const body = theme === "light"
    ? css.match(/\n:root\s*\{([\s\S]*?)\n\}/)?.[1]
    : css.match(/:root\[data-appearance="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1];

  if (!body) throw new Error(`Missing ${theme} appearance block`);

  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe.each(["light", "dark"] as const)("%s appearance contract", (theme) => {
  const vars = themeVariables(theme);

  it("defines every semantic role", () => {
    expect(vars).toMatchObject({
      "current-canvas": expect.any(String),
      "current-surface-chrome": expect.any(String),
      "current-surface-panel": expect.any(String),
      "current-surface-elevated": expect.any(String),
      "current-surface-control": expect.any(String),
      "current-surface-control-hover": expect.any(String),
      "current-border": expect.any(String),
      "current-border-strong": expect.any(String),
      "current-text-primary": expect.any(String),
      "current-text-secondary": expect.any(String),
      "current-text-tertiary": expect.any(String),
      "current-action": expect.any(String),
      "current-action-foreground": expect.any(String),
      "current-accent-text": expect.any(String),
      "current-media-overlay": expect.any(String),
      "current-media-overlay-foreground": expect.any(String),
      "current-media-overlay-border": expect.any(String),
      "current-focus-inner": expect.any(String),
      "current-focus-outer": expect.any(String),
    });
  });

  it("keeps text and filled actions at 4.5:1", () => {
    expect(contrast(vars["current-text-primary"], vars["current-surface-panel"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-text-secondary"], vars["current-surface-panel"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-text-tertiary"], vars["current-canvas"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-action-foreground"], vars["current-action"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["current-media-overlay-foreground"], vars["current-media-overlay"])).toBeGreaterThanOrEqual(7);
  });

  it("keeps strong control boundaries and focus rings at 3:1", () => {
    expect(contrast(vars["current-border-strong"], vars["current-surface-elevated"])).toBeGreaterThanOrEqual(3);
    expect(contrast(vars["current-focus-outer"], vars["current-canvas"])).toBeGreaterThanOrEqual(3);
    expect(contrast(vars["current-media-overlay-border"], vars["current-media-overlay"])).toBeGreaterThanOrEqual(3);
  });
});
