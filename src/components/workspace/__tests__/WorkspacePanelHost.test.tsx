import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { WorkspacePanelHost } from "../WorkspacePanelHost";
import { useWorkflowStore } from "@/store/workflowStore";

vi.mock("@/components/AssetLibrary", () => ({ AssetLibrary: () => <div>Saved assets</div> }));
vi.mock("@/components/GlobalImageHistory", () => ({ GlobalImageHistory: () => <div>Generation history</div> }));
vi.mock("@/components/ChatPanel", () => ({ ChatPanel: ({ onClose }: { onClose: () => void }) => <aside aria-label="Assistant">Assistant content<button onClick={onClose}>Close Assistant</button></aside> }));
vi.mock("@/components/nodes/ControlPanel", () => ({
  ControlPanel: ({ onClose }: { onClose: () => void }) => {
    const [draft, setDraft] = useState("");
    return <aside aria-label="Inspector"><input aria-label="Inspector draft" value={draft} onChange={(event) => setDraft(event.target.value)} /><button onClick={onClose}>Close Inspector</button></aside>;
  },
}));

describe("WorkspacePanelHost", () => {
  beforeEach(() => {
    useWorkflowStore.setState({ activeLeftPanel: null, activeRightPanel: null });
  });

  it("renders the selected left panel and only one right panel", () => {
    useWorkflowStore.setState({ activeLeftPanel: "library", activeRightPanel: "activity" });
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);

    expect(screen.getByRole("complementary", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Assistant" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();
  });

  it("falls back to the inspector when no transient right panel is active", () => {
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);
    expect(screen.getByRole("complementary", { name: "Inspector" })).toBeInTheDocument();
  });

  it("closes and reopens the inspector without changing selection", () => {
    useWorkflowStore.setState({ nodes: [{ id: "selected", type: "prompt", position: { x: 0, y: 0 }, selected: true, data: {} } as never] });
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Close Inspector" }));
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();
    expect(useWorkflowStore.getState().nodes[0]?.selected).toBe(true);
    act(() => useWorkflowStore.getState().setActiveRightPanel("activity"));
    act(() => useWorkflowStore.getState().setActiveRightPanel(null));
    expect(screen.getByRole("complementary", { name: "Inspector" })).toBeInTheDocument();
    expect(useWorkflowStore.getState().nodes[0]?.selected).toBe(true);
  });

  it("reopens a dismissed inspector when a different configurable node is selected", () => {
    useWorkflowStore.setState({ nodes: [
      { id: "image", type: "nanoBanana", position: { x: 0, y: 0 }, selected: true, data: {} } as never,
      { id: "video", type: "generateVideo", position: { x: 0, y: 0 }, selected: false, data: {} } as never,
    ] });
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Close Inspector" }));
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();

    act(() => useWorkflowStore.setState({ nodes: useWorkflowStore.getState().nodes.map((node) => node.id === "image" ? { ...node, data: { ...node.data, progress: 12 } } : node) }));
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();

    act(() => useWorkflowStore.setState({ nodes: useWorkflowStore.getState().nodes.map((node) => ({ ...node, selected: node.id === "video" })) }));

    expect(screen.getByRole("complementary", { name: "Inspector" })).toBeInTheDocument();
    expect(useWorkflowStore.getState().nodes.find((node) => node.id === "video")?.selected).toBe(true);
    expect(useWorkflowStore.getState().nodes.find((node) => node.id === "image")?.selected).toBe(false);
  });

  it("keeps inspector-local state mounted while Activity replaces it", () => {
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Inspector draft" }), { target: { value: "preserved" } });
    act(() => useWorkflowStore.getState().setActiveRightPanel("activity"));
    expect(screen.queryByRole("complementary", { name: "Inspector" })).not.toBeInTheDocument();
    act(() => useWorkflowStore.getState().setActiveRightPanel(null));
    expect(screen.getByRole("textbox", { name: "Inspector draft" })).toHaveValue("preserved");
    act(() => useWorkflowStore.getState().setActiveRightPanel("assistant"));
    expect(screen.queryByRole("textbox", { name: "Inspector draft" })).not.toBeInTheDocument();
    act(() => useWorkflowStore.getState().setActiveRightPanel(null));
    expect(screen.getByRole("textbox", { name: "Inspector draft" })).toHaveValue("preserved");
  });

  it("returns focus from the custom Assistant panel to its command trigger", async () => {
    function Harness() {
      return <><button onClick={() => useWorkflowStore.getState().setActiveRightPanel("assistant")}>Open assistant</button><WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} /></>;
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open assistant" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Close Assistant" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("does not leave focus in the hidden Inspector", () => {
    render(<WorkspacePanelHost assistantProps={{ isOpen: true, onClose: vi.fn() }} />);
    const draft = screen.getByRole("textbox", { name: "Inspector draft" });
    draft.focus();
    act(() => useWorkflowStore.getState().setActiveRightPanel("activity"));
    expect(draft).not.toHaveFocus();
  });
});
