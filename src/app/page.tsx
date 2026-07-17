"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { CurrentCommandBar } from "@/components/workspace/CurrentCommandBar";
import { AddPalette } from "@/components/workspace/AddPalette";
import { WorkspaceModelSearchDialog } from "@/components/workspace/WorkspaceModelSearchDialog";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { useWorkflowStore } from "@/store/workflowStore";
import { FTUXModal } from "@/components/onboarding/FTUXModal";
import { getFTUXCompleted, setFTUXCompleted } from "@/store/utils/localStorage";
import { useFTUXStore } from "@/store/ftuxStore";

export default function Home() {
  const initializeAutoSave = useWorkflowStore(
    (state) => state.initializeAutoSave
  );
  const cleanupAutoSave = useWorkflowStore((state) => state.cleanupAutoSave);
  const setShowQuickstart = useWorkflowStore((state) => state.setShowQuickstart);
  const isModalOpen = useWorkflowStore((state) => state.isModalOpen);
  const modelSearchOpen = useWorkflowStore((state) => state.modelSearchOpen);
  const shortcutsDialogOpen = useWorkflowStore((state) => state.shortcutsDialogOpen);
  const showQuickstart = useWorkflowStore((state) => state.showQuickstart);
  const [showFTUX, setShowFTUX] = useState(false);
  const [addPaletteOpen, setAddPaletteOpen] = useState(false);
  // Flow-space insertion point for the palette (set by canvas double-click, null = pane center)
  const [addNodeAt, setAddNodeAt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    initializeAutoSave();
    return () => cleanupAutoSave();
  }, [initializeAutoSave, cleanupAutoSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useWorkflowStore.getState().hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const openAddPalette = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      if (addPaletteOpen) {
        event.preventDefault();
        document.querySelector<HTMLElement>('[role="searchbox"][aria-label="Search nodes"]')?.focus();
        return;
      }
      const renderedModal = document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
      if (showFTUX || showQuickstart || isModalOpen || modelSearchOpen || shortcutsDialogOpen || renderedModal) return;
      event.preventDefault();
      setAddNodeAt(null);
      setAddPaletteOpen(true);
    };
    window.addEventListener("keydown", openAddPalette);
    return () => window.removeEventListener("keydown", openAddPalette);
  }, [addPaletteOpen, isModalOpen, modelSearchOpen, shortcutsDialogOpen, showFTUX, showQuickstart]);

  // Client-side only FTUX check (SSR-safe)
  useEffect(() => {
    if (!getFTUXCompleted()) {
      setShowFTUX(true);
    }
  }, []);

  const handleFTUXComplete = () => {
    setShowFTUX(false);
    setFTUXCompleted(true);
  };

  const handleStartTutorial = () => {
    setShowFTUX(false);
    setFTUXCompleted(true);
    setShowQuickstart(false); // Close WelcomeModal if open
    useFTUXStore.getState().startTutorial();
  };

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col">
        <CurrentCommandBar onAddNode={() => { setAddNodeAt(null); setAddPaletteOpen(true); }} />
        <WorkflowCanvas
          onPaneDoubleClick={(position) => {
            setAddNodeAt(position);
            setAddPaletteOpen(true);
          }}
        />
        <AddPalette
          open={addPaletteOpen}
          insertAt={addNodeAt}
          onClose={() => { setAddPaletteOpen(false); setAddNodeAt(null); }}
        />
        <WorkspaceModelSearchDialog />
        {showFTUX && (
          <FTUXModal
            onComplete={handleFTUXComplete}
            onStartTutorial={handleStartTutorial}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
