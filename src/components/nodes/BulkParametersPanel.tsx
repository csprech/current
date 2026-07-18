"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  AspectRatio,
  LLMGenerateNodeData,
  LLMModelType,
  LLMProvider,
  ModelType,
  MODEL_DISPLAY_NAMES,
  NanoBananaNodeData,
  WorkflowNode,
  WorkflowNodeData,
} from "@/types";
import { MAX_VARIANTS } from "@/store/execution/variantExecution";
import { BASE_ASPECT_RATIOS, GEMINI_IMAGE_MODELS, RESOLUTIONS_PRO } from "@/lib/nanoBananaOptions";

/** Node types the bulk editor supports (2+ nodes of the same type selected). */
export const BULK_EDITABLE_NODE_TYPES = new Set(["nanoBanana", "generateVideo", "llmGenerate"]);

const BULK_TYPE_LABELS: Record<string, string> = {
  nanoBanana: "Generate Image",
  generateVideo: "Generate Video",
  llmGenerate: "Generate Text",
};

import { LLM_PROVIDERS, LLM_MODELS, getDefaultModelForProvider } from "@/lib/llmCatalog";

const MIXED = "__mixed__";

/** Shared value across nodes, or undefined when the selection disagrees. */
function sharedValue<T>(nodes: WorkflowNode[], pick: (data: WorkflowNodeData) => T): { value: T | undefined; mixed: boolean } {
  const first = pick(nodes[0].data);
  const mixed = nodes.some((node) => pick(node.data) !== first);
  return { value: mixed ? undefined : first, mixed };
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-neutral-400 shrink-0 w-24 truncate" title={label}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "nodrag nopan flex-1 min-w-0 text-[11px] py-1 px-2 bg-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-600 text-white";

function MixedTag() {
  return <span className="text-[10px] text-[var(--current-blue)] shrink-0">Mixed</span>;
}

/**
 * Bulk parameter editor: shown in the Inspector when 2+ nodes of the same
 * editable type are selected. Every change applies to all selected nodes;
 * fields where the selection disagrees show a Mixed marker until set.
 */
export function BulkParametersPanel({ nodes }: { nodes: WorkflowNode[] }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const type = nodes[0].type as string;

  const applyToAll = (data: Partial<WorkflowNodeData>) => {
    nodes.forEach((node) => updateNodeData(node.id, data));
  };

  return (
    <div className="space-y-3 current-inspector__controls">
      <div className="text-[11px] text-neutral-400">
        Editing <span className="text-neutral-100 font-medium">{nodes.length} × {BULK_TYPE_LABELS[type] ?? type}</span> — changes apply to every selected node.
      </div>

      {(type === "nanoBanana" || type === "generateVideo") && (
        <BulkVariants nodes={nodes} applyToAll={applyToAll} />
      )}

      {type === "nanoBanana" && <BulkImageFields nodes={nodes} applyToAll={applyToAll} />}
      {type === "llmGenerate" && <BulkLlmFields nodes={nodes} applyToAll={applyToAll} />}
    </div>
  );
}

function BulkVariants({ nodes, applyToAll }: { nodes: WorkflowNode[]; applyToAll: (data: Partial<WorkflowNodeData>) => void }) {
  const { value, mixed } = sharedValue(nodes, (data) => (data as NanoBananaNodeData).variantCount ?? 1);

  return (
    <FieldRow label="Variations">
      <div className="flex gap-0.5 ml-auto" role="radiogroup" aria-label="Variations per run (all selected)">
        {Array.from({ length: MAX_VARIANTS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={!mixed && value === n}
            aria-label={`${n} variation${n === 1 ? "" : "s"} per run`}
            className={`current-variant-option nodrag nopan ${!mixed && value === n ? "current-variant-option--active" : ""}`}
            onClick={() => applyToAll({ variantCount: n })}
          >
            {n}
          </button>
        ))}
      </div>
      {mixed && <MixedTag />}
    </FieldRow>
  );
}

function BulkImageFields({ nodes, applyToAll }: { nodes: WorkflowNode[]; applyToAll: (data: Partial<WorkflowNodeData>) => void }) {
  const allGemini = nodes.every(
    (node) => ((node.data as NanoBananaNodeData).selectedModel?.provider ?? "gemini") === "gemini"
  );
  const model = sharedValue(nodes, (data) => (data as NanoBananaNodeData).model);
  const aspect = sharedValue(nodes, (data) => (data as NanoBananaNodeData).aspectRatio);
  const resolution = sharedValue(nodes, (data) => (data as NanoBananaNodeData).resolution);
  const search = sharedValue(nodes, (data) => (data as NanoBananaNodeData).useGoogleSearch ?? false);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchRef.current) searchRef.current.indeterminate = search.mixed;
  }, [search.mixed]);

  return (
    <>
      {allGemini && (
        <FieldRow label="Model">
          <select
            aria-label="Model (all selected)"
            className={selectClass}
            value={model.mixed ? MIXED : model.value}
            onChange={(e) => {
              if (e.target.value === MIXED) return;
              const nextModel = e.target.value as ModelType;
              applyToAll({
                model: nextModel,
                selectedModel: {
                  provider: "gemini",
                  modelId: nextModel,
                  displayName: MODEL_DISPLAY_NAMES[nextModel] || nextModel,
                },
              });
            }}
          >
            {model.mixed && <option value={MIXED}>Mixed</option>}
            {GEMINI_IMAGE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FieldRow>
      )}

      <FieldRow label="Aspect ratio">
        <select
          aria-label="Aspect ratio (all selected)"
          className={selectClass}
          value={aspect.mixed ? MIXED : aspect.value}
          onChange={(e) => {
            if (e.target.value === MIXED) return;
            applyToAll({ aspectRatio: e.target.value as AspectRatio });
          }}
        >
          {aspect.mixed && <option value={MIXED}>Mixed</option>}
          {BASE_ASPECT_RATIOS.map((ar) => (
            <option key={ar} value={ar}>{ar}</option>
          ))}
        </select>
      </FieldRow>

      {allGemini && (
        <FieldRow label="Resolution">
          <select
            aria-label="Resolution (all selected)"
            className={selectClass}
            value={resolution.mixed ? MIXED : resolution.value}
            onChange={(e) => {
              if (e.target.value === MIXED) return;
              applyToAll({ resolution: e.target.value as NanoBananaNodeData["resolution"] });
            }}
          >
            {resolution.mixed && <option value={MIXED}>Mixed</option>}
            {RESOLUTIONS_PRO.map((res) => (
              <option key={res} value={res}>{res}</option>
            ))}
          </select>
        </FieldRow>
      )}

      {allGemini && (
        <FieldRow label="Google Search">
          <input
            ref={searchRef}
            type="checkbox"
            aria-label="Google Search grounding (all selected)"
            className="nodrag nopan ml-auto h-3.5 w-3.5 accent-blue-500"
            checked={!search.mixed && !!search.value}
            onChange={(e) => applyToAll({ useGoogleSearch: e.target.checked })}
          />
          {search.mixed && <MixedTag />}
        </FieldRow>
      )}
    </>
  );
}

