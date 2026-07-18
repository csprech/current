"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkflowFile } from "@/store/workflowStore";
import { getAllPresets, PRESET_TEMPLATES } from "@/lib/quickstart/templates";
import type { CommunityWorkflowMeta, TemplateCategory } from "@/types/quickstart";
import { InlineNotice } from "@/components/current";
import { QuickstartBackButton } from "./QuickstartBackButton";
import { TemplateCard } from "./TemplateCard";

interface TemplateExplorerViewProps {
  onBack: () => void;
  onWorkflowSelected: (workflow: WorkflowFile) => void;
}

type Outcome = "all" | "create" | "refine" | "compose";

const OUTCOMES: Array<{ id: Outcome; label: string; description: string }> = [
  { id: "all", label: "All", description: "Every starting point" },
  { id: "create", label: "Create", description: "Generate campaign-ready imagery" },
  { id: "refine", label: "Refine", description: "Explore style and color" },
  { id: "compose", label: "Compose", description: "Combine subjects and scenes" },
];

const TEMPLATE_OUTCOMES: Record<string, Exclude<Outcome, "all">> = {
  "product-shot": "create",
  "model-product": "create",
  "color-variations": "refine",
  "style-transfer": "refine",
  "background-swap": "compose",
  "scene-composite": "compose",
};

const primaryThumbnails: Record<string, string> = Object.fromEntries(
  Object.keys(TEMPLATE_OUTCOMES).map((id) => [id, `/template-thumbnails/primary/${id}.jpg`]),
);
const hoverThumbnails: Record<string, string> = Object.fromEntries(
  Object.keys(TEMPLATE_OUTCOMES).map((id) => [id, `/template-thumbnails/${id}.png`]),
);

function classifyCommunityOutcome(workflow: CommunityWorkflowMeta): Exclude<Outcome, "all"> | null {
  const content = `${workflow.name} ${workflow.description} ${(workflow.tags ?? []).join(" ")}`.toLowerCase();
  if (/\b(compose|composite|composition|combine|merge|scene|background)\b/.test(content)) return "compose";
  if (/\b(refine|style|stylize|colour|color|variation|enhance|retouch|polish)\b/.test(content)) return "refine";
  if (/\b(create|generate|generator|generation|campaign|portrait|product)\b/.test(content)) return "create";
  return null;
}

