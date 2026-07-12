import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddPalette } from "@/components/workspace/AddPalette";
import { NODE_CATALOG, matchesNodeCatalogItem } from "@/components/workspace/nodeCatalog";

const mockAddNode = vi.fn();
const mockSetModelSearchOpen = vi.fn();
const mockSetEdgeStyle = vi.fn();
const mockScreenToFlowPosition = vi.fn((point) => ({ x: point.x - 10, y: point.y - 20 }));

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({ screenToFlowPosition: mockScreenToFlowPosition }),
}));

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => selector({
    addNode: mockAddNode,
    edgeStyle: "angular",
    setEdgeStyle: mockSetEdgeStyle,
    setModelSearchOpen: mockSetModelSearchOpen,
  }),
}));

describe("node catalog", () => {
  it("covers every registered non-group node exactly once", () => {
    const registered = [
      "imageInput", "audioInput", "videoInput", "annotation", "prompt", "array",
      "promptConstructor", "nanoBanana", "generateVideo", "generate3d", "generateAudio",
      "llmGenerate", "splitGrid", "output", "outputGallery", "imageCompare", "videoStitch",
      "easeCurve", "videoTrim", "videoFrameGrab", "removeBackground", "router", "switch",
      "conditionalSwitch", "glbViewer",
    ];
    expect(NODE_CATALOG.map((item) => item.type).sort()).toEqual(registered.sort());
    expect(new Set(NODE_CATALOG.map((item) => item.type))).toHaveProperty("size", 25);
    expect(NODE_CATALOG.every((item) => item.label && ["Input", "Generate", "Process", "Route", "Output"].includes(item.category))).toBe(true);
  });

  it("normalizes names and keywords for search", () => {
    const viewer = NODE_CATALOG.find((item) => item.type === "glbViewer")!;
    expect(matchesNodeCatalogItem(viewer, "3d VIEWER")).toBe(true);
    expect(matchesNodeCatalogItem(viewer, "model")).toBe(true);
  });
});

describe("AddPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '<div class="react-flow"></div>';
    vi.spyOn(document.querySelector(".react-flow")!, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50, toJSON: () => ({}),
    });
  });

  it("renders nothing while closed and focuses search when opened", async () => {
    const { rerender } = render(<AddPalette open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog", { name: "Add node" })).not.toBeInTheDocument();
    rerender(<AddPalette open onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Search nodes" })).toHaveFocus());
  });

  it("filters nodes by name and keyword", () => {
    render(<AddPalette open onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search nodes" }), { target: { value: "video" } });
    expect(screen.getByRole("button", { name: "Generate video" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prompt" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search nodes" }), { target: { value: "music" } });
    expect(screen.getByRole("button", { name: "Audio input" })).toBeInTheDocument();
  });

  it("filters by category and shows an empty state", () => {
    render(<AddPalette open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(screen.getByRole("button", { name: "Router" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prompt" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search nodes" }), { target: { value: "no-such-node" } });
    expect(screen.getByText("No nodes found")).toBeInTheDocument();
  });

  it("adds a node at the pane center, closes, and records unique recents", () => {
    const onClose = vi.fn();
    render(<AddPalette open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Image input" }));
    expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 500, y: 350 });
    expect(mockAddNode).toHaveBeenCalledWith("imageInput", { x: 490, y: 330 });
    expect(onClose).toHaveBeenCalledOnce();
    expect(JSON.parse(sessionStorage.getItem("current:add-palette-recents")!)).toEqual(["imageInput"]);
  });

  it("keeps recents unique and limited", () => {
    render(<AddPalette open onClose={vi.fn()} />);
    for (const type of ["imageInput", "audioInput", "videoInput", "prompt", "array", "output", "imageInput"]) {
      fireEvent.click(document.getElementById(`add-node-${type}`)!);
    }
    const recents = JSON.parse(sessionStorage.getItem("current:add-palette-recents")!);
    expect(recents).toHaveLength(5);
    expect(new Set(recents)).toHaveProperty("size", 5);
    expect(recents[0]).toBe("imageInput");
  });

  it("restores focus to the opener after Escape", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    render(<AddPalette open onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Search nodes" })).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes from the backdrop when no drag is active", () => {
    const onClose = vi.fn();
    render(<AddPalette open onClose={onClose} />);
    fireEvent.mouseDown(document.querySelector(".current-add-palette__backdrop")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("preserves drag creation without adding immediately", () => {
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    render(<AddPalette open onClose={vi.fn()} />);
    fireEvent.dragStart(screen.getByRole("button", { name: "Prompt" }), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith("application/node-type", "prompt");
    expect(mockAddNode).not.toHaveBeenCalled();
  });

  it("lets a palette drag reach the canvas and restores backdrop behavior after dragend", () => {
    const data = new Map<string, string>();
    const dataTransfer = {
      types: ["application/node-type"], items: [], files: [], dropEffect: "copy", effectAllowed: "",
      setData: vi.fn((type: string, value: string) => data.set(type, value)),
      getData: vi.fn((type: string) => data.get(type) || ""),
    };
    render(
      <>
        <div data-testid="canvas-drop-target" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          mockAddNode(event.dataTransfer.getData("application/node-type"), { x: 20, y: 30 });
        }} />
        <AddPalette open onClose={vi.fn()} />
      </>
    );
    const prompt = screen.getByRole("button", { name: "Prompt" });
    fireEvent.dragStart(prompt, { dataTransfer });
    expect(document.querySelector(".current-add-palette__backdrop")).toHaveClass("is-dragging");
    fireEvent.dragOver(screen.getByTestId("canvas-drop-target"), { dataTransfer });
    fireEvent.drop(screen.getByTestId("canvas-drop-target"), { dataTransfer });
    expect(mockAddNode).toHaveBeenCalledWith("prompt", { x: 20, y: 30 });
    fireEvent.dragEnd(prompt, { dataTransfer });
    expect(document.querySelector(".current-add-palette__backdrop")).not.toHaveClass("is-dragging");
  });

  it("does not record a cancelled drag", () => {
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "none" };
    render(<AddPalette open onClose={vi.fn()} />);
    const prompt = screen.getByRole("button", { name: "Prompt" });
    fireEvent.dragStart(prompt, { dataTransfer });
    fireEvent.dragEnd(prompt, { dataTransfer });
    expect(sessionStorage.getItem("current:add-palette-recents")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Add node" })).toBeInTheDocument();
  });

  it("supports result keyboard navigation and Escape", () => {
    const onClose = vi.fn();
    render(<AddPalette open onClose={onClose} />);
    const search = screen.getByRole("searchbox", { name: "Search nodes" });
    fireEvent.keyDown(search, { key: "End" });
    fireEvent.keyDown(search, { key: "Home" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(mockAddNode).toHaveBeenCalledWith("audioInput", expect.any(Object));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps model browsing and connector style controls reachable", () => {
    render(<AddPalette open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Browse models" }));
    expect(mockSetModelSearchOpen).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Connector style: Angular" }));
    expect(mockSetEdgeStyle).toHaveBeenCalledWith("curved");
  });
});
