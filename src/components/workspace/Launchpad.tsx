"use client";

import { useCallback, useMemo, useState } from "react";
import { CurrentMark, InlineNotice } from "@/components/current";
import { PromptWorkflowView } from "@/components/quickstart/PromptWorkflowView";
import { TemplateExplorerView } from "@/components/quickstart/TemplateExplorerView";
import { WorkflowBrowserView } from "@/components/quickstart/WorkflowBrowserView";
import type { WorkflowFile } from "@/store/workflowStore";
import type { QuickstartView } from "@/types/quickstart";
import type { WorkflowSaveConfig } from "@/types";
import { loadSaveConfigs, markWorkflowOpened } from "@/store/utils/localStorage";

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

function getRecentProjects(): WorkflowSaveConfig[] {
  try {
    return Object.values(loadSaveConfigs())
      .filter((config): config is WorkflowSaveConfig => Boolean(
        config && typeof config.workflowId === "string" && typeof config.name === "string" &&
        typeof config.directoryPath === "string" && config.directoryPath &&
        (typeof config.lastOpenedAt === "number" || typeof config.lastSavedAt === "number"),
      ))
      .sort((a, b) => (b.lastOpenedAt ?? b.lastSavedAt ?? 0) - (a.lastOpenedAt ?? a.lastSavedAt ?? 0))
      .slice(0, 4);
  } catch {
    return [];
  }
}

function formatLastOpened(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

export function Launchpad({ onNewCanvas, onWorkflowGenerated }: LaunchpadProps) {
  const [currentView, setCurrentView] = useState<QuickstartView>("initial");
  const [recentError, setRecentError] = useState<string | null>(null);
  const [openingRecent, setOpeningRecent] = useState<string | null>(null);
  const recentProjects = useMemo(getRecentProjects, []);
  const handleBack = useCallback(() => setCurrentView("initial"), []);

  const openRecentProject = useCallback(async (project: WorkflowSaveConfig) => {
    setOpeningRecent(project.workflowId);
    setRecentError(null);
    try {
      const response = await fetch(`/api/workflow?path=${encodeURIComponent(project.directoryPath)}&load=true`);
      const result = await response.json();
      if (!response.ok || !result.success || !result.workflow) throw new Error(result.error || "Failed to open recent project");
      markWorkflowOpened({
        workflowId: project.workflowId,
        directoryPath: project.directoryPath,
      });
      onWorkflowGenerated(result.workflow as WorkflowFile, project.directoryPath);
    } catch (caught) {
      setRecentError(caught instanceof Error ? caught.message : "Failed to open recent project");
    } finally {
      setOpeningRecent(null);
    }
  }, [onWorkflowGenerated]);

  return (
    <main className="current-launchpad" aria-label="Current launchpad">
      <div className="current-launchpad__ambient" aria-hidden="true" />
      {currentView === "initial" ? (
        <div className="current-launchpad__home">
          <header className="current-launchpad__intro">
            <CurrentMark showWordmark />
            <p className="current-launchpad__eyebrow">Creative workflows in motion</p>
            <h1>Where will your next idea flow?</h1>
            <p className="current-launchpad__description">
              Build and orchestrate image, video, audio, text, and 3D work on one
              continuous canvas.
            </p>
            {recentProjects.length > 0 && (
              <section className="current-launchpad__recents" aria-labelledby="recent-projects-title">
                <h2 id="recent-projects-title">Recent projects</h2>
                <div>
                  {recentProjects.map((project) => {
                    const hasOpenedAt = typeof project.lastOpenedAt === "number";
                    const recentTimestamp = project.lastOpenedAt ?? project.lastSavedAt!;
                    const recentLabel = hasOpenedAt ? "Last opened" : "Last saved";
                    const formattedTimestamp = formatLastOpened(recentTimestamp);
                    return (
                      <button
                        key={project.workflowId}
                        type="button"
                        aria-label={`${project.name}, ${recentLabel} ${formattedTimestamp}`}
                        onClick={() => openRecentProject(project)}
                        disabled={openingRecent !== null}
                      >
                        <span><strong>{project.name}</strong><small>{recentLabel} {formattedTimestamp}</small></span>
                        <span aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
                {recentError && <InlineNotice tone="error">{recentError}</InlineNotice>}
              </section>
            )}
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
