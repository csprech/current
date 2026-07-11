"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { ChevronDownIcon } from "@/components/current/CurrentIcons";
import { CurrentIconButton } from "@/components/current/CurrentIconButton";
import { CostIndicator } from "@/components/CostIndicator";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { ProjectSetupModal } from "@/components/ProjectSetupModal";
import { WorkflowBrowserModal } from "@/components/WorkflowBrowserModal";
import { WorkflowVersionHistory } from "@/components/WorkflowVersionHistory";
import { useWorkflowStore } from "@/store/workflowStore";
import { shareableFilename } from "@/utils/shareableWorkflow";

function SaveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M5 3.5h11l3 3v14H5zM8 3.5v6h8v-6M8 20.5v-7h8v7" />
    </svg>
  );
}

export function ProjectMenu() {
  const {
    workflowName,
    workflowId,
    saveDirectoryPath,
    hasUnsavedChanges,
    lastSavedAt,
    isSaving,
    setWorkflowMetadata,
    saveToFile,
    loadWorkflow,
    getShareableWorkflow,
    previousWorkflowSnapshot,
    revertToSnapshot,
    shortcutsDialogOpen,
    setShortcutsDialogOpen,
    setShowQuickstart,
  } = useWorkflowStore(useShallow((state) => ({
    workflowName: state.workflowName,
    workflowId: state.workflowId,
    saveDirectoryPath: state.saveDirectoryPath,
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastSavedAt: state.lastSavedAt,
    isSaving: state.isSaving,
    setWorkflowMetadata: state.setWorkflowMetadata,
    saveToFile: state.saveToFile,
    loadWorkflow: state.loadWorkflow,
    getShareableWorkflow: state.getShareableWorkflow,
    previousWorkflowSnapshot: state.previousWorkflowSnapshot,
    revertToSnapshot: state.revertToSnapshot,
    shortcutsDialogOpen: state.shortcutsDialogOpen,
    setShortcutsDialogOpen: state.setShortcutsDialogOpen,
    setShowQuickstart: state.setShowQuickstart,
  })));
  const [menuOpen, setMenuOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<"new" | "settings">("new");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const projectName = workflowName || "Untitled";
  const canSave = Boolean(workflowId && workflowName && saveDirectoryPath);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const saveStatus = useMemo(() => {
    if (isSaving) return "Saving…";
    if (hasUnsavedChanges || !workflowName) return "Unsaved changes";
    if (lastSavedAt) {
      const time = new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `Saved ${time}`;
    }
    return "Not saved";
  }, [hasUnsavedChanges, isSaving, lastSavedAt, workflowName]);

  const closeAnd = (action: () => void) => {
    setMenuOpen(false);
    action();
  };
  const openProjectModal = (mode: "new" | "settings") => closeAnd(() => {
    setProjectModalMode(mode);
    setShowProjectModal(true);
  });
  const handleSave = () => {
    if (canSave) {
      void saveToFile();
    } else {
      setProjectModalMode(workflowName ? "settings" : "new");
      setShowProjectModal(true);
    }
  };
  const handleProjectSave = async (id: string, name: string, path: string) => {
    setWorkflowMetadata(id, name, path);
    setShowProjectModal(false);
    setTimeout(() => {
      saveToFile().catch((error) => {
        console.error("Failed to save project:", error);
        alert("Failed to save project. Please try again.");
      });
    }, 50);
  };
  const handleOpenDirectory = async () => {
    if (!saveDirectoryPath) return;
    try {
      const response = await fetch("/api/open-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: saveDirectoryPath }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error("Failed to open directory:", result.error);
        alert(`Failed to open project folder: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to open directory:", error);
      alert("Failed to open project folder. Please try again.");
    }
  };
  const handleExportShareable = () => {
    const workflow = getShareableWorkflow();
    const url = URL.createObjectURL(new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${shareableFilename(workflow.name)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleRevert = useCallback(() => {
    if (window.confirm("Are you sure? This will restore your previous workflow.")) revertToSnapshot();
  }, [revertToSnapshot]);

  return (
    <>
      <div className="current-project" ref={menuRef}>
        <button
          type="button"
          className="current-project__trigger"
          aria-label={`Project menu for ${projectName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="current-project__name">{projectName}</span>
          <span className="current-project__status" aria-live="polite">{saveStatus}</span>
          <ChevronDownIcon />
        </button>
        <CurrentIconButton
          label={canSave ? "Save project" : "Configure save location"}
          onClick={handleSave}
          disabled={isSaving}
          data-tutorial="save-button"
        >
          <SaveIcon />
        </CurrentIconButton>
        <div className="current-popover current-project__menu" hidden={!menuOpen}>
          <div role="menu" aria-label="Project menu">
            <button type="button" role="menuitem" onClick={() => closeAnd(() => setShowQuickstart(true))}>Open welcome</button>
            <button type="button" role="menuitem" onClick={() => openProjectModal("new")}>New project</button>
            <button type="button" role="menuitem" onClick={() => openProjectModal("settings")}>Project settings</button>
            <button type="button" role="menuitem" disabled={isSaving} onClick={() => closeAnd(handleSave)}>Save project</button>
            <button type="button" role="menuitem" onClick={() => closeAnd(() => setShowWorkflowBrowser(true))}>Open project</button>
            <button type="button" role="menuitem" disabled={!saveDirectoryPath} onClick={() => closeAnd(() => { void handleOpenDirectory(); })}>Open project folder</button>
            <button type="button" role="menuitem" onClick={() => closeAnd(handleExportShareable)}>Export shareable workflow</button>
            {previousWorkflowSnapshot && (
              <button type="button" role="menuitem" onClick={() => closeAnd(handleRevert)}>Revert AI changes</button>
            )}
            <button type="button" role="menuitem" onClick={() => closeAnd(() => setShortcutsDialogOpen(true))}>Keyboard shortcuts</button>
          </div>
          <div className="current-project__utilities" aria-label="Project utilities">
            <CostIndicator />
            <WorkflowVersionHistory />
          </div>
        </div>
      </div>
      <ProjectSetupModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleProjectSave}
        mode={projectModalMode}
      />
      <WorkflowBrowserModal
        isOpen={showWorkflowBrowser}
        onClose={() => setShowWorkflowBrowser(false)}
        onWorkflowLoaded={async (workflow, dirPath) => {
          setShowWorkflowBrowser(false);
          await loadWorkflow(workflow, dirPath);
        }}
      />
      <KeyboardShortcutsDialog
        isOpen={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </>
  );
}
