import { describe, it, expect } from "vitest";
import { calculatePredictedCost, estimateNodeRunCost, PRICING } from "@/utils/costCalculator";
import { WorkflowNode } from "@/types";

function makeNode(id: string, type: string, data: Record<string, unknown>): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data,
  } as WorkflowNode;
}

describe("estimateNodeRunCost", () => {
  it("prices legacy Gemini nanoBanana nodes from the hardcoded table", () => {
    const node = makeNode("1", "nanoBanana", { model: "nano-banana", resolution: "1K" });
    expect(estimateNodeRunCost(node)).toBe(PRICING["nano-banana"]["1K"]);
  });

  it("prices Gemini selectedModel by resolution", () => {
    const node = makeNode("1", "nanoBanana", {
      model: "nano-banana-pro",
      resolution: "4K",
      selectedModel: { provider: "gemini", modelId: "nano-banana-pro", displayName: "Nano Banana Pro" },
    });
    expect(estimateNodeRunCost(node)).toBe(PRICING["nano-banana-pro"]["4K"]);
  });

  it("uses pricing carried on the selected model for external providers", () => {
    const node = makeNode("1", "generateVideo", {
      selectedModel: {
        provider: "kie",
        modelId: "kling-video",
        displayName: "Kling",
        pricing: { type: "per-run", amount: 0.35 },
      },
    });
    expect(estimateNodeRunCost(node)).toBe(0.35);
  });

  it("returns null for external models without pricing data", () => {
    const node = makeNode("1", "nanoBanana", {
      model: "nano-banana",
      resolution: "1K",
      selectedModel: { provider: "replicate", modelId: "some-model", displayName: "Some Model" },
    });
    expect(estimateNodeRunCost(node)).toBeNull();
  });

  it("returns 0 for removeBackground (runs locally)", () => {
    expect(estimateNodeRunCost(makeNode("1", "removeBackground", {}))).toBe(0);
  });

  it("returns null for llmGenerate (token-based pricing)", () => {
    const node = makeNode("1", "llmGenerate", {
      selectedModel: { provider: "google", modelId: "gemini-3-flash", displayName: "Gemini 3 Flash" },
    });
    expect(estimateNodeRunCost(node)).toBeNull();
  });

  it("returns 0 for llmGenerate on Ollama (local daemon, free)", () => {
    const node = makeNode("1", "llmGenerate", { provider: "ollama", model: "llama3.2" });
    expect(estimateNodeRunCost(node)).toBe(0);
  });

  it("returns 0 for image generation on ComfyUI (local daemon, free)", () => {
    const node = makeNode("1", "nanoBanana", {
      selectedModel: { provider: "comfyui", modelId: "sd_xl_base_1.0.safetensors", displayName: "sd_xl_base_1.0" },
    });
    expect(estimateNodeRunCost(node)).toBe(0);
  });

  it("still returns null for cloud llmGenerate providers", () => {
    const node = makeNode("1", "llmGenerate", { provider: "google", model: "gemini-3-flash-preview" });
    expect(estimateNodeRunCost(node)).toBeNull();
  });
});

describe("calculatePredictedCost with carried model pricing", () => {
  it("includes external models priced via selectedModel.pricing in the total", () => {
    const nodes = [
      makeNode("1", "nanoBanana", { model: "nano-banana", resolution: "1K" }),
      makeNode("2", "generateVideo", {
        selectedModel: {
          provider: "kie",
          modelId: "kling-video",
          displayName: "Kling",
          pricing: { type: "per-run", amount: 0.35 },
        },
      }),
    ];
    const result = calculatePredictedCost(nodes);
    expect(result.totalCost).toBeCloseTo(PRICING["nano-banana"]["1K"] + 0.35, 5);
    expect(result.unknownPricingCount).toBe(0);
  });

  it("counts unpriced external models instead of pricing them", () => {
    const nodes = [
      makeNode("1", "nanoBanana", {
        model: "nano-banana",
        resolution: "1K",
        selectedModel: { provider: "replicate", modelId: "some-model", displayName: "Some Model" },
      }),
    ];
    const result = calculatePredictedCost(nodes);
    expect(result.totalCost).toBe(0);
    expect(result.unknownPricingCount).toBe(1);
  });

  it("covers generateAudio and generate3d nodes with carried pricing", () => {
    const nodes = [
      makeNode("1", "generateAudio", {
        selectedModel: {
          provider: "fal",
          modelId: "tts-model",
          displayName: "TTS",
          pricing: { type: "per-run", amount: 0.02 },
        },
      }),
      makeNode("2", "generate3d", {
        selectedModel: { provider: "fal", modelId: "hunyuan3d", displayName: "Hunyuan 3D" },
      }),
    ];
    const result = calculatePredictedCost(nodes);
    expect(result.totalCost).toBeCloseTo(0.02, 5);
    expect(result.unknownPricingCount).toBe(1);
    expect(result.breakdown.find((b) => b.modelId === "tts-model")?.unit).toBe("audio");
  });

  it("multiplies node cost by the variants-per-run setting", () => {
    const nodes = [
      makeNode("1", "nanoBanana", { model: "nano-banana", resolution: "1K", variantCount: 3 }),
    ];
    const result = calculatePredictedCost(nodes);
    expect(result.nodeCount).toBe(3);
    expect(result.totalCost).toBeCloseTo(PRICING["nano-banana"]["1K"] * 3, 5);
  });

  it("relabels per-run video pricing with a video unit", () => {
    const nodes = [
      makeNode("1", "generateVideo", {
        selectedModel: {
          provider: "kie",
          modelId: "kling-video",
          displayName: "Kling",
          pricing: { type: "per-run", amount: 0.35 },
        },
      }),
    ];
    const result = calculatePredictedCost(nodes);
    expect(result.breakdown[0].unit).toBe("video");
  });
});
