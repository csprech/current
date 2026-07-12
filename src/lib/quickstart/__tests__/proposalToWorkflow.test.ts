import { describe, expect, it } from "vitest";
import { proposalToWorkflow } from "../proposalToWorkflow";
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
      { ...withGroup, description: "Changed description" },
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? node : { ...node, purpose: "Changed purpose" }) },
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? node : { ...node, suggestedPrompt: "Changed prompt" }) },
      { ...withGroup, nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { quality: "high" } } : node) },
      { ...withGroup, connections: [{ ...withGroup.connections[0], description: "Changed flow" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], name: "Changed group" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], color: "green" }] },
      { ...withGroup, groups: [{ ...withGroup.groups![0], nodeIds: ["brief"] }] },
    ];
    expect(new Set(variants.map((variant) => proposalToWorkflow(variant).id))).not.toContain(baseId);
    expect(new Set([baseId, ...variants.map((variant) => proposalToWorkflow(variant).id)]).size).toBe(variants.length + 1);

    const reorderedSettings = {
      ...withGroup,
      nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { z: 1, a: 2 } } : node),
    };
    const sameSettingsDifferentOrder = {
      ...withGroup,
      nodes: withGroup.nodes.map((node, index) => index ? { ...node, suggestedSettings: { a: 2, z: 1 } } : node),
    };
    expect(proposalToWorkflow(reorderedSettings).id).toBe(proposalToWorkflow(sameSettingsDifferentOrder).id);
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
});
