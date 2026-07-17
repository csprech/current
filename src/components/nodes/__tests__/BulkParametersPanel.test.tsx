import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BulkParametersPanel } from "@/components/nodes/BulkParametersPanel";
import type { WorkflowNode } from "@/types";

const updateNodeData = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => selector({ updateNodeData }),
}));

function makeGenNode(id: string, data: Record<string, unknown> = {}): WorkflowNode {
  return {
    id,
    type: "nanoBanana",
    position: { x: 0, y: 0 },
    data: {
      model: "nano-banana-pro",
      aspectRatio: "1:1",
      resolution: "1K",
      useGoogleSearch: false,
      selectedModel: { provider: "gemini", modelId: "nano-banana-pro", displayName: "Nano Banana Pro" },
      ...data,
    },
  } as WorkflowNode;
}

function makeLlmNode(id: string, data: Record<string, unknown> = {}): WorkflowNode {
  return {
    id,
    type: "llmGenerate",
    position: { x: 0, y: 0 },
    data: {
      provider: "google",
      model: "gemini-3-flash-preview",
      temperature: 0.7,
      maxTokens: 8192,
      ...data,
    },
  } as WorkflowNode;
}

beforeEach(() => vi.clearAllMocks());

describe("BulkParametersPanel", () => {
  it("applies a shared aspect ratio change to every selected node", () => {
    const nodes = [makeGenNode("a"), makeGenNode("b"), makeGenNode("c")];
    render(<BulkParametersPanel nodes={nodes} />);

    expect(screen.getByText(/3 × Generate Image/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Aspect ratio (all selected)" }), {
      target: { value: "16:9" },
    });

    expect(updateNodeData).toHaveBeenCalledTimes(3);
    for (const id of ["a", "b", "c"]) {
      expect(updateNodeData).toHaveBeenCalledWith(id, { aspectRatio: "16:9" });
    }
  });

  it("marks fields Mixed when the selection disagrees, then unifies on change", () => {
    const nodes = [makeGenNode("a", { aspectRatio: "1:1" }), makeGenNode("b", { aspectRatio: "16:9" })];
    render(<BulkParametersPanel nodes={nodes} />);

    const select = screen.getByRole("combobox", { name: "Aspect ratio (all selected)" });
    expect((select as HTMLSelectElement).value).toBe("__mixed__");

    fireEvent.change(select, { target: { value: "3:2" } });
    expect(updateNodeData).toHaveBeenCalledWith("a", { aspectRatio: "3:2" });
    expect(updateNodeData).toHaveBeenCalledWith("b", { aspectRatio: "3:2" });
  });

  it("applies variations to all nodes and shows Mixed when counts differ", () => {
    const nodes = [makeGenNode("a", { variantCount: 2 }), makeGenNode("b", { variantCount: 4 })];
    render(<BulkParametersPanel nodes={nodes} />);

    expect(screen.getAllByText("Mixed").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("radio", { name: "3 variations per run" }));
    expect(updateNodeData).toHaveBeenCalledWith("a", { variantCount: 3 });
    expect(updateNodeData).toHaveBeenCalledWith("b", { variantCount: 3 });
  });

  it("hides Gemini-only fields when a non-Gemini node is in the selection", () => {
    const nodes = [
      makeGenNode("a"),
      makeGenNode("b", { selectedModel: { provider: "fal", modelId: "flux", displayName: "Flux" } }),
    ];
    render(<BulkParametersPanel nodes={nodes} />);

    expect(screen.queryByRole("combobox", { name: "Model (all selected)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Resolution (all selected)" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Aspect ratio (all selected)" })).toBeInTheDocument();
  });

  it("switches provider and resets the model for every selected LLM node", () => {
    const nodes = [makeLlmNode("a"), makeLlmNode("b")];
    render(<BulkParametersPanel nodes={nodes} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Provider (all selected)" }), {
      target: { value: "anthropic" },
    });

    for (const id of ["a", "b"]) {
      expect(updateNodeData).toHaveBeenCalledWith(id, {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
      });
    }
  });
});
