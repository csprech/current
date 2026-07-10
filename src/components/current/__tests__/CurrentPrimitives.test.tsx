import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ActivityIcon,
  AddIcon,
  AssistantIcon,
  ChevronDownIcon,
  CloseIcon,
  CurrentAlert,
  CurrentButton,
  CurrentIconButton,
  CurrentPanel,
  CurrentSegmentedControl,
  CurrentSheet,
  InlineNotice,
  LibraryIcon,
  MoreIcon,
  PlayIcon,
  RedoIcon,
  StopIcon,
  UndoIcon,
} from "@/components/current";

describe("Current control primitives", () => {
  it("labels icon-only controls", () => {
    render(
      <CurrentIconButton label="Open library">
        <span aria-hidden>◫</span>
      </CurrentIconButton>,
    );

    expect(screen.getByRole("button", { name: "Open library" })).toBeInTheDocument();
  });

  it("passes native button props and exposes primary and danger variants", () => {
    const { rerender } = render(
      <CurrentButton variant="primary" disabled data-command="run">
        Run
      </CurrentButton>,
    );
    const primary = screen.getByRole("button", { name: "Run" });

    expect(primary).toBeDisabled();
    expect(primary).toHaveAttribute("data-command", "run");
    expect(primary).toHaveAttribute("data-variant", "primary");
    expect(primary).toHaveAttribute("type", "button");

    rerender(<CurrentButton variant="danger">Delete</CurrentButton>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-variant", "danger");
  });

  it("uses one selected segment", () => {
    render(
      <CurrentSegmentedControl
        value="canvas"
        onChange={vi.fn()}
        options={[
          { value: "canvas", label: "Canvas" },
          { value: "outputs", label: "Outputs" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Canvas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Outputs" })).toHaveAttribute("aria-pressed", "false");
  });

  it("moves between segments with arrow keys", () => {
    const onChange = vi.fn();
    render(
      <CurrentSegmentedControl
        value="canvas"
        onChange={onChange}
        options={[
          { value: "canvas", label: "Canvas" },
          { value: "outputs", label: "Outputs" },
        ]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Canvas" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("outputs");
    expect(screen.getByRole("button", { name: "Outputs" })).toHaveFocus();
  });
});

describe("Current surface primitives", () => {
  it("renders an accessible sided panel with optional actions", () => {
    const onClose = vi.fn();
    render(
      <CurrentPanel side="left" title="Library" onClose={onClose} actions={<button>Import</button>}>
        Assets
      </CurrentPanel>,
    );
    const panel = screen.getByRole("complementary", { name: "Library" });

    expect(panel).toHaveAttribute("data-side", "left");
    expect(screen.getByRole("button", { name: "Close Library" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close Library" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("returns null when a sheet is closed", () => {
    render(
      <CurrentSheet open={false} title="Project settings" onClose={vi.fn()}>
        <p>Settings</p>
      </CurrentSheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labelled modal sheet with its requested width", () => {
    render(
      <CurrentSheet open title="Project settings" onClose={vi.fn()} width="wide">
        <p>Settings</p>
      </CurrentSheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "Project settings" });

    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveAttribute("data-width", "wide");
    expect(sheet).toHaveAttribute("aria-labelledby", screen.getByRole("heading", { name: "Project settings" }).id);
  });

  it("closes a sheet with Escape and returns focus", () => {
    const onClose = vi.fn();
    const returnFocusRef = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={returnFocusRef}>Open settings</button>
        <CurrentSheet open title="Project settings" onClose={onClose} returnFocusRef={returnFocusRef}>
          <p>Settings</p>
        </CurrentSheet>
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(returnFocusRef.current).toHaveFocus();
  });

  it("closes only when the sheet backdrop itself is clicked", () => {
    const onClose = vi.fn();
    render(
      <CurrentSheet open title="Project settings" onClose={onClose}>
        <button>Inside</button>
      </CurrentSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = document.querySelector<HTMLElement>(".current-sheet-backdrop");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders a linked alertdialog and invokes cancel and confirm callbacks", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <CurrentAlert
        open
        title="Reset costs?"
        description="This cannot be undone."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    const alert = screen.getByRole("alertdialog", { name: "Reset costs?" });

    expect(alert).toHaveAccessibleDescription("This cannot be undone.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("uses an explicit danger action label and variant", () => {
    render(
      <CurrentAlert
        open
        danger
        title="Delete project?"
        description="This cannot be undone."
        confirmLabel="Delete project"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete project" })).toHaveAttribute("data-variant", "danger");
  });

  it("uses alert semantics for errors and status semantics for other notices", () => {
    const { rerender } = render(<InlineNotice tone="error">Upload failed</InlineNotice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");

    rerender(<InlineNotice tone="success">Upload complete</InlineNotice>);
    expect(screen.getByRole("status")).toHaveTextContent("Upload complete");
  });

  it("labels notice dismissal", () => {
    const onDismiss = vi.fn();
    render(
      <InlineNotice tone="warning" onDismiss={onDismiss}>
        Storage is almost full
      </InlineNotice>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("Current icons", () => {
  it("exports decorative currentColor icons", () => {
    const icons = [
      AddIcon,
      UndoIcon,
      RedoIcon,
      LibraryIcon,
      ActivityIcon,
      AssistantIcon,
      CloseIcon,
      ChevronDownIcon,
      PlayIcon,
      StopIcon,
      MoreIcon,
    ];
    const { container } = render(
      <>
        {icons.map((Icon, index) => <Icon key={index} data-testid={`icon-${index}`} />)}
      </>,
    );

    expect(container.querySelectorAll("svg")).toHaveLength(icons.length);
    for (const icon of container.querySelectorAll("svg")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("focusable", "false");
      expect(icon).toHaveAttribute("stroke", "currentColor");
    }
  });
});
