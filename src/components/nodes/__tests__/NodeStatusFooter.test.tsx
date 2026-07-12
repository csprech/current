import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeStatusFooter } from "@/components/nodes/NodeStatusFooter";

describe("NodeStatusFooter", () => {
  it("shows the reason for a skipped node", () => {
    render(
      <NodeStatusFooter
        state="skipped"
        label="Skipped"
        detail="Missing optional image input"
      />
    );

    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.getByText("Missing optional image input")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "skipped");
  });

  it("offers recovery for an error", () => {
    const retry = vi.fn();
    render(
      <NodeStatusFooter
        state="error"
        label="Connection failed"
        detail="Provider did not respond"
        action={{ label: "Retry", onClick: retry }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("exposes a textual running state without relying on animation", () => {
    render(<NodeStatusFooter state="running" label="Running" />);

    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