export function TemplateExplorerView({ onBack, onWorkflowSelected }: TemplateExplorerViewProps) {
  const [communityWorkflows, setCommunityWorkflows] = useState<CommunityWorkflowMeta[]>([]);
  const [communitySource, setCommunitySource] = useState<{ repo: string; browseUrl: string } | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const presets = getAllPresets();

  const presetMetadata = useMemo(() => Object.fromEntries(
    PRESET_TEMPLATES.map((template) => [template.id, template.workflow.nodes.length]),
  ), []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPresets = presets.filter((preset) => {
    const matchesOutcome = outcome === "all" || TEMPLATE_OUTCOMES[preset.id] === outcome;
    const matchesSearch = !normalizedQuery || `${preset.name} ${preset.description}`.toLowerCase().includes(normalizedQuery);
    return matchesOutcome && matchesSearch;
  });
  const filteredCommunity = communityWorkflows.filter((workflow) => {
    const matchesOutcome = outcome === "all" || classifyCommunityOutcome(workflow) === outcome;
    const matchesSearch = !normalizedQuery || `${workflow.name} ${workflow.author} ${workflow.description}`.toLowerCase().includes(normalizedQuery);
    return matchesOutcome && matchesSearch;
  });

  useEffect(() => {
    let active = true;
    fetch("/api/community-workflows")
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        if (result.success) setCommunityWorkflows(result.workflows);
        if (result.source) setCommunitySource(result.source);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoadingList(false); });
    return () => { active = false; };
  }, []);

  const loadPreset = useCallback(async (templateId: string) => {
    setLoadingWorkflowId(templateId);
    setError(null);
    try {
      const response = await fetch("/api/quickstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, contentLevel: "full" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.workflow) throw new Error(result.error || "Failed to load template");
      onWorkflowSelected(result.workflow as WorkflowFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load template");
    } finally {
      setLoadingWorkflowId(null);
    }
  }, [onWorkflowSelected]);

  const loadCommunity = useCallback(async (workflowId: string) => {
    setLoadingWorkflowId(workflowId);
    setError(null);
    try {
      const response = await fetch(`/api/community-workflows/${workflowId}`);
      const result = await response.json();
      if (!response.ok || !result.success || !result.downloadUrl) throw new Error(result.error || "Failed to get download URL");
      // Primary: fetch straight from GitHub's CDN (CORS-open, no server load).
      // Fallback: the server relay, for networks that block githubusercontent.
      let workflowResponse: Response | null = null;
      try {
        workflowResponse = await fetch(result.downloadUrl);
      } catch {
        workflowResponse = null;
      }
      if (!workflowResponse || !workflowResponse.ok) {
        workflowResponse = await fetch(`/api/community-workflows/${workflowId}/file`);
      }
      if (!workflowResponse.ok) throw new Error("Failed to download workflow");
      onWorkflowSelected(await workflowResponse.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load workflow");
    } finally {
      setLoadingWorkflowId(null);
    }
  }, [onWorkflowSelected]);

  const busy = loadingWorkflowId !== null;

  return (
    <div className="current-quickstart-view flex flex-col h-full min-h-0">
      <header className="flex-shrink-0 px-6 py-4 border-b border-neutral-700 flex items-center gap-4">
        <QuickstartBackButton onClick={onBack} disabled={busy} />
        <div><h2 className="text-lg font-semibold text-neutral-100">Browse templates</h2><p className="text-xs text-neutral-500">Choose the outcome you want to create.</p></div>
      </header>

      <div className="current-template-explorer">
        <aside>
          <label htmlFor="template-search" className="sr-only">Search templates</label>
          <input
            id="template-search"
            name="template-search"
            autoComplete="off"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search templates…"
          />
          <h3>Creative outcome</h3>
          <div className="current-template-explorer__outcomes">
            {OUTCOMES.map((item) => (
              <button key={item.id} type="button" aria-label={item.label} aria-pressed={outcome === item.id} onClick={() => setOutcome(item.id)}>
                <strong>{item.label}</strong><span>{item.description}</span>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="current-template-explorer__results nowheel overscroll-contain"
          role="region"
          aria-label="Template results"
          onWheelCapture={(event) => event.stopPropagation()}
        >
          {filteredPresets.length > 0 ? (
            <section>
              <h3>{outcome === "all" ? "Featured workflows" : OUTCOMES.find((item) => item.id === outcome)?.label}</h3>
              <div className="grid grid-cols-2 gap-3">
                {filteredPresets.map((preset) => (
                  <TemplateCard
                    key={preset.id}
                    template={preset}
                    nodeCount={presetMetadata[preset.id] ?? 0}
                    previewImage={primaryThumbnails[preset.id]}
                    hoverImage={hoverThumbnails[preset.id]}
                    isLoading={loadingWorkflowId === preset.id}
                    onUseWorkflow={() => loadPreset(preset.id)}
                    disabled={busy && loadingWorkflowId !== preset.id}
                    showCategory={false}
                  />
                ))}
              </div>
            </section>
          ) : <p className="current-template-explorer__empty">No templates match this outcome and search.</p>}

          {(isLoadingList || filteredCommunity.length > 0) && (
            <section>
              <h3>More workflows</h3>
              {isLoadingList ? <p>Loading workflows…</p> : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredCommunity.map((workflow) => (
                    <TemplateCard
                      key={workflow.id}
                      template={{ ...workflow, icon: "", category: "community" as TemplateCategory }}
                      nodeCount={workflow.nodeCount}
                      previewImage={workflow.previewImage}
                      hoverImage={workflow.hoverImage}
                      isLoading={loadingWorkflowId === workflow.id}
                      onUseWorkflow={() => loadCommunity(workflow.id)}
                      disabled={busy && loadingWorkflowId !== workflow.id}
                      showCategory={false}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
          {error && <InlineNotice tone="error">{error}</InlineNotice>}

          {communitySource && (
            <p className="text-[11px] text-neutral-500 mt-4">
              Community templates live in{" "}
              <a
                href={communitySource.browseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-300"
              >
                {communitySource.repo}
              </a>{" "}
              on GitHub — publish yours from the Project menu (a pull request is the review queue).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
