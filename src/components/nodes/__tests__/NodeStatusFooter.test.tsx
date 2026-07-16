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

  it("keeps dynamic metadata outside the polite live region", () => {
    render(<NodeStatusFooter state="complete" label="Complete" detail="128 characters" />);
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("Complete");
    expect(liveRegion).not.toHaveTextContent("128 characters");
    expect(screen.getByText("128 characters")).not.toHaveAttribute("aria-live");
  });

  it("keeps the status footer available as a node drag surface", () => {
    render(<NodeStatusFooter state="complete" label="Complete" detail="128 characters" />);

    const footer = screen.getByRole("status").closest(".current-node-status");
    expect(footer).toHaveAttribute("data-drag-surface", "true");
    expect(footer).not.toHaveClass("nodrag");
  });

  it("keeps footer actions interactive instead of draggable", () => {
    render(
      <NodeStatusFooter
        state="error"
        label="Connection failed"
        action={{ label: "View error details", onClick: vi.fn() }}
      />,
    );

    expect(screen.getByRole("button", { name: "View error details" })).toHaveClass("nodrag", "nopan");
  });
});
