import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ActivityPanel } from "../ActivityPanel";
import { useWorkflowStore } from "@/store/workflowStore";

describe("ActivityPanel", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      nodes: [
        { id: "running", type: "nanoBanana", position: { x: 0, y: 0 }, data: { progress: 64, status: "loading" } } as never,
        { id: "waiting", type: "output", position: { x: 0, y: 0 }, data: {} } as never,
        { id: "complete", type: "splitGrid", position: { x: 0, y: 0 }, data: { customTitle: "Finished split", status: "complete", childNodeIds: ["child-1"] } } as never,
        { id: "error", type: "videoTrim", position: { x: 0, y: 0 }, data: { customTitle: "Broken trim", status: "error", error: "Encoder failed" } } as never,
        { id: "skipped", type: "prompt", position: { x: 0, y: 0 }, data: { customTitle: "Optional prompt", status: "skipped" } } as never,
      ],
      isRunning: true,
      currentNodeIds: ["running"],
      skippedNodeIds: new Set(),
      dimmedNodeIds: new Set(),
      groups: {},
    });
  });

  it("uses canonical executor and node-aware states without creating execution state", () => {
    render(<ActivityPanel onClose={vi.fn()} />);
    expect(within(screen.getByText("Generate image").closest(".current-activity__row")!).getByText("64%")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(1);
    expect(within(screen.getByText("Finished split").closest(".current-activity__row")!).getByText("Complete")).toBeInTheDocument();
    expect(within(screen.getByText("Broken trim").closest(".current-activity__row")!).getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Encoder failed")).toBeInTheDocument();
    expect(within(screen.getByText("Optional prompt").closest(".current-activity__row")!).getByText("Skipped")).toBeInTheDocument();
  });

  it("shows idle nodes as ready only when no execution is in progress", () => {
    useWorkflowStore.setState({ isRunning: false, currentNodeIds: [] });
    render(<ActivityPanel onClose={vi.fn()} />);
    expect(within(screen.getByText("Output").closest(".current-activity__row")!).getByText("Ready")).toBeInTheDocument();
  });

  it("augments canonical states with skipped, disabled, and locked workflow semantics", () => {
    useWorkflowStore.setState({
      nodes: [
        { id: "locked", type: "prompt", groupId: "group", position: { x: 0, y: 0 }, data: { customTitle: "Locked prompt" } } as never,
        { id: "disabled", type: "prompt", position: { x: 0, y: 0 }, data: { customTitle: "Disabled prompt" } } as never,
        { id: "skipped", type: "prompt", position: { x: 0, y: 0 }, data: { customTitle: "Skipped prompt" } } as never,
      ],
      groups: { group: { id: "group", name: "Group", locked: true } } as never,
      dimmedNodeIds: new Set(["disabled"]),
      skippedNodeIds: new Set(["skipped"]),
      currentNodeIds: [],
      isRunning: true,
    });
    render(<ActivityPanel onClose={vi.fn()} />);
    expect(within(screen.getByText("Locked prompt").closest(".current-activity__row")!).getByText("Locked")).toBeInTheDocument();
    expect(within(screen.getByText("Disabled prompt").closest(".current-activity__row")!).getByText("Disabled")).toBeInTheDocument();
    expect(within(screen.getByText("Skipped prompt").closest(".current-activity__row")!).getByText("Skipped")).toBeInTheDocument();
  });
});
