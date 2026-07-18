"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { CurrentIconButton } from "@/components/current/CurrentIconButton";
import { AppearanceToggle } from "@/components/current/AppearanceToggle";
import {
  ActivityIcon,
  AddIcon,
  AssistantIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/current/CurrentIcons";
import { CurrentMark } from "@/components/current/CurrentMark";
import { CurrentSegmentedControl } from "@/components/current/CurrentSegmentedControl";
import { useWorkflowStore, type WorkspaceView } from "@/store/workflowStore";
import { ProjectMenu } from "./ProjectMenu";
import { RunControl } from "./RunControl";

const VIEW_OPTIONS = [
  { value: "canvas", label: "Canvas" },
  { value: "app", label: "App" },
  { value: "outputs", label: "Outputs" },
] as const;

interface CurrentCommandBarProps {
  onAddNode?: () => void;
}

function CommentsNavigation() {
  const {
    nodes,
    getNodesWithComments,
    viewedCommentNodeIds,
    markCommentViewed,
    setNavigationTarget,
  } = useWorkflowStore(useShallow((state) => ({
    nodes: state.nodes,
    getNodesWithComments: state.getNodesWithComments,
    viewedCommentNodeIds: state.viewedCommentNodeIds,
    markCommentViewed: state.markCommentViewed,
    setNavigationTarget: state.setNavigationTarget,
  })));
  const nodesWithComments = useMemo(() => getNodesWithComments(), [getNodesWithComments, nodes]);
  const unviewedComments = useMemo(
    () => nodesWithComments.filter((node) => !viewedCommentNodeIds.has(node.id)),
    [nodesWithComments, viewedCommentNodeIds]
  );
  const openNextComment = useCallback(() => {
    const target = unviewedComments[0] || nodesWithComments[0];
    if (!target) return;
    markCommentViewed(target.id);
    setNavigationTarget(target.id);
  }, [markCommentViewed, nodesWithComments, setNavigationTarget, unviewedComments]);
  if (nodesWithComments.length === 0) return null;
  const commentLabel = `${unviewedComments.length} unviewed comment${unviewedComments.length === 1 ? "" : "s"} (${nodesWithComments.length} total)`;

  return (
    <CurrentIconButton label={commentLabel} onClick={openNextComment} className="current-command-bar__comments">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M5 5h14v11H9l-4 3z" />
      </svg>
      {unviewedComments.length > 0 && <span aria-hidden="true">{unviewedComments.length > 9 ? "9+" : unviewedComments.length}</span>}
    </CurrentIconButton>
  );
}

export function CurrentCommandBar({ onAddNode }: CurrentCommandBarProps) {
  const {
    workspaceView,
    setWorkspaceView,
    canUndo,
    canRedo,
    undo,
    redo,
    activeRightPanel,
    toggleRightPanel,
    setShowQuickstart,
  } = useWorkflowStore(useShallow((state) => ({
    workspaceView: state.workspaceView,
    setWorkspaceView: state.setWorkspaceView,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    undo: state.undo,
    redo: state.redo,
    activeRightPanel: state.activeRightPanel,
    toggleRightPanel: state.toggleRightPanel,
    setShowQuickstart: state.setShowQuickstart,
  })));

  return (
    <header className="current-command-bar">
      <div className="current-command-bar__identity">
        <button
          type="button"
          className="current-command-bar__welcome"
          aria-label="Open welcome"
          onClick={() => setShowQuickstart(true)}
        >
          <CurrentMark variant="icon" />
        </button>
        <ProjectMenu />
      </div>

      <CurrentSegmentedControl<WorkspaceView>
        value={workspaceView}
        options={VIEW_OPTIONS}
        onChange={setWorkspaceView}
        label="Workspace view"
        className="current-command-bar__views"
      />

      <div className="current-command-bar__actions">
        <CurrentIconButton label="Undo" disabled={!canUndo} onClick={undo}><UndoIcon /></CurrentIconButton>
        <CurrentIconButton label="Redo" disabled={!canRedo} onClick={redo}><RedoIcon /></CurrentIconButton>
        <CurrentIconButton label="Add node" onClick={onAddNode} disabled={!onAddNode} data-tutorial="add-node-button"><AddIcon /></CurrentIconButton>
        <span className="current-command-bar__divider" aria-hidden="true" />
        <AppearanceToggle />
        <CurrentIconButton label="Open activity" aria-pressed={activeRightPanel === "activity"} onClick={() => toggleRightPanel("activity")}><ActivityIcon /></CurrentIconButton>
        <CurrentIconButton label="Open assistant" aria-pressed={activeRightPanel === "assistant"} onClick={() => toggleRightPanel("assistant")}><AssistantIcon /></CurrentIconButton>
        <CommentsNavigation />
        <RunControl />
      </div>
    </header>
  );
}
