import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateExplorerView } from "@/components/quickstart/TemplateExplorerView";

const { templates } = vi.hoisted(() => ({ templates: [
  { id: "product-shot", name: "Product Shot", description: "Create a product scene", icon: "", category: "simple", tags: ["Gemini"], workflow: { nodes: [], edges: [] } },
  { id: "style-transfer", name: "Style Transfer", description: "Refine the visual style", icon: "", category: "advanced", tags: ["Gemini"], workflow: { nodes: [], edges: [] } },
  { id: "scene-composite", name: "Scene Composite", description: "Compose several sources", icon: "", category: "advanced", tags: ["Gemini"], workflow: { nodes: [], edges: [] } },
] }));

vi.mock("@/lib/quickstart/templates", () => ({
  getAllPresets: () => templates,
  PRESET_TEMPLATES: templates,
}));

describe("TemplateExplorerView outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, workflows: [] }) });
  });

  it("organizes templates by creative outcome rather than complexity or provider", async () => {
    render(<TemplateExplorerView onBack={vi.fn()} onWorkflowSelected={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText("Loading")).not.toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compose" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simple" })).not.toBeInTheDocument();
    expect(screen.queryByText("Simple")).not.toBeInTheDocument();
    expect(screen.queryByText("Provider")).not.toBeInTheDocument();
  });

  it("filters preserved template data by outcome and search", async () => {
    render(<TemplateExplorerView onBack={vi.fn()} onWorkflowSelected={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Refine" }));

    expect(screen.getByText("Style Transfer")).toBeInTheDocument();
    expect(screen.queryByText("Product Shot")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search templates..."), { target: { value: "style" } });
    await waitFor(() => expect(screen.getByText("Style Transfer")).toBeInTheDocument());
  });

  it("applies Create, Refine, and Compose outcomes consistently to classified community workflows", async () => {
    const community = [
      { id: "community-create", name: "Campaign Generator", author: "A", description: "Generate launch imagery", filename: "create.json", size: 1, nodeCount: 3, tags: ["generation"] },
      { id: "community-refine", name: "Color Polish", author: "B", description: "Refine style and color", filename: "refine.json", size: 1, nodeCount: 3, tags: ["retouch"] },
      { id: "community-compose", name: "Community Scene Builder", author: "C", description: "Combine subjects and scenes", filename: "compose.json", size: 1, nodeCount: 3, tags: ["composition"] },
      { id: "community-unknown", name: "Utility Workflow", author: "D", description: "A useful starting point", filename: "unknown.json", size: 1, nodeCount: 2, tags: [] },
    ];
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true, workflows: community }) } as Response);
    render(<TemplateExplorerView onBack={vi.fn()} onWorkflowSelected={vi.fn()} />);
    await screen.findByText("Campaign Generator");

    expect(screen.getByText("Utility Workflow")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Campaign Generator")).toBeInTheDocument();
    expect(screen.queryByText("Color Polish")).not.toBeInTheDocument();
    expect(screen.queryByText("Community Scene Builder")).not.toBeInTheDocument();
    expect(screen.queryByText("Utility Workflow")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refine" }));
    expect(screen.getByText("Color Polish")).toBeInTheDocument();
    expect(screen.queryByText("Campaign Generator")).not.toBeInTheDocument();
    expect(screen.queryByText("Community Scene Builder")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compose" }));
    expect(screen.getByText("Community Scene Builder")).toBeInTheDocument();
    expect(screen.queryByText("Campaign Generator")).not.toBeInTheDocument();
    expect(screen.queryByText("Color Polish")).not.toBeInTheDocument();
  });
});
