"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { ChevronDownIcon, KeyIcon } from "@/components/current/CurrentIcons";
import { CurrentIconButton } from "@/components/current/CurrentIconButton";
import { CostIndicator } from "@/components/CostIndicator";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { ProjectSetupModal, type ProjectSetupTab } from "@/components/ProjectSetupModal";
import { WorkflowBrowserModal } from "@/components/WorkflowBrowserModal";
import { WorkflowVersionHistory } from "@/components/WorkflowVersionHistory";
import { useWorkflowStore } from "@/store/workflowStore";
import { shareableFilename, stripGeneratedMedia } from "@/utils/shareableWorkflow";
import { CurrentAlert, InlineNotice } from "@/components/current";

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
  const [projectModalInitialTab, setProjectModalInitialTab] = useState<ProjectSetupTab>("project");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [showRevertAlert, setShowRevertAlert] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const projectName = workflowName || "Untitled";
  const canSave = Boolean(workflowId && workflowName && saveDirectoryPath);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    menuItemsRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [menuOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    );
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

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
  const openProjectModal = (mode: "new" | "settings", initialTab: ProjectSetupTab = "project") => closeAnd(() => {
    setProjectModalMode(mode);
    setProjectModalInitialTab(initialTab);
    setShowProjectModal(true);
  });
  const attemptSave = async (showHostRecovery = true): Promise<boolean> => {
    setRecoveryError(null);
    try {
      const saved = await saveToFile();
      if (!saved && showHostRecovery) {
        setRecoveryError("Failed to save project. Please try again.");
      }
      return saved;
    } catch (error) {
      console.error("Failed to save project:", error);
      if (showHostRecovery) {
        setRecoveryError("Failed to save project. Please try again.");
      }
      return false;
    }
  };
  const handleSave = async () => {
    if (canSave) {
      await attemptSave();
    } else {
      setProjectModalMode(workflowName ? "settings" : "new");
      setShowProjectModal(true);
    }
  };
  const handleProjectSave = async (id: string, name: string, path: string) => {
    setWorkflowMetadata(id, name, path);
    const saved = await attemptSave(false);
    if (saved) setShowProjectModal(false);
    return saved;
  };
  const handleOpenDirectory = async () => {
    if (!saveDirectoryPath) return;
    setRecoveryError(null);
    try {
      const response = await fetch("/api/open-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: saveDirectoryPath }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error("Failed to open directory:", result.error);
        setRecoveryError(`Failed to open project folder: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to open directory:", error);
      setRecoveryError("Failed to open project folder. Please try again.");
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

  /**
   * Publish to the community: download a publish-ready copy (generated media
   * stripped, typed interface embedded) and open the template repo's upload
   * page — GitHub turns the upload into a pull request, which is the review
   * queue.
   */
  const handlePublishTemplate = async () => {
    const workflow = stripGeneratedMedia(getShareableWorkflow());
    const url = URL.createObjectURL(new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${shareableFilename(workflow.name)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    let submitUrl = "https://github.com/csprech/current-templates";
    try {
      const response = await fetch("/api/community-workflows");
      const data = await response.json();
      if (data?.source?.submitUrl) submitUrl = data.source.submitUrl;
    } catch {
      // fall back to the repo home
    }
    window.open(submitUrl, "_blank", "noopener,noreferrer");
  };
  const handleRevert = useCallback(() => setShowRevertAlert(true), []);

  return (
    <>
      <div className="current-project" ref={menuRef}>
        <button
          ref={triggerRef}
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
        <CurrentIconButton
          label="Configure API keys"
          onClick={() => openProjectModal("settings", "providers")}
        >
          <KeyIcon />
        </CurrentIconButton>
        <div className="current-popover current-project__menu" hidden={!menuOpen}>
          <div ref={menuItemsRef} role="menu" aria-label="Project menu" onKeyDown={handleMenuKeyDown}>
            <button type="button" role="menuitem" onClick={() => closeAnd(() => setShowQuickstart(true))}>Open welcome</button>
            <button type="button" role="menuitem" onClick={() => openProjectModal("new")}>New project</button>
            <button type="button" role="menuitem" onClick={() => openProjectModal("settings")}>Project settings</button>
            <button type="button" role="menuitem" disabled={isSaving} onClick={() => closeAnd(handleSave)}>Save project</button>
            <button type="button" role="menuitem" onClick={() => closeAnd(() => setShowWorkflowBrowser(true))}>Open project</button>
            <button type="button" role="menuitem" disabled={!saveDirectoryPath} onClick={() => closeAnd(() => { void handleOpenDirectory(); })}>Open project folder</button>
            <button type="button" role="menuitem" onClick={() => closeAnd(handleExportShareable)}>Export shareable workflow</button>
            <button type="button" role="menuitem" onClick={() => closeAnd(() => { void handlePublishTemplate(); })}>Publish to community…</button>
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
      {recoveryError && (
        <InlineNotice
          tone="error"
          onDismiss={() => setRecoveryError(null)}
          className="fixed left-1/2 top-16 z-[100] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2"
        >
          {recoveryError}
        </InlineNotice>
      )}
      <ProjectSetupModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleProjectSave}
        mode={projectModalMode}
        initialTab={projectModalInitialTab}
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
      <CurrentAlert
        open={showRevertAlert}
        title="Revert AI changes?"
        description="This will restore the workflow from before the last AI change."
        cancelLabel="Keep changes"
        confirmLabel="Revert changes"
        danger
        returnFocusRef={triggerRef}
        onCancel={() => setShowRevertAlert(false)}
        onConfirm={() => {
          revertToSnapshot();
          setShowRevertAlert(false);
        }}
      />
    </>
  );
}
