import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("enables review only for a trimmed description of at least three characters", () => {
    renderView();
    const input = screen.getByLabelText("Describe your workflow");
    fireEvent.change(input, { target: { value: "  ab  " } });
    expect(screen.getByRole("button", { name: "Review workflow" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "  abc  " } });
    expect(screen.getByRole("button", { name: "Review workflow" })).toBeEnabled();
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

  it("shows the exact prompt, template, model, safe settings, groups, and flow descriptions that will be applied", async () => {
    const configuredProposal = {
      ...proposal,
      nodes: [
        { id: "prompt", type: "prompt", purpose: "Campaign brief", suggestedTitle: "Brief", suggestedPrompt: "Photograph the launch product" },
        { id: "template", type: "promptConstructor", purpose: "Compose prompt", suggestedTitle: "Prompt template", suggestedPrompt: "{{subject}} in {{scene}}" },
        { id: "generate", type: "nanoBanana", purpose: "Create campaign", suggestedTitle: "Campaign image", suggestedModel: "nano-banana-pro", suggestedSettings: { aspectRatio: "16:9", resolution: "2K", customTitle: "Injected" } },
      ],
      connections: [
        { from: "prompt", to: "generate", type: "text", description: "The reviewed brief drives image generation" },
      ],
      groups: [
        { name: "Campaign generation", color: "blue", nodeIds: ["prompt", "template", "generate"], purpose: "Keeps approved generation steps together" },
      ],
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal: configuredProposal }) });
    renderView();
    await requestProposal();

    expect(screen.getByText("Prompt: Photograph the launch product")).toBeInTheDocument();
    expect(screen.getByText("Template: {{subject}} in {{scene}}")).toBeInTheDocument();
    expect(screen.getByText("Model: nano-banana-pro")).toBeInTheDocument();
    expect(screen.getByText("Aspect ratio: 16:9")).toBeInTheDocument();
    expect(screen.getByText("Resolution: 2K")).toBeInTheDocument();
    expect(screen.queryByText(/Injected/)).not.toBeInTheDocument();
    expect(screen.getByText("Campaign generation")).toBeInTheDocument();
    expect(screen.getByText("Color: blue")).toBeInTheDocument();
    expect(screen.getByText("Keeps approved generation steps together")).toBeInTheDocument();
    expect(screen.getByText("Brief, Prompt template, Campaign image")).toBeInTheDocument();
    expect(screen.getByText("The reviewed brief drives image generation")).toBeInTheDocument();
  });

  it("builds the exact reviewed proposal locally after explicit confirmation without a second generation", async () => {
    const onWorkflowGenerated = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal }) });
    renderView({ onWorkflowGenerated });
    await requestProposal();

    fireEvent.click(screen.getByRole("button", { name: "Build workflow" }));

    await waitFor(() => expect(onWorkflowGenerated).toHaveBeenCalledOnce());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const applied = onWorkflowGenerated.mock.calls[0][0];
    expect(applied.nodes.map((node: { id: string }) => node.id)).toEqual(["input", "generate"]);
    expect(applied.edges).toEqual([expect.objectContaining({ source: "input", target: "generate", sourceHandle: "image", targetHandle: "image" })]);
  });

  it("returns from review to an editable description without applying", async () => {
    const props = renderView();
    await requestProposal();

    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));

    expect(screen.getByLabelText("Describe your workflow")).toHaveValue("Create a campaign studio");
    expect(props.onWorkflowGenerated).not.toHaveBeenCalled();
  });

  it("replaces the reviewed proposal after editing and applies only the replacement", async () => {
    const replacement = {
      ...proposal,
      name: "Replacement flow",
      nodes: [{ id: "replacement", type: "prompt", purpose: "New brief", suggestedTitle: "Replacement brief", suggestedPrompt: "New prompt" }],
      connections: [],
    };
    const onWorkflowGenerated = vi.fn();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal: replacement }) });
    renderView({ onWorkflowGenerated });
    await requestProposal();
    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
    fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Build a replacement" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByRole("heading", { name: "Replacement flow" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Build workflow" }));

    expect(onWorkflowGenerated).toHaveBeenCalledWith(expect.objectContaining({
      name: "Replacement flow",
      nodes: [expect.objectContaining({ id: "replacement" })],
    }));
  });

  it("shows proposal and build errors inline and keeps the user in the current step", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: "Proposal unavailable" }) });
    renderView();
    fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByText("Proposal unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe your workflow")).toBeInTheDocument();
  });

  it("uses a default proposal error when the API omits error text", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false }) });
    renderView();
    fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByText("Failed to prepare workflow proposal")).toBeInTheDocument();
  });

  it("shows thrown network errors and allows a successful retry", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal }) });
    renderView();
    fireEvent.change(screen.getByLabelText("Describe your workflow"), { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByText("Network unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByRole("heading", { name: "Campaign studio" })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("disables editing, review, and Back controls while a proposal is pending", async () => {
    let resolveProposal!: (response: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((resolve) => { resolveProposal = resolve; }));
    renderView();
    const input = screen.getByLabelText("Describe your workflow");
    fireEvent.change(input, { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));

    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    await act(async () => {
      resolveProposal({ ok: true, json: async () => ({ success: true, proposal }) });
    });
    expect(await screen.findByRole("heading", { name: "Campaign studio" })).toBeInTheDocument();
  });

  it("keeps the reviewed proposal visible when deterministic conversion fails", async () => {
    const invalidProposal = { ...proposal, connections: [{ ...proposal.connections[0], to: "missing" }] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, proposal: invalidProposal }) });
    const props = renderView();
    await requestProposal();
    fireEvent.click(screen.getByRole("button", { name: "Build workflow" }));

    expect(await screen.findByText(/Invalid workflow proposal/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign studio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build workflow" })).toBeEnabled();
    expect(props.onWorkflowGenerated).not.toHaveBeenCalled();
  });

  it("clears an inline error when the description is edited", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));
    renderView();
    const input = screen.getByLabelText("Describe your workflow");
    fireEvent.change(input, { target: { value: "Create a campaign studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Review workflow" }));
    expect(await screen.findByText("Network unavailable")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Create another campaign studio" } });
    expect(screen.queryByText("Network unavailable")).not.toBeInTheDocument();
  });

  it("uses the launchpad Back route from the editing step", () => {
    const onBack = vi.fn();
    renderView({ onBack });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
