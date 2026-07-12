import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Launchpad } from "@/components/workspace/Launchpad";

vi.mock("@/components/quickstart/TemplateExplorerView", () => ({
  TemplateExplorerView: ({ onBack }: { onBack: () => void }) => (
    <div><span>Template explorer content</span><button onClick={onBack}>Back</button></div>
  ),
}));

vi.mock("@/components/quickstart/PromptWorkflowView", () => ({
  PromptWorkflowView: ({ onBack }: { onBack: () => void }) => (
    <div><span>Workflow description content</span><button onClick={onBack}>Back</button></div>
  ),
}));

vi.mock("@/components/quickstart/WorkflowBrowserView", () => ({
  WorkflowBrowserView: ({ onBack }: { onBack: () => void }) => (
    <div><span>Project browser content</span><button onClick={onBack}>Back</button></div>
  ),
}));

describe("Launchpad", () => {
  const props = {
    onNewCanvas: vi.fn(),
    onWorkflowGenerated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("offers every approved starting route", () => {
    render(<Launchpad {...props} />);

    expect(screen.getByRole("button", { name: "New canvas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Describe a workflow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open project" })).toBeInTheDocument();
  });

  it("is a workspace view, not a modal", () => {
    render(<Launchpad {...props} />);

    expect(screen.getByRole("main", { name: "Current launchpad" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("routes to a child view and returns to the starting routes", () => {
    render(<Launchpad {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Browse templates" }));
    expect(screen.getByText("Template explorer content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "New canvas" })).toBeInTheDocument();
  });

  it("shows recent projects ordered by existing last-saved metadata", () => {
    localStorage.setItem("node-banana-workflow-configs", JSON.stringify({
      older: { workflowId: "older", name: "Older project", directoryPath: "/work/older", generationsPath: null, lastSavedAt: 100 },
      newer: { workflowId: "newer", name: "Newest project", directoryPath: "/work/newer", generationsPath: null, lastSavedAt: 200 },
    }));

    render(<Launchpad {...props} />);

    const recentButtons = screen.getAllByRole("button", { name: /project, Last saved/ });
    expect(recentButtons[0]).toHaveAccessibleName(/Newest project/);
    expect(recentButtons[1]).toHaveAccessibleName(/Older project/);
  });

  it("prefers last-opened metadata and falls back to legacy last-saved timestamps", () => {
    localStorage.setItem("node-banana-workflow-configs", JSON.stringify({
      savedLater: { workflowId: "savedLater", name: "Saved later", directoryPath: "/work/saved", generationsPath: null, lastSavedAt: 500 },
      openedLater: { workflowId: "openedLater", name: "Opened later", directoryPath: "/work/opened", generationsPath: null, lastSavedAt: 100, lastOpenedAt: 900 },
      malformed: { workflowId: "malformed", name: "Malformed", directoryPath: 42, lastSavedAt: "yesterday" },
    }));

    render(<Launchpad {...props} />);

    const buttons = screen.getAllByRole("button", { name: /Last (opened|saved)/ });
    expect(buttons[0]).toHaveAccessibleName(/Opened later/);
    expect(buttons[1]).toHaveAccessibleName(/Saved later/);
    expect(screen.queryByText("Malformed")).not.toBeInTheDocument();
  });

  it("opens a selected recent project through the existing workflow load endpoint", async () => {
    const workflow = { id: "recent", version: 1, name: "Recent project", edgeStyle: "curved", nodes: [], edges: [] };
    localStorage.setItem("node-banana-workflow-configs", JSON.stringify({
      recent: { workflowId: "recent", name: "Recent project", directoryPath: "/work/recent", generationsPath: null, lastSavedAt: 100 },
      other: { workflowId: "other", name: "Other project", directoryPath: "/work/other", generationsPath: "/work/other/generations", lastSavedAt: 200 },
    }));
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true, workflow }) } as Response);

    const view = render(<Launchpad {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Recent project, Last saved/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/workflow?path=%2Fwork%2Frecent&load=true"));
    await waitFor(() => expect(props.onWorkflowGenerated).toHaveBeenCalledWith(workflow, "/work/recent"));
    const persisted = JSON.parse(localStorage.getItem("node-banana-workflow-configs")!);
    expect(persisted.recent.lastOpenedAt).toEqual(expect.any(Number));
    expect(persisted.recent).toEqual(expect.objectContaining({ name: "Recent project", directoryPath: "/work/recent", lastSavedAt: 100 }));
    expect(persisted.other).toEqual(expect.objectContaining({ name: "Other project", generationsPath: "/work/other/generations" }));
    view.unmount();
    render(<Launchpad {...props} />);
    const refreshed = screen.getAllByRole("button", { name: /Last (opened|saved)/ });
    expect(refreshed[0]).toHaveAccessibleName(/Recent project, Last opened/);
  });

  it("safely ignores malformed recent-project storage", () => {
    localStorage.setItem("node-banana-workflow-configs", "not-json");
    expect(() => render(<Launchpad {...props} />)).not.toThrow();
    expect(screen.queryByText("Recent projects")).not.toBeInTheDocument();
  });
});
