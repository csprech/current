import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppWorkspace } from "@/components/workspace/AppWorkspace";
import type { WorkflowNode } from "@/types";

const mockUpdateNodeData = vi.fn();
const mockExecuteWorkflow = vi.fn();
const mockSetWorkspaceView = vi.fn();
const mockGetConnectedInputs = vi.fn();

let mockNodes: WorkflowNode[] = [];
let mockIsRunning = false;

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) =>
    selector({
      nodes: mockNodes,
      workflowName: "Poster maker",
      isRunning: mockIsRunning,
      updateNodeData: mockUpdateNodeData,
      executeWorkflow: mockExecuteWorkflow,
      getConnectedInputs: mockGetConnectedInputs,
      setWorkspaceView: mockSetWorkspaceView,
    }),
}));

function makeNode(id: string, type: string, y: number, data: Record<string, unknown> = {}): WorkflowNode {
  return { id, type, position: { x: 0, y }, data } as WorkflowNode;
}

describe("AppWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRunning = false;
    mockGetConnectedInputs.mockReturnValue({ images: [], videos: [], audio: [], text: null });
    mockNodes = [
      makeNode("p1", "prompt", 0, { prompt: "a poster", customTitle: "Headline" }),
      makeNode("i1", "imageInput", 100, { image: null }),
      makeNode("g1", "nanoBanana", 200, {}),
      makeNode("o1", "output", 300, {}),
    ];
  });

  it("renders typed fields for input nodes in reading order", () => {
    render(<AppWorkspace />);
    expect(screen.getByRole("heading", { name: "Poster maker" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Headline/)).toHaveValue("a poster");
    expect(screen.getByText("Choose image…")).toBeInTheDocument();
  });

  it("writes text edits through to the prompt node", () => {
    render(<AppWorkspace />);
    fireEvent.change(screen.getByLabelText(/Headline/), { target: { value: "new copy" } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith("p1", { prompt: "new copy" });
  });

  it("hides a field on request and offers to re-show it", () => {
    const first = render(<AppWorkspace />);
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" })[0]);
    expect(mockUpdateNodeData).toHaveBeenCalledWith("p1", { isTemplateInput: false });
    first.unmount();

    mockNodes = [
      makeNode("p1", "prompt", 0, { prompt: "a poster", customTitle: "Headline", isTemplateInput: false }),
      makeNode("o1", "output", 300, {}),
    ];
    render(<AppWorkspace />);
    expect(screen.queryByLabelText(/Headline/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(mockUpdateNodeData).toHaveBeenCalledWith("p1", { isTemplateInput: true });
  });

  it("runs the workflow from the Run button", () => {
    render(<AppWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(mockExecuteWorkflow).toHaveBeenCalledOnce();
  });

  it("disables Run while executing", () => {
    mockIsRunning = true;
    render(<AppWorkspace />);
    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
  });

  it("renders output-node results from connected inputs", () => {
    mockGetConnectedInputs.mockReturnValue({
      images: ["data:image/png;base64,RESULT"],
      videos: [],
      audio: [],
      text: null,
    });
    render(<AppWorkspace />);
    const img = screen.getByAltText("Output result 1") as HTMLImageElement;
    expect(img.src).toContain("data:image/png;base64,RESULT");
  });

  it("surfaces node errors after a failed run", () => {
    mockNodes = [
      makeNode("p1", "prompt", 0, { prompt: "x" }),
      makeNode("g1", "nanoBanana", 100, { status: "error", error: "API key not configured", customTitle: "Poster" }),
      makeNode("o1", "output", 200, {}),
    ];
    render(<AppWorkspace />);
    expect(screen.getByRole("alert")).toHaveTextContent("Poster: API key not configured");
  });

  it("returns to the canvas view", () => {
    render(<AppWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Canvas" }));
    expect(mockSetWorkspaceView).toHaveBeenCalledWith("canvas");
  });

  it("explains the empty state when no input nodes exist", () => {
    mockNodes = [makeNode("g1", "nanoBanana", 0, {})];
    render(<AppWorkspace />);
    expect(screen.getByText(/no input nodes yet/)).toBeInTheDocument();
    expect(screen.getByText(/Add an Output node/)).toBeInTheDocument();
  });
});
