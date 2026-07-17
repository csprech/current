import { describe, it, expect } from "vitest";
import {
  IMAGE_ACTIONS,
  IMAGE_ACTIONS_BY_OPERATION,
  resolveActionParams,
  applyImageOperation,
} from "@/utils/imageOps";

describe("IMAGE_ACTIONS catalog", () => {
  it("has unique operations and defaults for every option", () => {
    const seen = new Set<string>();
    for (const action of IMAGE_ACTIONS) {
      expect(seen.has(action.operation)).toBe(false);
      seen.add(action.operation);
      for (const option of action.options) {
        expect(option.default).toBeDefined();
        if (option.type === "select") {
          const values = (option.options ?? []).map((o) => o.value);
          expect(values).toContain(String(option.default));
        }
      }
    }
    expect(IMAGE_ACTIONS_BY_OPERATION.size).toBe(IMAGE_ACTIONS.length);
  });
});

describe("resolveActionParams", () => {
  it("fills defaults when params are missing", () => {
    expect(resolveActionParams("rotate", undefined)).toEqual({ angle: "90" });
    expect(resolveActionParams("blur", {})).toEqual({ radius: 8 });
  });

  it("clamps numbers into the option range", () => {
    expect(resolveActionParams("blur", { radius: 500 })).toEqual({ radius: 50 });
    expect(resolveActionParams("blur", { radius: -3 })).toEqual({ radius: 1 });
    expect(resolveActionParams("adjust", { brightness: 900, contrast: "nope" })).toEqual({
      brightness: 100,
      contrast: 0,
      saturation: 0,
    });
  });

  it("rejects unknown select values back to the default", () => {
    expect(resolveActionParams("rotate", { angle: "45" })).toEqual({ angle: "90" });
    expect(resolveActionParams("flip", { direction: "diagonal" })).toEqual({ direction: "horizontal" });
  });

  it("returns empty params for unknown operations", () => {
    expect(resolveActionParams("melt" as never, { x: 1 })).toEqual({});
  });
});

describe("applyImageOperation input validation", () => {
  it("throws on unknown operations", async () => {
    await expect(applyImageOperation(["data:x"], "melt" as never, {})).rejects.toThrow(
      "Unknown image operation"
    );
  });

  it("requires an image for single-image operations", async () => {
    await expect(applyImageOperation([], "rotate", {})).rejects.toThrow(
      "Connect an image input first"
    );
  });

  it("requires two images for side by side", async () => {
    await expect(applyImageOperation(["data:x"], "sideBySide", {})).rejects.toThrow(
      "Side by side needs two connected images"
    );
  });
});
