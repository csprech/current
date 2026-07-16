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
        <CurrentButton variant="secondary" onClick={back}>Back to Canvas</CurrentButton>
      </header>
      <section aria-labelledby="output-assets-heading">
        <div className="current-outputs__section-heading">
          <h2 id="output-assets-heading">All outputs</h2>
          <label className="current-output-thumbnail-size" title="Thumbnail size">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2.5" y="2.5" width="4" height="4" rx="0.75" />
              <rect x="9.5" y="2.5" width="4" height="4" rx="0.75" />
              <rect x="2.5" y="9.5" width="4" height="4" rx="0.75" />
              <rect x="9.5" y="9.5" width="4" height="4" rx="0.75" />
            </svg>
            <input
              type="range"
              name="output-thumbnail-size"
              min="144"
              max="320"
              step="8"
              value={thumbnailSize}
              onChange={(event) => setThumbnailSize(Number(event.target.value))}
              aria-label="Thumbnail size"
              aria-valuetext={`${thumbnailSize} pixels`}
            />
            <svg className="current-output-thumbnail-size__large-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="2" />
            </svg>
          </label>
        </div>
        <AssetLibrary embedded thumbnailSize={thumbnailSize} />
      </section>
    </main>
  );
}
