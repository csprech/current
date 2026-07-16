import { createRef, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { CurrentSheetSurface } from "@/components/current/CurrentSheet";

describe("Current control primitives", () => {
  it("labels icon-only controls", () => {
    render(
      <CurrentIconButton label="Open library">
        <span aria-hidden>◫</span>
      </CurrentIconButton>,
    );

    const button = screen.getByRole("button", { name: "Open library" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Open library");
  });

  it("preserves an explicit native tooltip for an icon-only control", () => {
    render(<CurrentIconButton label="Run workflow" title="Run current workflow" />);

    expect(screen.getByRole("button", { name: "Run workflow" })).toHaveAttribute("title", "Run current workflow");
  });

  it("preserves accessible pressed and disabled icon-button state", () => {
    render(
      <CurrentIconButton label="Toggle inspector" aria-pressed disabled>
        <span aria-hidden>i</span>
      </CurrentIconButton>,
    );

    const button = screen.getByRole("button", { name: "Toggle inspector" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toBeDisabled();
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

  it("restores focus to the control that opened a panel", async () => {
    function PanelHarness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open library</button>{open && <CurrentPanel side="left" title="Library" onClose={() => setOpen(false)}>Assets</CurrentPanel>}</>;
    }
    render(<PanelHarness />);
    const opener = screen.getByRole("button", { name: "Open library" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Close Library" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns null when a sheet is closed", () => {
    render(
      <CurrentSheet open={false} title="Project settings" onClose={vi.fn()}>
        <p>Settings</p>
      </CurrentSheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not access the portal target during server rendering", () => {
    expect(() => renderToString(
      <CurrentSheet open title="Project settings" onClose={vi.fn()}>
        <p>Settings</p>
      </CurrentSheet>,
    )).not.toThrow();
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

  it("focuses the first control when a sheet opens", () => {
    render(
      <CurrentSheet open title="Project settings" onClose={vi.fn()}>
        <button>Save</button>
      </CurrentSheet>,
    );

    expect(screen.getByRole("button", { name: "Close Project settings" })).toHaveFocus();
  });

  it("focuses the dialog when a sheet has no controls", () => {
    render(
      <CurrentSheetSurface open title="Empty sheet" onClose={vi.fn()} role="dialog" hideClose>
        <p>No controls</p>
      </CurrentSheetSurface>,
    );

    expect(screen.getByRole("dialog", { name: "Empty sheet" })).toHaveFocus();
  });

  it("wraps Tab and Shift+Tab within the sheet", () => {
    render(<StatefulSheet onClose={vi.fn()} />);
    const first = screen.getByRole("button", { name: "Close Project settings" });
    const last = screen.getByRole("button", { name: "Last control" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes a sheet with Escape before returning focus", () => {
    const onClose = vi.fn();
    render(<StatefulSheet onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "Project settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toHaveFocus();
  });

  it("returns focus after a programmatic controlled close", () => {
    render(<StatefulSheet onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Close programmatically" }));
    expect(screen.queryByRole("dialog", { name: "Project settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toHaveFocus();
  });

  it("automatically returns focus to the active opener without an explicit ref", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open automatic sheet</button>
          <CurrentSheet open={open} title="Automatic sheet" onClose={() => setOpen(false)}>
            Content
          </CurrentSheet>
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open automatic sheet" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(opener).toHaveFocus();
  });

  it("returns a nested sheet to the precise control that opened it", () => {
    function Harness() {
      const [outerOpen, setOuterOpen] = useState(false);
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOuterOpen(true)}>Open outer</button>
          <CurrentSheet open={outerOpen} title="Outer" onClose={() => setOuterOpen(false)}>
            <button onClick={() => setInnerOpen(true)}>Open inner</button>
            <CurrentSheet open={innerOpen} title="Inner" onClose={() => setInnerOpen(false)}>Inner content</CurrentSheet>
          </CurrentSheet>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open outer" }));
    const nestedOpener = screen.getByRole("button", { name: "Open inner" });
    nestedOpener.focus();
    fireEvent.click(nestedOpener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nestedOpener).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
  });

  it("falls back inside the parent sheet when a nested opener unmounts", () => {
    function Harness() {
      const [outerOpen, setOuterOpen] = useState(false);
      const [innerOpen, setInnerOpen] = useState(false);
      const [showInnerOpener, setShowInnerOpener] = useState(true);
      return (
        <>
          <button onClick={() => setOuterOpen(true)}>Open outer</button>
          <CurrentSheet open={outerOpen} title="Outer" onClose={() => setOuterOpen(false)}>
            {showInnerOpener && <button onClick={() => setInnerOpen(true)}>Open transient inner</button>}
            <button>Stable parent action</button>
            <CurrentSheet open={innerOpen} title="Inner" onClose={() => setInnerOpen(false)}>
              <button onClick={() => setShowInnerOpener(false)}>Unmount opener</button>
            </CurrentSheet>
          </CurrentSheet>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open outer" }));
    const transientOpener = screen.getByRole("button", { name: "Open transient inner" });
    transientOpener.focus();
    fireEvent.click(transientOpener);
    fireEvent.click(screen.getByRole("button", { name: "Unmount opener" }));
    expect(transientOpener).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    const parent = screen.getByRole("dialog", { name: "Outer" });
    expect(parent).toContainElement(document.activeElement as HTMLElement);
    expect(document.body).not.toHaveFocus();
  });

  it("does not return focus while the sheet remains open", () => {
    const returnFocusRef = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={returnFocusRef}>Open settings</button>
        <CurrentSheet open title="Project settings" onClose={vi.fn()} returnFocusRef={returnFocusRef}>
          <p>Settings</p>
        </CurrentSheet>
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Project settings" })).toBeInTheDocument();
    expect(returnFocusRef.current).not.toHaveFocus();
  });

  it("isolates the background and restores each prior inert state", () => {
    const preexistingInert = document.createElement("div");
    preexistingInert.setAttribute("inert", "");
    document.body.appendChild(preexistingInert);
    try {
      const { container } = render(<StatefulSheet onClose={vi.fn()} />);

      expect(container).toHaveAttribute("inert");
      expect(preexistingInert).toHaveAttribute("inert");
      fireEvent.click(screen.getByRole("button", { name: "Close programmatically" }));
      expect(container).not.toHaveAttribute("inert");
      expect(preexistingInert).toHaveAttribute("inert");
    } finally {
      preexistingInert.remove();
    }
  });

  it("lets only the topmost sheet handle Escape and restores stack focus", () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    render(<StackedSheets firstClose={firstClose} secondClose={secondClose} />);

    expect(screen.getByRole("button", { name: "Close Second sheet" })).toHaveFocus();
    screen.getByRole("button", { name: "Open second sheet" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close Second sheet" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(secondClose).toHaveBeenCalledOnce();
    expect(firstClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Second sheet" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "First sheet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open second sheet" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(firstClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open first sheet" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(firstClose).toHaveBeenCalledOnce();
    expect(secondClose).toHaveBeenCalledOnce();
  });

  it("removes the shared keydown listener after the final sheet unmounts", () => {
    const addListener = vi.spyOn(document, "addEventListener");
    const removeListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <CurrentSheet open title="Project settings" onClose={vi.fn()}>
        Settings
      </CurrentSheet>,
    );

    expect(addListener.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    unmount();
    expect(removeListener.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    addListener.mockRestore();
    removeListener.mockRestore();
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

  it("supports one disciplined alternate action in a three-action alert", () => {
    const onAlternate = vi.fn();
    render(
      <CurrentAlert
        open
        title="Unsaved changes"
        description="Choose how to continue."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        alternateAction={{ label: "Submit", onClick: onAlternate, variant: "primary" }}
      />,
    );

    const alert = screen.getByRole("alertdialog", { name: "Unsaved changes" });
    expect(within(alert).getAllByRole("button")).toHaveLength(3);
    fireEvent.click(within(alert).getByRole("button", { name: "Submit" }));
    expect(onAlternate).toHaveBeenCalledOnce();
  });

  it("returns focus when an alert is cancelled", () => {
    const onCancel = vi.fn();
    render(<StatefulAlert onCancel={onCancel} onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Open destructive action" })).toHaveFocus();
  });

  it("returns focus when an alert is confirmed", () => {
    const onConfirm = vi.fn();
    render(<StatefulAlert onCancel={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Open destructive action" })).toHaveFocus();
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

function StatefulAlert({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [open, setOpen] = useState(true);
  const returnFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={returnFocusRef}>Open destructive action</button>
      <CurrentAlert
        open={open}
        title="Reset costs?"
        description="This cannot be undone."
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

function StatefulSheet({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    onClose();
    setOpen(false);
  };

  return (
    <>
      <button ref={returnFocusRef}>Open settings</button>
      <CurrentSheet open={open} title="Project settings" onClose={close} returnFocusRef={returnFocusRef}>
        <button onClick={close}>Close programmatically</button>
        <button>Last control</button>
      </CurrentSheet>
    </>
  );
}

function StackedSheets({ firstClose, secondClose }: { firstClose: () => void; secondClose: () => void }) {
  const [firstOpen, setFirstOpen] = useState(true);
  const [secondOpen, setSecondOpen] = useState(true);
  const firstTriggerRef = useRef<HTMLButtonElement>(null);
  const secondTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={firstTriggerRef}>Open first sheet</button>
      <CurrentSheet
        open={firstOpen}
        title="First sheet"
        returnFocusRef={firstTriggerRef}
        onClose={() => {
          firstClose();
          setFirstOpen(false);
        }}
      >
        <button ref={secondTriggerRef}>Open second sheet</button>
      </CurrentSheet>
      <CurrentSheet
        open={secondOpen}
        title="Second sheet"
        returnFocusRef={secondTriggerRef}
        onClose={() => {
          secondClose();
          setSecondOpen(false);
        }}
      >
        Second content
      </CurrentSheet>
    </>
  );
}

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

  it("does not allow callers to override decorative semantics", () => {
    render(<AddIcon data-testid="icon" aria-hidden="false" focusable="true" />);
    const icon = screen.getByTestId("icon");

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("focusable", "false");
  });
});
