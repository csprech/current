"use client";

import { CurrentButton } from "@/components/current/CurrentButton";
import { AssetLibrary } from "@/components/AssetLibrary";
import { useWorkflowStore } from "@/store/workflowStore";

export function OutputsWorkspace({ onBack }: { onBack?: () => void } = {}) {
  const setWorkspaceView = useWorkflowStore((state) => state.setWorkspaceView);

  const back = () => {
    setWorkspaceView("canvas");
    onBack?.();
  };

  return (
    <main className="current-outputs absolute inset-0 h-full min-h-0 overflow-y-auto" aria-label="Workflow outputs">
      <header className="current-outputs__header">
        <div><span className="current-eyebrow">Review</span><h1>Workflow outputs</h1></div>
        <CurrentButton variant="secondary" onClick={back}>Back to Canvas</CurrentButton>
      </header>
      <section aria-labelledby="output-assets-heading">
        <h2 id="output-assets-heading">All outputs</h2>
        <AssetLibrary embedded />
      </section>
    </main>
  );
}
