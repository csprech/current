"use client";

import { useState } from "react";
import { CurrentButton } from "@/components/current/CurrentButton";
import { AssetLibrary } from "@/components/AssetLibrary";
import { useWorkflowStore } from "@/store/workflowStore";

export function OutputsWorkspace({ onBack }: { onBack?: () => void } = {}) {
  const setWorkspaceView = useWorkflowStore((state) => state.setWorkspaceView);
  const [thumbnailSize, setThumbnailSize] = useState(208);

  const back = () => {
    setWorkspaceView("canvas");
    onBack?.();
  };

  return (
    <main
      className="current-outputs nowheel absolute inset-0 h-full min-h-0 overflow-y-auto overscroll-contain"
      aria-label="Workflow outputs"
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <header className="current-outputs__header">
        <div><span className="current-eyebrow">Review</span><h1>Workflow outputs</h1></div>
        <div className="current-outputs__actions">
          <label className="current-output-thumbnail-size">
            <span>Thumbnail size</span>
            <input
              type="range"
              min="144"
              max="320"
              step="8"
              value={thumbnailSize}
              onChange={(event) => setThumbnailSize(Number(event.target.value))}
              aria-valuetext={`${thumbnailSize} pixels`}
            />
          </label>
          <CurrentButton variant="secondary" onClick={back}>Back to Canvas</CurrentButton>
        </div>
      </header>
      <section aria-labelledby="output-assets-heading">
        <h2 id="output-assets-heading">All outputs</h2>
        <AssetLibrary embedded thumbnailSize={thumbnailSize} />
      </section>
    </main>
  );
}
