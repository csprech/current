import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptWorkflowView } from "@/components/quickstart/PromptWorkflowView";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const proposal = {
  name: "Campaign studio",
  description: "Creates a campaign image from a product reference.",
  estimatedComplexity: "moderate",
  nodes: [
    { id: "input", type: "imageInput", purpose: "Source product", suggestedTitle: "Product" },
    { id: "generate", type: "nanoBanana", purpose: "Create campaign", suggestedTitle: "Campaign image" },
  ],
  connections: [
    { from: "input", to: "generate", type: "image", description: "Product reference" },
  ],
  warnings: ["Review brand details before publishing."],
};

const workflow = { id: "workflow-1", version: 1, name: "Campaign studio", edgeStyle: "curved", nodes: [], edges: [] };

function renderView(overrides: Partial<React.ComponentProps<typeof PromptWorkflowView>> = {}) {
  const props = { onBack: vi.fn(), onWorkflowGenerated: vi.fn(), ...overrides };
  render(<PromptWorkflowView {...props} />);
  return props;
}

async function requestProposal() {
  fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Create a campaign studio" } });
  fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
  await screen.findByRole("heading", { name: "Campaign studio" });
}

describe("PromptWorkflowView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, proposal }) });
  });

  it("validates the description before requesting a proposal", () => {
    renderView();
    expect(screen.getByRole("button", { name: "Review workflow" })).toBeDisabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("requests and renders a reviewable proposal without applying a workflow", async () => {
    const props = renderView();
    await requestProposal();

    expect(mockFetch).toHaveBeenCalledWith("/api/quickstart/propose", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ description: "Create a campaign studio" }),
    }));
    expect(screen.getByText("Source product")).toBeInTheDocument();
    expect(screen.getByText("Product reference")).toBeInTheDocument();
    expect(screen.getByText("Review brand details before publishing.")).toBeInTheDocument();
    expect(props.onWorkflowGenerated).not.toHaveBeenCalled();
  });

  it("only builds and applies the workflow after explicit confirmation", async () => {
    const onWorkflowGenerated = vi.fn();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, workflow }) });
    renderView({ onWorkflowGenerated });
    await requestProposal();

    fireEvent.click(screen.getByRole("button", { name: "Build workflow" }));

    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith("/api/quickstart", expect.objectContaining({
      body: JSON.stringify({ description: "Create a campaign studio", contentLevel: "full" }),
    })));
    await waitFor(() => expect(onWorkflowGenerated).toHaveBeenCalledWith(workflow));
  });

  it("returns from review to an editable description without applying", async () => {
    const props = renderView();
    await requestProposal();

    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));

    expect(screen.getByLabelText("Describe your workflow")).toHaveValue("Create a campaign studio");
    expect(props.onWorkflowGenerated).not.toHaveBeenCalled();
  });

  it("shows proposal and build errors inline and keeps the user in the current step", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: "Proposal unavailable" }) });
    renderView();
    fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByText("Proposal unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe your workflow")).toBeInTheDocument();
  });

  it("uses the launchpad Back route from the editing step", () => {
    const onBack = vi.fn();
    renderView({ onBack });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
