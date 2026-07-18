import { describe, it, expect } from "vitest";
import {
  IMAGE_ACTIONS,
  IMAGE_ACTIONS_BY_OPERATION,
  resolveActionParams,
  applyImageOperation,
  cannyEdges,
  type PixelBuffer,
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

describe("cannyEdges", () => {
  /** Solid-fill RGBA buffer with an optional darker rectangle inside. */
  function makeBuffer(
    width: number,
    height: number,
    background: number,
    rect?: { x: number; y: number; w: number; h: number; value: number }
  ): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inRect = rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
        const v = inRect ? rect.value : background;
        const o = (y * width + x) * 4;
        data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
      }
    }
    return { data, width, height };
  }

  const edgePixels = (out: PixelBuffer) => {
    const set: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        if (out.data[(y * out.width + x) * 4] === 255) set.push({ x, y });
      }
    }
    return set;
  };

  it("finds no edges in a flat image", () => {
    const out = cannyEdges(makeBuffer(32, 32, 128), 100, 200);
    expect(edgePixels(out)).toHaveLength(0);
  });

  it("marks a thin edge around a high-contrast square and nothing elsewhere", () => {
    const out = cannyEdges(makeBuffer(48, 48, 255, { x: 12, y: 12, w: 24, h: 24, value: 0 }), 100, 200);
    const edges = edgePixels(out);
    expect(edges.length).toBeGreaterThan(40); // roughly the square's perimeter
    // Every edge pixel hugs the square boundary (blur widens it by a few px)
    for (const p of edges) {
      const nearBoundary =
        (Math.abs(p.x - 12) <= 3 || Math.abs(p.x - 35) <= 3 || Math.abs(p.y - 12) <= 3 || Math.abs(p.y - 35) <= 3) &&
        p.x >= 8 && p.x <= 39 && p.y >= 8 && p.y <= 39;
      expect(nearBoundary).toBe(true);
    }
    // Interior and far exterior stay black
    expect(out.data[(24 * 48 + 24) * 4]).toBe(0);
    expect(out.data[(2 * 48 + 2) * 4]).toBe(0);
  });

  it("produces a strictly black-and-white RGBA map", () => {
    const out = cannyEdges(makeBuffer(32, 32, 255, { x: 8, y: 8, w: 16, h: 16, value: 0 }), 100, 200);
    for (let i = 0; i < out.data.length; i += 4) {
      expect([0, 255]).toContain(out.data[i]);
      expect(out.data[i]).toBe(out.data[i + 1]);
      expect(out.data[i]).toBe(out.data[i + 2]);
      expect(out.data[i + 3]).toBe(255);
    }
  });

  it("suppresses faint edges below the high threshold unless connected to strong ones", () => {
    // Low-contrast square: gradient magnitude stays under a high threshold pair
    const faint = cannyEdges(makeBuffer(48, 48, 140, { x: 12, y: 12, w: 24, h: 24, value: 120 }), 200, 250);
    expect(edgePixels(faint)).toHaveLength(0);
    // Same image with permissive thresholds does find the boundary
    const found = cannyEdges(makeBuffer(48, 48, 140, { x: 12, y: 12, w: 24, h: 24, value: 120 }), 5, 10);
    expect(edgePixels(found).length).toBeGreaterThan(0);
  });

  it("handles threshold order being swapped", () => {
    const a = cannyEdges(makeBuffer(48, 48, 255, { x: 12, y: 12, w: 24, h: 24, value: 0 }), 200, 100);
    const b = cannyEdges(makeBuffer(48, 48, 255, { x: 12, y: 12, w: 24, h: 24, value: 0 }), 100, 200);
    expect(edgePixels(a)).toEqual(edgePixels(b));
  });
});
