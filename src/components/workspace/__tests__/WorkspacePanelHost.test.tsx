import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspacePanelHost } from "../WorkspacePanelHost";
import { useWorkflowStore } from "@/store/workflowStore";

vi.mock("@/components/AssetLibrary", () => ({ AssetLibrary: () => <div>Saved assets</div> }));
vi.mock("@/components/GlobalImageHistory", () => ({ GlobalImageHistory: () => <div>Generation history</div> }));
vi.mock("@/components/ChatPanel", () => ({ ChatPanel: () => <aside aria-label="Assistant">Assistant content</aside> }));
vi.mock("@/components/nodes/ControlPanel", () => ({ ControlPanel: () => <aside aria-label="Inspector">Inspector content</aside> }));

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
});
