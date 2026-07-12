import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

describe("KeyboardShortcutsDialog", () => {
  it("uses a Current sheet and closes on Escape", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsDialog isOpen onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toHaveAttribute("data-surface", "sheet");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render while closed", () => {
    render(<KeyboardShortcutsDialog isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog", { name: "Keyboard Shortcuts" })).not.toBeInTheDocument();
  });
});
