import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlPanel } from "@/components/nodes/ControlPanel";

const updateNodeData = vi.fn();
const state = {
  nodes: [{
    id: "ease-1",
    type: "easeCurve",
    selected: true,
    data: { bezierHandles: [0.42, 0, 0.58, 1], outputDuration: 1.5, easingPreset: null as string | null },
  }],
  updateNodeData,
  regenerateNode: vi.fn(),
  isRunning: false,
  edges: [],
  removeEdge: vi.fn(),
};

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (value: typeof state) => unknown) => selector(state),
  saveNanoBananaDefaults: vi.fn(),
  useProviderApiKeys: () => ({}),
}));

vi.mock("@/hooks/useInlineParameters", () => ({
  useInlineParameters: () => ({ inlineParametersEnabled: false }),
}));

vi.mock("@/components/current/CurrentPanel", () => ({
  CurrentPanel: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/CubicBezierEditor", () => ({
  CubicBezierEditor: () => <div>Bezier editor</div>,
}));

describe("ControlPanel easing presets semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.nodes[0].data.easingPreset = null;
  });

  it("uses a labeled group of ordinary buttons instead of an incomplete menu composite", () => {
    render(<ControlPanel onClose={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Presets" });
    fireEvent.click(trigger);

    const presets = screen.getByRole("group", { name: "Easing presets" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
    expect(presets.querySelectorAll("button").length).toBeGreaterThan(1);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", presets.id);
  });

  it("closes on Escape and restores focus to the presets trigger", () => {
    render(<ControlPanel onClose={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Presets" });
    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "Easing presets" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("group", { name: "Easing presets" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("moves focus to the first preset and returns it after selection", () => {
    render(<ControlPanel onClose={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Presets" });
    fireEvent.click(trigger);

    const firstPreset = screen.getByRole("button", { name: "Use linear easing preset" });
    expect(firstPreset).toHaveFocus();
    fireEvent.click(firstPreset);

    expect(screen.queryByRole("group", { name: "Easing presets" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("focuses the current preset and preserves focus through rerender and outside close", () => {
    state.nodes[0].data.easingPreset = "easeOutQuad";
    const { rerender } = render(<ControlPanel onClose={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Presets" });
    fireEvent.click(trigger);
    const currentPreset = screen.getByRole("button", { name: "Use easeOutQuad easing preset" });
    expect(currentPreset).toHaveFocus();

    rerender(<ControlPanel onClose={vi.fn()} />);
    expect(currentPreset).toHaveFocus();
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("group", { name: "Easing presets" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("uses the inspector's primary action and field treatments for image generation", () => {
    state.nodes = [{
      id: "image-1",
      type: "nanoBanana",
      selected: true,
      data: { model: "nano-banana-pro", aspectRatio: "1:1", resolution: "1K" },
    }];

    render(<ControlPanel onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Browse" })).toHaveClass("current-inspector__browse");
    expect(screen.getByRole("button", { name: "Run" })).toHaveClass("current-inspector__run");
    expect(screen.getByLabelText("Aspect Ratio")).toHaveClass("current-inspector__field");
  });
});
