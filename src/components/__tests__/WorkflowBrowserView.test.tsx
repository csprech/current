import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorkflowBrowserView } from "@/components/quickstart/WorkflowBrowserView";
import {
  STORAGE_KEY,
  WORKFLOWS_DIRECTORY_KEY,
} from "@/store/utils/localStorage";

const workflow = {
  id: "wf-1",
  version: 1,
  name: "Studio Flow",
  edgeStyle: "curved",
  nodes: [],
  edges: [],
};

const savedConfig = {
  workflowId: "wf-1",
  name: "Studio Flow",
  directoryPath: "/workflows/studio-flow",
  generationsPath: null,
  lastSavedAt: 100,
};

function listResponse() {
  return {
    success: true,
    workflows: [
      {
        name: "Studio Flow",
        directoryPath: "/workflows/studio-flow",
        relativePath: "studio-flow",
        lastModified: 100,
      },
    ],
  };
}

describe("WorkflowBrowserView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem(WORKFLOWS_DIRECTORY_KEY, "/workflows");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ "wf-1": savedConfig }));
  });

  it("records a successful listed workflow open", async () => {
    const onWorkflowLoaded = vi.fn();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ json: async () => listResponse() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, workflow }),
      } as Response);

    render(<WorkflowBrowserView onWorkflowLoaded={onWorkflowLoaded} />);
    fireEvent.click(await screen.findByRole("button", { name: /Studio Flow/ }));

    await waitFor(() => expect(onWorkflowLoaded).toHaveBeenCalledWith(workflow, "/workflows/studio-flow"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["wf-1"]).toEqual({
      ...savedConfig,
      lastOpenedAt: expect.any(Number),
    });
  });

  it("uses the adaptive browser surface for readable actions", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({ json: async () => listResponse() } as Response);

    render(<WorkflowBrowserView onWorkflowLoaded={vi.fn()} />);

    expect((await screen.findByRole("heading", { name: "Your Workflows" })).closest(".current-workflow-browser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open from directory" })).toHaveClass("current-workflow-browser__directory-action");
    expect(screen.getByRole("button", { name: "Change folder" })).toHaveClass("current-workflow-browser__change-folder");
  });

  it("does not record a failed workflow open", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ json: async () => listResponse() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: false, error: "Unable to load" }),
      } as Response);

    render(<WorkflowBrowserView onWorkflowLoaded={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Studio Flow/ }));

    expect(await screen.findByText("Unable to load")).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["wf-1"]).toEqual(savedConfig);
  });

  it("records a directory-picked workflow open by its saved directory", async () => {
    const pickedWorkflow = { ...workflow, id: "legacy-file-id" };
    const onWorkflowLoaded = vi.fn();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ json: async () => listResponse() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, cancelled: false, path: "/workflows/studio-flow" }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, workflow: pickedWorkflow }),
      } as Response);

    render(<WorkflowBrowserView onWorkflowLoaded={onWorkflowLoaded} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open from directory" }));

    await waitFor(() => expect(onWorkflowLoaded).toHaveBeenCalledWith(pickedWorkflow, "/workflows/studio-flow"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["wf-1"]).toEqual({
      ...savedConfig,
      lastOpenedAt: expect.any(Number),
    });
  });

  it("continues a successful workflow open when recency persistence fails", async () => {
    const onWorkflowLoaded = vi.fn();
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({ json: async () => listResponse() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, workflow }),
      } as Response);
    render(<WorkflowBrowserView onWorkflowLoaded={onWorkflowLoaded} />);
    const workflowButton = await screen.findByRole("button", { name: /Studio Flow/ });
    const setItem = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new DOMException("Storage denied", "SecurityError"); });

    fireEvent.click(workflowButton);

    await waitFor(() => expect(onWorkflowLoaded).toHaveBeenCalledWith(workflow, "/workflows/studio-flow"));
    expect(setItem).toHaveBeenCalled();
    expect(screen.queryByText(/Storage denied/)).not.toBeInTheDocument();
  });
});
