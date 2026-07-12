"use client";

import { useCallback, useState } from "react";
import { CurrentButton, InlineNotice } from "@/components/current";
import type { WorkflowFile } from "@/store/workflowStore";
import type { WorkflowProposal } from "@/types/quickstart";
import { QuickstartBackButton } from "./QuickstartBackButton";

interface PromptWorkflowViewProps {
  onBack: () => void;
  onWorkflowGenerated: (workflow: WorkflowFile) => void;
}

export function PromptWorkflowView({ onBack, onWorkflowGenerated }: PromptWorkflowViewProps) {
  const [description, setDescription] = useState("");
  const [proposal, setProposal] = useState<WorkflowProposal | null>(null);
  const [phase, setPhase] = useState<"editing" | "proposing" | "review" | "building">("editing");
  const [error, setError] = useState<string | null>(null);

  const requestProposal = useCallback(async () => {
    const value = description.trim();
    if (value.length < 3) return;
    setError(null);
    setPhase("proposing");
    try {
      const response = await fetch("/api/quickstart/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.proposal) {
        throw new Error(result.error || "Failed to prepare workflow proposal");
      }
      setProposal(result.proposal as WorkflowProposal);
      setPhase("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to prepare workflow proposal");
      setPhase("editing");
    }
  }, [description]);

  const buildWorkflow = useCallback(async () => {
    if (!proposal) return;
    setError(null);
    setPhase("building");
    try {
      const response = await fetch("/api/quickstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), contentLevel: "full" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.workflow) {
        throw new Error(result.error || "Failed to build workflow");
      }
      onWorkflowGenerated(result.workflow as WorkflowFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to build workflow");
      setPhase("review");
    }
  }, [description, onWorkflowGenerated, proposal]);

  const busy = phase === "proposing" || phase === "building";

  return (
    <div className="current-quickstart-view flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-700 flex items-center gap-4">
        <QuickstartBackButton onClick={phase === "review" ? () => setPhase("editing") : onBack} disabled={busy} />
        <h2 className="text-lg font-semibold text-neutral-100">
          {phase === "review" || phase === "building" ? "Review workflow" : "Describe a workflow"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {phase === "editing" || phase === "proposing" ? (
          <div className="space-y-2">
            <label htmlFor="workflow-description" className="text-xs font-medium text-neutral-400">Describe your workflow</label>
            <textarea
              id="workflow-description"
              value={description}
              onChange={(event) => { setDescription(event.target.value); setError(null); }}
              placeholder="e.g., Create product photography with consistent lighting and style from reference images..."
              disabled={busy}
              rows={6}
              className="w-full px-4 py-3 rounded-lg border bg-neutral-900/50 text-sm text-neutral-100 placeholder:text-neutral-500 resize-none border-neutral-700"
            />
            <p className="text-xs text-neutral-400">Describe the inputs, transformations, and outcome. Current will prepare a plan for review before changing your canvas.</p>
          </div>
        ) : proposal ? (
          <div className="current-workflow-proposal">
            <div className="current-workflow-proposal__summary">
              <span>{proposal.estimatedComplexity}</span>
              <h3>{proposal.name}</h3>
              <p>{proposal.description}</p>
            </div>
            <ol aria-label="Proposed workflow nodes">
              {proposal.nodes.map((node, index) => (
                <li key={node.id}>
                  <span>{index + 1}</span>
                  <div><strong>{node.suggestedTitle}</strong><p>{node.purpose}</p></div>
                </li>
              ))}
            </ol>
            {proposal.connections.length > 0 && (
              <div className="current-workflow-proposal__connections">
                <h4>Flow</h4>
                {proposal.connections.map((connection) => <p key={`${connection.from}-${connection.to}`}>{connection.description}</p>)}
              </div>
            )}
            {proposal.warnings?.map((warning) => <InlineNotice key={warning} tone="warning">{warning}</InlineNotice>)}
          </div>
        ) : null}

        {error && <InlineNotice tone="error">{error}</InlineNotice>}
      </div>

      <div className="px-6 py-4 border-t border-neutral-700 flex justify-end gap-2 bg-neutral-800/50">
        {phase === "review" || phase === "building" ? (
          <>
            <CurrentButton variant="secondary" onClick={() => setPhase("editing")} disabled={busy}>Edit description</CurrentButton>
            <CurrentButton variant="primary" onClick={buildWorkflow} disabled={busy}>{phase === "building" ? "Building…" : "Build workflow"}</CurrentButton>
          </>
        ) : (
          <CurrentButton variant="primary" onClick={requestProposal} disabled={description.trim().length < 3 || busy}>
            {phase === "proposing" ? "Preparing…" : "Review workflow"}
          </CurrentButton>
        )}
      </div>
    </div>
  );
}
