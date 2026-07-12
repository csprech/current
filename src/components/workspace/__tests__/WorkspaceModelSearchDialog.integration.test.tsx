import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddPalette } from "@/components/workspace/AddPalette";
import { WorkspaceModelSearchDialog } from "@/components/workspace/WorkspaceModelSearchDialog";
import { useWorkflowStore } from "@/store/workflowStore";

vi.mock("@/components/modals/ModelSearchDialog", () => ({
  ModelSearchDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen ? (
    <div role="dialog" aria-label="Browse Models">
      <button type="button" onClick={onClose}>Close models</button>
    </div>
  ) : null,
}));

describe("global workspace model search", () => {
  afterEach(() => useWorkflowStore.getState().setModelSearchOpen(false));

  it("opens from Add Palette and closes through the store-bound global host", () => {
    function Workspace() {
      const [paletteOpen, setPaletteOpen] = useState(true);
      return (
        <>
          <AddPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <WorkspaceModelSearchDialog />
        </>
      );
    }
    render(
      <ReactFlowProvider>
        <Workspace />
      </ReactFlowProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Browse models" }));
    expect(screen.queryByRole("dialog", { name: "Add node" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Browse Models" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close models" }));
    expect(screen.queryByRole("dialog", { name: "Browse Models" })).not.toBeInTheDocument();
    expect(useWorkflowStore.getState().modelSearchOpen).toBe(false);
  });
});
