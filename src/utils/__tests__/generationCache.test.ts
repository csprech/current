import { describe, it, expect, beforeEach } from "vitest";
import {
  generationCacheKey,
  rememberGeneration,
  recallGeneration,
  rekeyGeneration,
  clearGenerationCache,
} from "@/utils/generationCache";

describe("generationCache", () => {
  beforeEach(() => {
    clearGenerationCache();
  });

  it("recalls media stored under a node/item key", () => {
    const key = generationCacheKey("node-1", "111");
    rememberGeneration(key, "data:image/png;base64,AAA");
    expect(recallGeneration(key)).toBe("data:image/png;base64,AAA");
  });

  it("namespaces by node id so two nodes with the same item id don't collide", () => {
    rememberGeneration(generationCacheKey("node-1", "111"), "first");
    rememberGeneration(generationCacheKey("node-2", "111"), "second");
    expect(recallGeneration(generationCacheKey("node-1", "111"))).toBe("first");
    expect(recallGeneration(generationCacheKey("node-2", "111"))).toBe("second");
  });

  it("returns null for media this session never produced", () => {
    expect(recallGeneration(generationCacheKey("node-1", "missing"))).toBeNull();
  });

  it("follows a history item after the save API renames its id", () => {
    const oldKey = generationCacheKey("node-1", "111");
    const newKey = generationCacheKey("node-1", "saved-abc");
    rememberGeneration(oldKey, "bytes");
    rekeyGeneration(oldKey, newKey);
    expect(recallGeneration(oldKey)).toBeNull();
    expect(recallGeneration(newKey)).toBe("bytes");
  });

  it("evicts least-recently-used entries past the cap, sparing recalled ones", () => {
    // Fill well past the 64-entry cap
    for (let i = 0; i < 100; i++) {
      rememberGeneration(generationCacheKey("n", `${i}`), `v${i}`);
    }
    // The earliest entries are gone; the most recent survive
    expect(recallGeneration(generationCacheKey("n", "0"))).toBeNull();
    expect(recallGeneration(generationCacheKey("n", "99"))).toBe("v99");
  });

  it("recall refreshes recency so a touched entry outlives an untouched neighbor", () => {
    // Fill exactly to the 64-entry cap
    for (let i = 0; i < 64; i++) {
      rememberGeneration(generationCacheKey("n", `${i}`), `v${i}`);
    }
    // Touch entry 0 (now most-recently-used) but not entry 1
    recallGeneration(generationCacheKey("n", "0"));
    // One more insert evicts the single oldest — which is now entry 1, not 0
    rememberGeneration(generationCacheKey("n", "new"), "vnew");
    expect(recallGeneration(generationCacheKey("n", "0"))).toBe("v0");
    expect(recallGeneration(generationCacheKey("n", "1"))).toBeNull();
  });
});
