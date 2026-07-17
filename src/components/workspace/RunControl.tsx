"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { CurrentButton } from "@/components/current/CurrentButton";
import { ChevronDownIcon, PlayIcon, StopIcon } from "@/components/current/CurrentIcons";
import { useFTUXStore, type TutorialStep } from "@/store/ftuxStore";
import { useWorkflowStore } from "@/store/workflowStore";
import { calculatePredictedCost, formatCost } from "@/utils/costCalculator";

export function RunControl() {
  const {
    nodes,
    edges,
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
    edges: state.edges,
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
  const runOptionsRef = useRef<HTMLButtonElement>(null);
  const runOptionsMenuRef = useRef<HTMLDivElement>(null);
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

  const { valid, errors } = useMemo(
    () => validateWorkflow(),
    [edges, nodes, validateWorkflow]
  );

  // Estimated cost of a full run, surfaced on hover of the Run button
  const runCostTitle = useMemo(() => {
    const predicted = calculatePredictedCost(nodes);
    if (predicted.nodeCount === 0) return undefined;
    const unknown = predicted.unknownPricingCount;
    const base = `Estimated cost: ${formatCost(predicted.totalCost)}`;
    return unknown > 0
      ? `${base} + ${unknown} generation${unknown === 1 ? "" : "s"} without pricing data`
      : base;
  }, [nodes]);

  useEffect(() => {
    if (isRunning || !valid) setRunMenuOpen(false);
  }, [isRunning, valid]);

  useEffect(() => {
    if (!runMenuOpen) return;
    runOptionsMenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [runMenuOpen]);

  useEffect(() => {
    if (!runMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!runMenuRef.current?.contains(event.target as Node)) {
        setRunMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRunMenuOpen(false);
        runOptionsRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [runMenuOpen]);

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

  return (
    <div className="current-run-control" ref={runMenuRef}>
      <CurrentButton
        variant="primary"
        className="current-run-control__primary"
        aria-label={isRunning ? "Stop workflow" : "Run"}
        aria-describedby={!valid && !isRunning ? validationId : undefined}
        title={isRunning ? undefined : runCostTitle}
        disabled={!valid && !isRunning}
        onClick={handleRun}
        data-tutorial="floating-run-button"
      >
        {isRunning ? <StopIcon /> : <PlayIcon />}
        <span>{isRunning ? runningLabel : "Run"}</span>
      </CurrentButton>
      {!isRunning && valid && (
        <button
          ref={runOptionsRef}
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
          ref={runOptionsMenuRef}
          className="current-popover current-run-control__menu"
          role="menu"
          aria-label="Run options"
          data-tutorial="floating-run-menu"
          onKeyDown={handleMenuKeyDown}
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
