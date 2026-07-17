import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Current app icon", () => {
  it("matches the approved white Current icon exactly", () => {
    const appIcon = fs.readFileSync(path.join(process.cwd(), "src/app/icon.svg"), "utf8");
    const approvedIcon = fs.readFileSync(path.join(process.cwd(), "public/brand/current-icon-white.svg"), "utf8");

    expect(appIcon).toBe(approvedIcon);
  });
});
