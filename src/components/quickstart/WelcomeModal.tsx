"use client";

import { WorkflowFile } from "@/store/workflowStore";
import { Launchpad } from "@/components/workspace/Launchpad";

interface WelcomeModalProps {
  onWorkflowGenerated: (workflow: WorkflowFile, directoryPath?: string) => void;
  onClose: () => void;
  onNewProject: () => void;
}

export function WelcomeModal({
  onWorkflowGenerated,
  onNewProject,
}: WelcomeModalProps) {
  return (
    <Launchpad onNewCanvas={onNewProject} onWorkflowGenerated={onWorkflowGenerated} />
  );
}
