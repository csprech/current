import { describe, it, expect } from "vitest";
import { computeRunSignature, GENERATOR_OUTPUT_FIELDS } from "@/lib/workflow/runSignature";
import type { ConnectedInputs } from "@/store/utils/connectedInputs";

function inputs(overrides: Partial<ConnectedInputs> = {}): ConnectedInputs {
  return {
    images: [],
    videos: [],
    audio: [],
    model3d: null,
    text: null,
    textItems: [],
    dynamicInputs: {},
    easeCurve: null,
    ...overrides,
  };
}

const baseData = {
  inlinePrompt: "a fox",
  selectedModel: { provider: "gemini", modelId: "nano-banana" },
  parameters: { steps: 20 },
  aspectRatio: "1:1",
};

describe("computeRunSignature", () => {
  it("is stable for identical inputs and settings", () => {
    const a = computeRunSignature("nanoBanana", { ...baseData }, inputs({ text: "hi" }));
    const b = computeRunSignature("nanoBanana", { ...baseData }, inputs({ text: "hi" }));
    expect(a).toBe(b);
  });

  it("ignores key order in node data", () => {
    const a = computeRunSignature(
      "nanoBanana",
      { inlinePrompt: "a fox", aspectRatio: "1:1", parameters: { steps: 20 } },
      inputs()
    );
    const b = computeRunSignature(
      "nanoBanana",
      { parameters: { steps: 20 }, inlinePrompt: "a fox", aspectRatio: "1:1" },
      inputs()
    );
    expect(a).toBe(b);
  });

  it("changes when a connected input changes", () => {
    const before = computeRunSignature("nanoBanana", baseData, inputs({ text: "sunrise" }));
    const after = computeRunSignature("nanoBanana", baseData, inputs({ text: "sunset" }));
    expect(before).not.toBe(after);
  });

  it("changes when connected images change", () => {
    const before = computeRunSignature("nanoBanana", baseData, inputs({ images: ["data:a"] }));
    const after = computeRunSignature("nanoBanana", baseData, inputs({ images: ["data:a", "data:b"] }));
    expect(before).not.toBe(after);
  });

  it("changes when generation settings change", () => {
    const before = computeRunSignature("nanoBanana", baseData, inputs());
    const after = computeRunSignature(
      "nanoBanana",
      { ...baseData, parameters: { steps: 30 } },
      inputs()
    );
    expect(before).not.toBe(after);
  });

  it("ignores outputs, history, status, and UI-only fields", () => {
    const before = computeRunSignature("nanoBanana", baseData, inputs());
    const after = computeRunSignature(
      "nanoBanana",
      {
        ...baseData,
        outputImage: "data:image/png;base64,huge",
        status: "complete",
        error: null,
        imageHistory: [{ id: "1" }],
        selectedHistoryIndex: 3,
        customTitle: "My generator",
        parametersExpanded: false,
        __lastRunSignature: "aaaa-1",
        __usedFallback: true,
        inputSchema: [{ name: "prompt", type: "text" }],
      },
      inputs()
    );
    expect(before).toBe(after);
  });

  it("distinguishes the mask and control inputs", () => {
    const plain = computeRunSignature("nanoBanana", baseData, inputs());
    const masked = computeRunSignature("nanoBanana", baseData, inputs({ mask: "data:mask" }));
    const controlled = computeRunSignature("nanoBanana", baseData, inputs({ control: "data:hint" }));
    expect(new Set([plain, masked, controlled]).size).toBe(3);
  });

  it("folds extras (resolved subject content) into the signature", () => {
    const without = computeRunSignature("nanoBanana", baseData, inputs());
    const withSubject = computeRunSignature("nanoBanana", baseData, inputs(), {
      name: "Maya",
      description: null,
      images: ["data:ref-1"],
    });
    const withEditedSubject = computeRunSignature("nanoBanana", baseData, inputs(), {
      name: "Maya",
      description: null,
      images: ["data:ref-1", "data:ref-2"],
    });
    expect(new Set([without, withSubject, withEditedSubject]).size).toBe(3);
    expect(
      computeRunSignature("nanoBanana", baseData, inputs(), {
        name: "Maya",
        description: null,
        images: ["data:ref-1"],
      })
    ).toBe(withSubject);
  });

  it("covers exactly the five generate-family node types", () => {
    expect(Object.keys(GENERATOR_OUTPUT_FIELDS).sort()).toEqual([
      "generate3d",
      "generateAudio",
      "generateVideo",
      "llmGenerate",
      "nanoBanana",
    ]);
  });
});
