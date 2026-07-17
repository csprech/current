import { describe, it, expect } from "vitest";
import {
  computeVideoActionPlan,
  resolveVideoActionParams,
  VIDEO_ACTIONS,
  SPEED_MIN,
  SPEED_MAX,
} from "../videoOps";

describe("resolveVideoActionParams", () => {
  it("returns defaults when no raw params are given", () => {
    expect(resolveVideoActionParams("speed", undefined)).toEqual({ rate: 2 });
    expect(resolveVideoActionParams("reverse", undefined)).toEqual({});
  });

  it("clamps the speed rate into the supported range", () => {
    expect(resolveVideoActionParams("speed", { rate: 100 })).toEqual({ rate: SPEED_MAX });
    expect(resolveVideoActionParams("speed", { rate: 0.01 })).toEqual({ rate: SPEED_MIN });
    expect(resolveVideoActionParams("speed", { rate: "not a number" })).toEqual({ rate: 2 });
    expect(resolveVideoActionParams("speed", { rate: "0.5" })).toEqual({ rate: 0.5 });
  });

  it("returns an empty object for unknown operations", () => {
    expect(resolveVideoActionParams("nope" as never, { rate: 3 })).toEqual({});
  });

  it("has a catalog entry for every operation", () => {
    expect(VIDEO_ACTIONS.map((a) => a.operation)).toEqual(["reverse", "speed", "boomerang", "mute"]);
  });
});

describe("computeVideoActionPlan", () => {
  it("reverse keeps duration and maps output time to mirrored source time", () => {
    const plan = computeVideoActionPlan("reverse", {}, 2, 30);
    expect(plan.outputDuration).toBe(2);
    expect(plan.fps).toBe(30);
    expect(plan.sourceTimestamps).toHaveLength(60);
    // First output frame shows the end of the source (clamped just inside)
    expect(plan.sourceTimestamps[0]).toBeCloseTo(2 - 0.001, 5);
    // Last output frame shows near the start
    const last = plan.sourceTimestamps[plan.sourceTimestamps.length - 1];
    expect(last).toBeCloseTo(2 - 59 / 30, 5);
    // Monotonically decreasing
    for (let i = 1; i < plan.sourceTimestamps.length; i++) {
      expect(plan.sourceTimestamps[i]).toBeLessThan(plan.sourceTimestamps[i - 1]);
    }
  });

  it("speed 2x halves the duration and doubles the source step", () => {
    const plan = computeVideoActionPlan("speed", { rate: 2 }, 4, 30);
    expect(plan.outputDuration).toBe(2);
    expect(plan.sourceTimestamps).toHaveLength(60);
    expect(plan.sourceTimestamps[0]).toBe(0);
    expect(plan.sourceTimestamps[30]).toBeCloseTo(2, 5); // 1s out → 2s in
  });

  it("speed 0.5x doubles the duration (slow motion)", () => {
    const plan = computeVideoActionPlan("speed", { rate: 0.5 }, 2, 30);
    expect(plan.outputDuration).toBe(4);
    expect(plan.sourceTimestamps).toHaveLength(120);
    expect(plan.sourceTimestamps[60]).toBeCloseTo(1, 5); // 2s out → 1s in
  });

  it("boomerang doubles duration, plays forward then backward", () => {
    const plan = computeVideoActionPlan("boomerang", {}, 2, 30);
    expect(plan.outputDuration).toBe(4);
    expect(plan.sourceTimestamps).toHaveLength(120);
    expect(plan.sourceTimestamps[0]).toBe(0);
    // Frame at the turn point shows the end of the source
    expect(plan.sourceTimestamps[60]).toBeCloseTo(2 - 0.001, 5);
    // Fully mirrored: slot 90 (3s out) maps back to 1s in
    expect(plan.sourceTimestamps[90]).toBeCloseTo(1, 5);
  });

  it("mute keeps an identity mapping", () => {
    const plan = computeVideoActionPlan("mute", {}, 2, 30);
    expect(plan.outputDuration).toBe(2);
    plan.sourceTimestamps.forEach((sourceTime, i) => {
      const expected = Math.min(i / 30, 2 - 0.001);
      expect(sourceTime).toBeCloseTo(expected, 5);
    });
  });

  it("clamps fps to the 1-60 range and falls back to 30 when unknown", () => {
    expect(computeVideoActionPlan("mute", {}, 1, 120).fps).toBe(60);
    expect(computeVideoActionPlan("mute", {}, 1, 0).fps).toBe(30);
    expect(computeVideoActionPlan("mute", {}, 1, NaN).fps).toBe(30);
  });

  it("never emits timestamps outside the source range", () => {
    for (const operation of ["reverse", "speed", "boomerang", "mute"] as const) {
      const plan = computeVideoActionPlan(operation, { rate: 4 }, 1.5, 24);
      for (const t of plan.sourceTimestamps) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1.5 - 0.001);
      }
      expect(plan.sourceTimestamps.length).toBe(plan.outputTimestamps.length);
    }
  });

  it("throws on missing or invalid duration", () => {
    expect(() => computeVideoActionPlan("reverse", {}, 0, 30)).toThrow("Video has no duration");
    expect(() => computeVideoActionPlan("reverse", {}, NaN, 30)).toThrow("Video has no duration");
  });

  it("emits at least one frame for very short clips", () => {
    const plan = computeVideoActionPlan("reverse", {}, 0.01, 30);
    expect(plan.sourceTimestamps.length).toBeGreaterThanOrEqual(1);
  });
});
