import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FocusWorkspace } from "@/components/workspace/FocusWorkspace";

describe("FocusWorkspace", () => {
  it("provides an accessible focused editor with a canvas return action", () => {
    const onBack = vi.fn();
    render(
      <FocusWorkspace title="Annotate" onBack={onBack} primaryAction={<button>Done</button>}>
        <div>Canvas</div>
      </FocusWorkspace>,
    );

    expect(screen.getByRole("main", { name: "Annotate" })).toHaveAttribute("data-surface", "focus");
    fireEvent.click(screen.getByRole("button", { name: "Back to canvas" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("returns to the canvas on Escape", () => {
    const onBack = vi.fn();
    render(<FocusWorkspace title="Edit prompt" onBack={onBack}>Editor</FocusWorkspace>);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("returns focus to the invoking control when it closes", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open editor</button>
          {open && <FocusWorkspace title="Edit prompt" onBack={() => setOpen(false)}>Editor</FocusWorkspace>}
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open editor" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Back to canvas" }));
    expect(trigger).toHaveFocus();
  });
});
