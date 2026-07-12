import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
