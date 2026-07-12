import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("typed node brand contract", () => {
  it.each(["RouterNode.tsx", "ConditionalSwitchNode.tsx"])("keeps %s handles on centralized Current tokens", (file) => {
    const source = readFileSync(`${process.cwd()}/src/components/nodes/${file}`, "utf8");
    expect(source).toContain("getHandlePresentation");
    expect(source).not.toMatch(/#10b981|#3b82f6|#ec4899|167, 139, 250|#f97316|#ffffff|#5578F6|#47CBB3/i);
    if (file === "ConditionalSwitchNode.tsx") expect(source).toContain("current-route-");
  });
});
