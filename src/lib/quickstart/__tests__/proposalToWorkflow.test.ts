import { describe, expect, it } from "vitest";
import { proposalToWorkflow } from "../proposalToWorkflow";
import { getAppliedProposalNodeData, getProposalNodeConfigRows } from "../proposalNodeConfig";
import type { WorkflowProposal } from "@/types/quickstart";

const proposal: WorkflowProposal = {
  name: "Campaign studio",
  description: "Creates a campaign image.",
  estimatedComplexity: "moderate",
  nodes: [
    { id: "brief", type: "prompt", purpose: "Hold the brief", suggestedTitle: "Campaign brief", suggestedPrompt: "Create a studio portrait" },
    { id: "render", type: "nanoBanana", purpose: "Render the image", suggestedTitle: "Studio render", suggestedSettings: { aspectRatio: "16:9" } },
  ],
  connections: [{ from: "brief", to: "render", type: "text", description: "Brief to renderer" }],
};

describe("proposalToWorkflow", () => {
  it("deterministically preserves the approved proposal's nodes, edges, and settings", () => {
    const first = proposalToWorkflow(proposal);
    const second = proposalToWorkflow(proposal);

    expect(second).toEqual(first);
    expect(first.nodes.map((node) => node.id)).toEqual(["brief", "render"]);
    expect(first.nodes[0].data).toEqual(expect.objectContaining({ customTitle: "Campaign brief", prompt: "Create a studio portrait" }));
    expect(first.nodes[1].data).toEqual(expect.objectContaining({ customTitle: "Studio render", aspectRatio: "16:9" }));
    expect(first.edges).toEqual([expect.objectContaining({
      source: "brief",
      target: "render",
      sourceHandle: "text",
      targetHandle: "text",
      data: { description: "Brief to renderer" },
    })]);
  });

  it("rejects a proposal that cannot produce a valid workflow", () => {
    expect(() => proposalToWorkflow({ ...proposal, connections: [{ ...proposal.connections[0], to: "missing" }] })).toThrow(/invalid/i);
  });

  it("rejects connections whose declared type is not emitted or accepted by the node variants", () => {
    const imageGenerator: WorkflowProposal = {
      ...proposal,
      nodes: [
        { id: "generate", type: "nanoBanana", purpose: "Generate image", suggestedTitle: "Generate" },
        { id: "prompt", type: "prompt", purpose: "Receive text", suggestedTitle: "Prompt" },
      ],
      connections: [{ from: "generate", to: "prompt", type: "text", description: "Invalid text output" }],
    };
    expect(() => proposalToWorkflow(imageGenerator)).toThrow(/nanoBanana.*output text/i);

    const wrongTarget = {
      ...imageGenerator,
      nodes: [
        { id: "image", type: "imageInput" as const, purpose: "Image", suggestedTitle: "Image" },
        { id: "prompt", type: "prompt" as const, purpose: "Prompt", suggestedTitle: "Prompt" },
      ],
      connections: [{ from: "image", to: "prompt", type: "image" as const, description: "Invalid target" }],
    };
    expect(() => proposalToWorkflow(wrongTarget)).toThrow(/prompt.*input image/i);
  });

  it("accepts valid image, text, video, and reference node variants", () => {
    const variants: WorkflowProposal = {
      ...proposal,
      nodes: [
        { id: "prompt", type: "prompt", purpose: "Prompt", suggestedTitle: "Prompt" },
        { id: "image", type: "nanoBanana", purpose: "Image", suggestedTitle: "Image" },
        { id: "video", type: "generateVideo", purpose: "Video", suggestedTitle: "Video" },
        { id: "grid", type: "splitGrid", purpose: "Grid", suggestedTitle: "Grid" },
        { id: "reference", type: "imageInput", purpose: "Reference", suggestedTitle: "Reference" },
        { id: "output", type: "output", purpose: "Output", suggestedTitle: "Output" },
      ],
      connections: [
        { from: "prompt", to: "image", type: "text", description: "Prompt" },
        { from: "image", to: "video", type: "image", description: "Image" },
        { from: "video", to: "output", type: "video", description: "Video" },
        { from: "grid", to: "reference", type: "reference", description: "References" },
      ],
    };
    expect(() => proposalToWorkflow(variants)).not.toThrow();
  });

  it("hashes the canonical serialization of every applied proposal field", () => {
    const withGroup: WorkflowProposal = {
      ...proposal,
      groups: [{ name: "Generation", color: "blue", nodeIds: ["brief", "render"], purpose: "Create the render" }],
    };
    const baseId = proposalToWorkflow(withGroup).id;
    const variants: WorkflowProposal[] = [
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? node : { ...node, purpose: "Changed purpose" }) },
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? node : { ...node, suggestedPrompt: "Changed prompt" }) },
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { aspectRatio: "4:3" } } : node) },
      { ...withGroup, connections: [{ ...withGroup.connections[0], description: "Changed flow" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], name: "Changed group" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], color: "green" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], nodeIds: ["brief"] }] },
    ];
    expect(new Set(variants.map((variant) => proposalToWorkflow(variant).id))).not.toContain(baseId);
    expect(new Set([baseId, ...variants.map((variant) => proposalToWorkflow(variant).id)]).size).toBe(variants.length + 1);

    const reorderedSettings = {
      ...withGroup,
      nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { resolution: "2K", aspectRatio: "4:3" } } : node),
    };
    const sameSettingsDifferentOrder = {
      ...withGroup,
      nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { aspectRatio: "4:3", resolution: "2K" } } : node),
    };
    expect(proposalToWorkflow(reorderedSettings).id).toBe(proposalToWorkflow(sameSettingsDifferentOrder).id);
  });

  it("applies only whitelisted settings and keeps reviewed title, purpose, prompt, and model authoritative", () => {
    const protectedProposal: WorkflowProposal = {
      ...proposal,
      nodes: [
        {
          id: "brief",
          type: "prompt",
          purpose: "Reviewed purpose",
          suggestedTitle: "Reviewed title",
          suggestedPrompt: "Reviewed prompt",
          suggestedSettings: {
            customTitle: "Injected title",
            comment: "Injected purpose",
            prompt: "Injected prompt",
            variableName: "campaignBrief",
            outputText: "Injected output",
          },
        },
        {
          id: "render",
          type: "nanoBanana",
          purpose: "Reviewed render purpose",
          suggestedTitle: "Reviewed render",
          suggestedModel: "nano-banana-pro",
          suggestedSettings: {
            model: "injected-model",
            customTitle: "Injected render",
            outputImage: "data:image/png;base64,injected",
            parameters: "not-an-object",
            aspectRatio: "16:9",
            resolution: "2K",
            useGoogleSearch: true,
          },
        },
      ],
    };

    const workflow = proposalToWorkflow(protectedProposal);
    expect(workflow.nodes[0].data).toEqual(expect.objectContaining({
      customTitle: "Reviewed title",
      comment: "Reviewed purpose",
      prompt: "Reviewed prompt",
      variableName: "campaignBrief",
    }));
    expect(workflow.nodes[0].data).not.toHaveProperty("outputText", "Injected output");
    expect(workflow.nodes[1].data).toEqual(expect.objectContaining({
      customTitle: "Reviewed render",
      comment: "Reviewed render purpose",
      model: "nano-banana-pro",
      aspectRatio: "16:9",
      resolution: "2K",
      useGoogleSearch: true,
      outputImage: null,
    }));
    expect(workflow.nodes[1].data).not.toHaveProperty("parameters");
  });

  it("ignores invalid or unapplied proposal fields when deriving the stable workflow ID", () => {
    const base = proposalToWorkflow(proposal).id;
    const ignoredChanges: WorkflowProposal = {
      ...proposal,
      description: "A different review-only summary",
      estimatedComplexity: "complex",
      warnings: ["A review-only warning"],
      nodes: proposal.nodes.map((node, index) => index ? {
        ...node,
        suggestedModel: "not-a-supported-model",
      } : {
        ...node,
        suggestedSettings: {
          prompt: "Injected prompt",
          customTitle: "Injected title",
          unknownSetting: true,
        },
      }),
      connections: proposal.connections.map((connection) => ({
        ...connection,
        ignoredRuntimeField: "not applied",
      })) as WorkflowProposal["connections"],
    };

    expect(proposalToWorkflow(ignoredChanges).id).toBe(base);
  });

  it("rejects unknown, empty, and duplicate group membership instead of dropping approved data", () => {
    expect(() => proposalToWorkflow({ ...proposal, groups: [{ name: "Empty", color: "blue", nodeIds: [], purpose: "None" }] })).toThrow(/group.*empty/i);
    expect(() => proposalToWorkflow({ ...proposal, groups: [{ name: "Unknown", color: "blue", nodeIds: ["missing"], purpose: "Bad" }] })).toThrow(/unknown node/i);
    expect(() => proposalToWorkflow({ ...proposal, groups: [{ name: "Duplicate", color: "blue", nodeIds: ["brief", "brief"], purpose: "Bad" }] })).toThrow(/duplicate/i);
    expect(() => proposalToWorkflow({
      ...proposal,
      groups: [
        { name: "One", color: "blue", nodeIds: ["brief"], purpose: "One" },
        { name: "Two", color: "green", nodeIds: ["brief"], purpose: "Two" },
      ],
    })).toThrow(/multiple groups/i);
  });

  it.each([
    [4, 2, 2],
    [6, 2, 3],
    [8, 2, 4],
    [9, 3, 3],
    [10, 2, 5],
  ])("derives the executable split-grid layout for %i images", (targetCount, gridRows, gridCols) => {
    const splitProposal: WorkflowProposal = {
      name: `Split ${targetCount}`,
      description: "Split a source grid",
      estimatedComplexity: "simple",
      nodes: [{
        id: "split",
        type: "splitGrid",
        purpose: "Split the grid",
        suggestedTitle: "Split grid",
        suggestedSettings: { targetCount },
      }],
      connections: [],
    };

    const node = proposalToWorkflow(splitProposal).nodes[0];
    expect(node.data).toEqual(expect.objectContaining({ targetCount, gridRows, gridCols }));
    expect(getProposalNodeConfigRows(splitProposal.nodes[0])).toContain(
      `Layout: ${gridRows} × ${gridCols} (${targetCount} images)`,
    );
  });

  describe("model-aware proposal settings", () => {
    const baseRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
    const extendedRatios = ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"];

    it.each([
      ["nano-banana", baseRatios, []],
      ["nano-banana-pro", baseRatios, ["1K", "2K", "4K"]],
      ["nano-banana-2", extendedRatios, ["512", "1K", "2K", "4K"]],
    ])("accepts exactly the runtime ratio and resolution matrix for %s", (model, ratios, resolutions) => {
      for (const aspectRatio of ratios) {
        expect(getAppliedProposalNodeData({
          id: "render", type: "nanoBanana", purpose: "Render", suggestedTitle: "Render",
          suggestedModel: model, suggestedSettings: { aspectRatio },
        }).aspectRatio).toBe(aspectRatio);
      }
      for (const resolution of resolutions) {
        expect(getAppliedProposalNodeData({
          id: "render", type: "nanoBanana", purpose: "Render", suggestedTitle: "Render",
          suggestedModel: model, suggestedSettings: { resolution },
        }).resolution).toBe(resolution);
      }
    });

    it.each([
      ["nano-banana", { aspectRatio: "1:4", resolution: "1K", useGoogleSearch: true, useImageSearch: true }],
      ["nano-banana-pro", { aspectRatio: "8:1", resolution: "512", useImageSearch: true }],
      ["nano-banana-2", { aspectRatio: "7:5", resolution: "8K" }],
    ])("ignores combinations unsupported by %s before review and hashing", (model, suggestedSettings) => {
      const node = {
        id: "render", type: "nanoBanana" as const, purpose: "Render", suggestedTitle: "Render",
        suggestedModel: model, suggestedSettings,
      };
      const applied = getAppliedProposalNodeData(node);
      for (const key of Object.keys(suggestedSettings)) expect(applied).not.toHaveProperty(key);

      const invalidProposal = { ...proposal, nodes: proposal.nodes.map((entry, index) => index ? node : entry) };
      const strippedProposal = { ...invalidProposal, nodes: invalidProposal.nodes.map((entry, index) => index ? { ...entry, suggestedSettings: {} } : entry) };
      expect(proposalToWorkflow(invalidProposal).id).toBe(proposalToWorkflow(strippedProposal).id);
    });

    it("admits search features only for the models that expose them", () => {
      const settings = { useGoogleSearch: true, useImageSearch: true };
      const base = getAppliedProposalNodeData({ id: "base", type: "nanoBanana", purpose: "Base", suggestedTitle: "Base", suggestedModel: "nano-banana", suggestedSettings: settings });
      const pro = getAppliedProposalNodeData({ id: "pro", type: "nanoBanana", purpose: "Pro", suggestedTitle: "Pro", suggestedModel: "nano-banana-pro", suggestedSettings: settings });
      const two = getAppliedProposalNodeData({ id: "two", type: "nanoBanana", purpose: "Two", suggestedTitle: "Two", suggestedModel: "nano-banana-2", suggestedSettings: settings });
      expect(base).not.toHaveProperty("useGoogleSearch");
      expect(base).not.toHaveProperty("useImageSearch");
      expect(pro).toHaveProperty("useGoogleSearch", true);
      expect(pro).not.toHaveProperty("useImageSearch");
      expect(two).toEqual(expect.objectContaining(settings));
    });
  });

  it("enforces the remaining runtime setting variants and bounds", () => {
    const validPrompt = getAppliedProposalNodeData({
      id: "prompt", type: "prompt", purpose: "Prompt", suggestedTitle: "Prompt", suggestedSettings: { variableName: "campaign_1" },
    });
    const invalidPrompt = getAppliedProposalNodeData({
      id: "prompt", type: "prompt", purpose: "Prompt", suggestedTitle: "Prompt", suggestedSettings: { variableName: "not valid!" },
    });
    expect(validPrompt).toHaveProperty("variableName", "campaign_1");
    expect(invalidPrompt).not.toHaveProperty("variableName");

    const frame = (framePosition: string) => getAppliedProposalNodeData({
      id: "frame", type: "videoFrameGrab", purpose: "Frame", suggestedTitle: "Frame", suggestedSettings: { framePosition },
    });
    expect(frame("first")).toHaveProperty("framePosition", "first");
    expect(frame("last")).toHaveProperty("framePosition", "last");
    expect(frame("middle")).not.toHaveProperty("framePosition");

    const ease = (outputDuration: number) => getAppliedProposalNodeData({
      id: "ease", type: "easeCurve", purpose: "Ease", suggestedTitle: "Ease", suggestedSettings: { outputDuration },
    });
    expect(ease(0.1)).toHaveProperty("outputDuration", 0.1);
    expect(ease(30)).toHaveProperty("outputDuration", 30);
    expect(ease(0.09)).not.toHaveProperty("outputDuration");
    expect(ease(1.55)).not.toHaveProperty("outputDuration");
    expect(ease(30.1)).not.toHaveProperty("outputDuration");

    const trim = getAppliedProposalNodeData({
      id: "trim", type: "videoTrim", purpose: "Trim", suggestedTitle: "Trim", suggestedSettings: { startTime: 8, endTime: 4 },
    });
    expect(trim).toHaveProperty("startTime", 8);
    expect(trim).not.toHaveProperty("endTime");
    const offStepTrim = getAppliedProposalNodeData({
      id: "trim-step", type: "videoTrim", purpose: "Trim", suggestedTitle: "Trim", suggestedSettings: { startTime: 1.05, endTime: 4 },
    });
    expect(offStepTrim).not.toHaveProperty("startTime");
    expect(offStepTrim).toHaveProperty("endTime", 4);

    const stitch = getAppliedProposalNodeData({
      id: "stitch", type: "videoStitch", purpose: "Stitch", suggestedTitle: "Stitch", suggestedSettings: { loopCount: 4 },
    });
    expect(stitch).not.toHaveProperty("loopCount");

    const llm = getAppliedProposalNodeData({
      id: "llm", type: "llmGenerate", purpose: "Write", suggestedTitle: "Write",
      suggestedModel: "claude-sonnet-4.5",
      suggestedSettings: { provider: "openai", temperature: 1.5, maxTokens: 257 },
    });
    expect(llm).toEqual(expect.objectContaining({ provider: "anthropic", model: "claude-sonnet-4.5" }));
    expect(llm).not.toHaveProperty("temperature");
    expect(llm).not.toHaveProperty("maxTokens");

    const openAi = getAppliedProposalNodeData({
      id: "openai", type: "llmGenerate", purpose: "Write", suggestedTitle: "Write",
      suggestedModel: "gpt-4.1-mini",
      suggestedSettings: { provider: "openai", temperature: 0.125, maxTokens: 16384 },
    });
    expect(openAi).toEqual(expect.objectContaining({ provider: "openai", model: "gpt-4.1-mini", maxTokens: 16384 }));
    expect(openAi).not.toHaveProperty("temperature");
  });
});
