"use client";

import { WorkflowFile } from "@/store/workflowStore";
import { WorkflowBrowserView } from "./quickstart/WorkflowBrowserView";
import { CurrentSheet } from "@/components/current";

interface WorkflowBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowLoaded: (workflow: WorkflowFile, directoryPath: string) => void;
}

export function WorkflowBrowserModal({
  isOpen,
  onClose,
  onWorkflowLoaded,
}: WorkflowBrowserModalProps) {
  return (
    <CurrentSheet open={isOpen} title="Open Workflow" onClose={onClose} width="wide">
      <div className="max-h-[72vh] overflow-hidden" onWheelCapture={(event) => event.stopPropagation()}>
        <WorkflowBrowserView
          onWorkflowLoaded={onWorkflowLoaded}
          onClose={onClose}
        />
      </div>
    </CurrentSheet>
  );
}
