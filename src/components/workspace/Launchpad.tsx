"use client";

import { useCallback, useState } from "react";
import { CurrentMark } from "@/components/current";
import { PromptWorkflowView } from "@/components/quickstart/PromptWorkflowView";
import { TemplateExplorerView } from "@/components/quickstart/TemplateExplorerView";
import { WorkflowBrowserView } from "@/components/quickstart/WorkflowBrowserView";
import type { WorkflowFile } from "@/store/workflowStore";
import type { QuickstartView } from "@/types/quickstart";

export interface LaunchpadProps {
  onNewCanvas: () => void;
  onWorkflowGenerated: (workflow: WorkflowFile, directoryPath?: string) => void;
}

const routes = [
  {
    id: "new",
    title: "New canvas",
    description: "Begin with an open workspace",
    icon: "M12 5v14M5 12h14",
  },
  {
    id: "vibe",
    title: "Describe a workflow",
    description: "Turn an idea into a connected flow",
    icon: "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z",
  },
  {
    id: "templates",
    title: "Browse templates",
    description: "Start from a proven creative system",
    icon: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  },
  {
    id: "browse",
    title: "Open project",
    description: "Continue a workflow from your library",
    icon: "M3 7h7l2 2h9v9H3V7z",
  },
] as const;

export function Launchpad({ onNewCanvas, onWorkflowGenerated }: LaunchpadProps) {
  const [currentView, setCurrentView] = useState<QuickstartView>("initial");
  const handleBack = useCallback(() => setCurrentView("initial"), []);

  return (
    <main className="current-launchpad" aria-label="Current launchpad">
      <div className="current-launchpad__ambient" aria-hidden="true" />
      {currentView === "initial" ? (
        <div className="current-launchpad__home">
          <header className="current-launchpad__intro">
            <CurrentMark showWordmark />
            <p className="current-launchpad__eyebrow">Creative workflows in motion</p>
            <h1>Where will your next idea flow?</h1>
            <p>
              Build and orchestrate image, video, audio, text, and 3D work on one
              continuous canvas.
            </p>
          </header>

          <div className="current-launchpad__routes" aria-label="Start a project">
            {routes.map((route, index) => (
              <button
                key={route.id}
                type="button"
                aria-label={route.title}
                className="current-launchpad__route"
                data-primary={index === 0 ? "true" : undefined}
                onClick={() => {
                  if (route.id === "new") onNewCanvas();
                  else setCurrentView(route.id);
                }}
              >
                <span className="current-launchpad__route-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d={route.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <strong>{route.title}</strong>
                  <small>{route.description}</small>
                </span>
                <span className="current-launchpad__route-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section className="current-launchpad__detail" aria-label="Launchpad detail">
          {currentView === "templates" && (
            <TemplateExplorerView onBack={handleBack} onWorkflowSelected={onWorkflowGenerated} />
          )}
          {currentView === "vibe" && (
            <PromptWorkflowView onBack={handleBack} onWorkflowGenerated={onWorkflowGenerated} />
          )}
          {currentView === "browse" && (
            <WorkflowBrowserView
              onBack={handleBack}
              onWorkflowLoaded={onWorkflowGenerated}
            />
          )}
        </section>
      )}
    </main>
  );
}
