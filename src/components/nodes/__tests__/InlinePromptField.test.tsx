import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InlinePromptField } from "@/components/nodes/InlinePromptField";

const updateNodeData = vi.fn();

const storeState: {
  updateNodeData: typeof updateNodeData;
  edges: Array<{ target: string; targetHandle: string | null; data?: { isLoop?: boolean } }>;
} = {
  updateNodeData,
  edges: [],
};

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => selector(storeState),
}));

describe("InlinePromptField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.edges = [];
  });

  it("commits the typed prompt to node data on blur", () => {
    render(<InlinePromptField nodeId="gen-1" value="" />);

    const textarea = screen.getByRole("textbox", { name: "Prompt" });
    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "a red fox" } });
    fireEvent.blur(textarea);

    expect(updateNodeData).toHaveBeenCalledExactlyOnceWith("gen-1", { inlinePrompt: "a red fox" });
  });

  it("does not write to the store when the value is unchanged", () => {
    render(<InlinePromptField nodeId="gen-1" value="same" />);

    const textarea = screen.getByRole("textbox", { name: "Prompt" });
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    expect(updateNodeData).not.toHaveBeenCalled();
  });

  it("collapses to a linked chip when a text edge is connected", () => {
    storeState.edges = [{ target: "gen-1", targetHandle: "text" }];

    render(<InlinePromptField nodeId="gen-1" value="typed before linking" />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Prompt linked")).toBeInTheDocument();
  });

  it("ignores loop edges and edges for other nodes when deciding linked state", () => {
    storeState.edges = [
      { target: "gen-1", targetHandle: "text", data: { isLoop: true } },
      { target: "other-node", targetHandle: "text" },
      { target: "gen-1", targetHandle: "image" },
    ];

    render(<InlinePromptField nodeId="gen-1" value="" />);

    expect(screen.getByRole("textbox", { name: "Prompt" })).toBeInTheDocument();
  });
});
