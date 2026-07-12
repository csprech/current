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
});