function BulkLlmFields({ nodes, applyToAll }: { nodes: WorkflowNode[]; applyToAll: (data: Partial<WorkflowNodeData>) => void }) {
  const provider = sharedValue(nodes, (data) => (data as LLMGenerateNodeData).provider);
  const model = sharedValue(nodes, (data) => (data as LLMGenerateNodeData).model);
  const temperature = sharedValue(nodes, (data) => (data as LLMGenerateNodeData).temperature);
  const maxTokens = sharedValue(nodes, (data) => (data as LLMGenerateNodeData).maxTokens);

  return (
    <>
      <FieldRow label="Provider">
        <select
          aria-label="Provider (all selected)"
          className={selectClass}
          value={provider.mixed ? MIXED : provider.value}
          onChange={(e) => {
            const next = e.target.value as LLMProvider;
            if ((e.target.value as string) === MIXED) return;
            applyToAll({ provider: next, model: getDefaultModelForProvider(next) });
          }}
        >
          {provider.mixed && <option value={MIXED}>Mixed</option>}
          {LLM_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </FieldRow>

      {!provider.mixed && provider.value && provider.value !== "ollama" && (
        <FieldRow label="Model">
          <select
            aria-label="Model (all selected)"
            className={selectClass}
            value={model.mixed ? MIXED : model.value}
            onChange={(e) => {
              if (e.target.value === MIXED) return;
              applyToAll({ model: e.target.value as LLMModelType });
            }}
          >
            {model.mixed && <option value={MIXED}>Mixed</option>}
            {LLM_MODELS[provider.value].map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FieldRow>
      )}

      {!provider.mixed && provider.value === "ollama" && (
        <FieldRow label="Model">
          <input
            type="text"
            aria-label="Model (all selected)"
            className={selectClass}
            placeholder={model.mixed ? "Mixed" : "llama3.2"}
            value={model.mixed ? "" : (model.value as string) ?? ""}
            onChange={(e) => applyToAll({ model: e.target.value as LLMModelType })}
          />
          {model.mixed && <MixedTag />}
        </FieldRow>
      )}

      <FieldRow label="Temperature">
        <input
          type="number"
          aria-label="Temperature (all selected)"
          className={selectClass}
          min={0}
          max={2}
          step={0.1}
          placeholder={temperature.mixed ? "Mixed" : undefined}
          value={temperature.mixed ? "" : temperature.value ?? 0.7}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) applyToAll({ temperature: Math.max(0, Math.min(2, next)) });
          }}
        />
        {temperature.mixed && <MixedTag />}
      </FieldRow>

      <FieldRow label="Max tokens">
        <input
          type="number"
          aria-label="Max tokens (all selected)"
          className={selectClass}
          min={256}
          max={16384}
          step={256}
          placeholder={maxTokens.mixed ? "Mixed" : undefined}
          value={maxTokens.mixed ? "" : maxTokens.value ?? 8192}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) applyToAll({ maxTokens: Math.max(256, Math.min(16384, next)) });
          }}
        />
        {maxTokens.mixed && <MixedTag />}
      </FieldRow>
    </>
  );
}
