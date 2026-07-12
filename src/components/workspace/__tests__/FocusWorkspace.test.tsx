import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FocusWorkspace } from "@/components/workspace/FocusWorkspace";
import { CurrentAlert } from "@/components/current";

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

  it("sets meaningful initial focus and traps Tab in the focused workspace", () => {
    const initialFocusRef = createRef<HTMLInputElement>();
    render(
      <FocusWorkspace title="Edit prompt" onBack={vi.fn()} initialFocusRef={initialFocusRef}>
        <input ref={initialFocusRef} aria-label="Prompt" />
        <button>Last editor control</button>
      </FocusWorkspace>,
    );

    const back = screen.getByRole("button", { name: "Back to canvas" });
    const last = screen.getByRole("button", { name: "Last editor control" });
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveFocus();
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(back).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("isolates app siblings and restores their prior inert and aria-hidden state", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <div data-testid="existing" inert aria-hidden="true">Existing isolated content</div>
          <div data-testid="canvas">Canvas</div>
          {open && <FocusWorkspace title="Annotate" onBack={() => setOpen(false)}>Editor</FocusWorkspace>}
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByTestId("existing")).toHaveAttribute("inert");
    expect(screen.getByTestId("existing")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("canvas")).toHaveAttribute("inert");
    expect(screen.getByTestId("canvas")).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back to canvas" }));
    expect(screen.getByTestId("existing")).toHaveAttribute("inert");
    expect(screen.getByTestId("existing")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("canvas")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("canvas")).not.toHaveAttribute("aria-hidden");
  });

  it("lets a nested alert consume Escape before the workspace", () => {
    const onBack = vi.fn();
    function Harness() {
      const [alertOpen, setAlertOpen] = useState(true);
      return (
        <FocusWorkspace title="Edit prompt" onBack={onBack}>
          <CurrentAlert
            open={alertOpen}
            title="Unsaved changes"
            description="Choose how to continue."
            onCancel={() => setAlertOpen(false)}
            onConfirm={() => setAlertOpen(false)}
          />
        </FocusWorkspace>
      );
    }

    render(<Harness />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Edit prompt" })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onBack).toHaveBeenCalledOnce();
  });
});
