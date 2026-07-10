"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { CurrentButton } from "@/components/current/CurrentButton";
import { ChevronDownIcon, PlayIcon, StopIcon } from "@/components/current/CurrentIcons";
import { useFTUXStore, type TutorialStep } from "@/store/ftuxStore";
import { useWorkflowStore } from "@/store/workflowStore";

export function RunControl() {
  const {
    nodes,
    isRunning,
    currentNodeIds,
    executeWorkflow,
    regenerateNode,
    executeSelectedNodes,
    stopWorkflow,
    mockTutorialExecution,
    validateWorkflow,
  } = useWorkflowStore(useShallow((state) => ({
    nodes: state.nodes,
    isRunning: state.isRunning,
    currentNodeIds: state.currentNodeIds,
    executeWorkflow: state.executeWorkflow,
    regenerateNode: state.regenerateNode,
    executeSelectedNodes: state.executeSelectedNodes,
    stopWorkflow: state.stopWorkflow,
    mockTutorialExecution: state.mockTutorialExecution,
    validateWorkflow: state.validateWorkflow,
  })));
  const initialTutorialState = useFTUXStore.getState();
  const [tutorialState, setTutorialState] = useState(() => ({
    tutorialActive: initialTutorialState.tutorialActive,
    currentTutorialStep: initialTutorialState.currentTutorialStep,
    tutorialSteps: initialTutorialState.tutorialSteps as TutorialStep[],
  }));
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const runMenuRef = useRef<HTMLDivElement>(null);
  const validationId = useId();

  useEffect(() => useFTUXStore.subscribe((state) => {
    setTutorialState({
      tutorialActive: state.tutorialActive,
      currentTutorialStep: state.currentTutorialStep,
      tutorialSteps: state.tutorialSteps,
    });
  }), []);

  const currentTutorialStep = tutorialState.tutorialSteps[tutorialState.currentTutorialStep];
  const isRunOptionsTutorialStep =
    tutorialState.tutorialActive && currentTutorialStep?.id === "explain-run-options";

  useEffect(() => {
    if (isRunOptionsTutorialStep) setRunMenuOpen(true);
    if (
      tutorialState.tutorialActive &&
      ["run-workflow", "demonstrate-downstream", "demonstrate-complete"].includes(
        currentTutorialStep?.id ?? ""
      )
    ) {
      setRunMenuOpen(false);
    }
  }, [currentTutorialStep?.id, isRunOptionsTutorialStep, tutorialState.tutorialActive]);

  useEffect(() => {
    if (!runMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!runMenuRef.current?.contains(event.target as Node) && !isRunOptionsTutorialStep) {
        setRunMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isRunOptionsTutorialStep) setRunMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isRunOptionsTutorialStep, runMenuOpen]);

  const { valid, errors } = validateWorkflow();
  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const validationReason = errors.join(" ");

  const runningLabel = useMemo(() => {
    if (currentNodeIds.length > 1) return `Running ${currentNodeIds.length} nodes`;
    if (currentNodeIds.length === 1) {
      const node = nodes.find((candidate) => candidate.id === currentNodeIds[0]);
      return `Running ${node?.data?.customTitle || node?.type || "node"}`;
    }
    return "Running workflow";
  }, [currentNodeIds, nodes]);

  const handleRun = useCallback(() => {
    if (isRunning) {
      stopWorkflow();
      return;
    }
    const ftuxState = useFTUXStore.getState();
    const step = ftuxState.tutorialSteps[ftuxState.currentTutorialStep];
    if (ftuxState.tutorialActive && step?.id === "run-workflow") {
      void mockTutorialExecution();
      return;
    }
    void executeWorkflow();
  }, [executeWorkflow, isRunning, mockTutorialExecution, stopWorkflow]);

  const runOption = (action: () => void) => {
    action();
    setRunMenuOpen(false);
  };

  return (
    <div className="current-run-control" ref={runMenuRef}>
      <CurrentButton
        variant="primary"
        className="current-run-control__primary"
        aria-label={isRunning ? "Stop workflow" : "Run"}
        aria-describedby={!valid && !isRunning ? validationId : undefined}
        disabled={!valid && !isRunning}
        onClick={handleRun}
        data-tutorial="floating-run-button"
      >
        {isRunning ? <StopIcon /> : <PlayIcon />}
        <span>{isRunning ? runningLabel : "Run"}</span>
      </CurrentButton>
      {!isRunning && valid && (
        <button
          type="button"
          className="current-run-control__options"
          aria-label="Run options"
          aria-haspopup="menu"
          aria-expanded={runMenuOpen}
          onClick={() => setRunMenuOpen((open) => !open)}
          data-tutorial="floating-run-dropdown"
        >
          <ChevronDownIcon />
        </button>
      )}
      {!valid && !isRunning && (
        <span id={validationId} className="current-run-control__validation" role="status">
          {validationReason || "Workflow is not ready to run"}
        </span>
      )}
      {runMenuOpen && !isRunning && valid && (
        <div
          className="current-popover current-run-control__menu"
          role="menu"
          aria-label="Run options"
          data-tutorial="floating-run-menu"
        >
          <button type="button" role="menuitem" onClick={() => runOption(() => { void executeWorkflow(); })}>
            Run entire workflow
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!selectedNode}
            title={!selectedNode ? "Select a single node first" : undefined}
            onClick={() => selectedNode && runOption(() => { void executeWorkflow(selectedNode.id); })}
          >
            Run from selected node
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!selectedNode}
            title={!selectedNode ? "Select a single node first" : undefined}
            onClick={() => selectedNode && runOption(() => { void regenerateNode(selectedNode.id); })}
          >
            Run selected node only
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={selectedNodes.length === 0}
            title={selectedNodes.length === 0 ? "Select one or more nodes first" : undefined}
            onClick={() => selectedNodes.length > 0 && runOption(() => {
              void executeSelectedNodes(selectedNodes.map((node) => node.id));
            })}
          >
            {selectedNodes.length > 0
              ? `Run ${selectedNodes.length} selected node${selectedNodes.length === 1 ? "" : "s"}`
              : "Run selected nodes"}
          </button>
        </div>
      )}
    </div>
  );
}
