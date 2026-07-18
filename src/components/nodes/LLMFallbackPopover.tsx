"use client";

/**
 * LLMFallbackPopover
 *
 * Small centered modal for selecting a fallback LLM for an llmGenerate node.
 * Persists the selection as a SelectedModel on nodeData.fallbackModel, with
 * "google" mapped to "gemini" as ProviderType (matches how NBP stores LLM
 * provider info so JSON round-trips cleanly).
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import type {
  LLMGenerateNodeData,
  LLMProvider,
  LLMModelType,
  ProviderType,
  SelectedModel,
} from "@/types";
import { LLM_PROVIDERS, LLM_MODELS, getDefaultModelForProvider } from "@/lib/llmCatalog";

const mapLlmToProviderType = (p: LLMProvider): ProviderType =>
  p === "google" ? "gemini" : p;

const mapProviderTypeToLlm = (p: ProviderType): LLMProvider =>
  p === "gemini" ? "google" : (p as LLMProvider);

interface LLMFallbackPopoverProps {
  nodeId: string;
  onClose: () => void;
}

export function LLMFallbackPopover({ nodeId, onClose }: LLMFallbackPopoverProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const data = node?.data as LLMGenerateNodeData | undefined;
  const existing = data?.fallbackModel;

  const initialProvider: LLMProvider = existing
    ? mapProviderTypeToLlm(existing.provider)
    : "anthropic";
  const initialModel: LLMModelType = (existing?.modelId as LLMModelType) ||
    getDefaultModelForProvider(initialProvider);

  const [provider, setProvider] = useState<LLMProvider>(initialProvider);
  const [model, setModel] = useState<LLMModelType>(initialModel);

  // Ensure model is valid whenever provider changes (Ollama is free-text)
  useEffect(() => {
    if (provider === "ollama") return;
    const valid = LLM_MODELS[provider].some((m) => m.value === model);
    if (!valid) setModel(getDefaultModelForProvider(provider));
  }, [provider, model]);

  const handleSave = () => {
    const label = LLM_MODELS[provider].find((m) => m.value === model)?.label || model;
    const fallbackModel: SelectedModel = {
      provider: mapLlmToProviderType(provider),
      modelId: model,
      displayName: label,
    };
    updateNodeData(nodeId, { fallbackModel, fallbackParameters: {} });
    onClose();
  };

  const handleRemove = () => {
    updateNodeData(nodeId, { fallbackModel: undefined, fallbackParameters: undefined });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fallback-llm-title"
        className="w-80 current-transient-surface rounded-lg shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fallback-llm-title" className="text-sm font-semibold text-neutral-200 mb-3">
          Select fallback LLM
        </h2>

        <label className="block text-xs text-neutral-400 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LLMProvider)}
          className="w-full mb-3 px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        >
          {LLM_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="block text-xs text-neutral-400 mb-1">Model</label>
        {provider === "ollama" ? (
          <input
            type="text"
            value={model}
            placeholder="llama3.2"
            onChange={(e) => setModel(e.target.value as LLMModelType)}
            className="w-full mb-4 px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
        ) : (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as LLMModelType)}
            className="w-full mb-4 px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          >
            {LLM_MODELS[provider].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleRemove}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove fallback
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="current-button current-button--primary px-3 py-1 text-xs rounded"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
