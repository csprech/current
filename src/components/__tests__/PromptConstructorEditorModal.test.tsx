import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptConstructorEditorModal } from "@/components/modals/PromptConstructorEditorModal";

describe("PromptConstructorEditorModal", () => {
  it("uses a focused workspace and submits constructor edits", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <PromptConstructorEditorModal
        isOpen
        initialTemplate="Hello @subject"
        availableVariables={[{ nodeId: "subject", name: "subject", value: "world" }]}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("main", { name: "Edit Prompt Constructor" })).toHaveAttribute("data-surface", "focus");
    fireEvent.change(screen.getByPlaceholderText("Type @ to insert variables..."), { target: { value: "New @subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith("New @subject");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("protects dirty constructor edits before returning to the canvas", () => {
    const onClose = vi.fn();
    render(
      <PromptConstructorEditorModal
        isOpen
        initialTemplate="Original"
        availableVariables={[]}
        onSubmit={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Type @ to insert variables..."), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to canvas" }));
    expect(screen.getByRole("alertdialog", { name: "You have unsaved changes" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
