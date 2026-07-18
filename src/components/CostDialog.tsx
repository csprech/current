"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { PredictedCostResult, CostBreakdownItem, formatCost } from "@/utils/costCalculator";
import { ProviderType } from "@/types/providers";
import { CurrentAlert, CurrentSheet } from "@/components/current";

interface CostDialogProps {
  predictedCost: PredictedCostResult;
  incurredCost: number;
  onClose: () => void;
}

/**
 * Provider icon component. Letter identity carries the provider distinction.
 */
function ProviderIcon({ provider }: { provider: ProviderType }) {
  const labels: Record<ProviderType, string> = {
    gemini: "G",
    fal: "f",
    replicate: "R",
    openai: "O",
    anthropic: "A",
    kie: "K",
    wavespeed: "W",
    ollama: "L",
    comfyui: "C",
  };

  return (
    <span className="current-provider-monogram inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium">
      {labels[provider]}
    </span>
  );
}

/**
 * Get display name for provider
 */
function getProviderDisplayName(provider: ProviderType): string {
  const names: Record<ProviderType, string> = {
    gemini: "Gemini",
    fal: "fal.ai",
    replicate: "Replicate",
    openai: "OpenAI",
    anthropic: "Anthropic",
    kie: "Kie.ai",
    wavespeed: "WaveSpeed",
    ollama: "Ollama",
    comfyui: "ComfyUI",
  };
  return names[provider] || provider;
}

/**
 * Get model page URL for external providers
 */
function getModelUrl(provider: ProviderType, modelId: string): string | null {
  if (provider === "replicate") {
    // modelId format: "owner/model" or "owner/model:version"
    const baseModelId = modelId.split(":")[0];
    return `https://replicate.com/${baseModelId}`;
  }
  if (provider === "fal") {
    // modelId format: "fal-ai/flux/dev" or similar
    return `https://fal.ai/models/${modelId}`;
  }
  if (provider === "wavespeed") {
    // modelId format: "wavespeed-ai/model-name"
    return `https://wavespeed.ai`;
  }
  return null;
}

/**
 * External link icon component
 */
function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function CostDialog({ predictedCost, incurredCost, onClose }: CostDialogProps) {
  const resetIncurredCost = useWorkflowStore((state) => state.resetIncurredCost);
  const [showResetAlert, setShowResetAlert] = useState(false);

  const handleReset = () => {
    setShowResetAlert(true);
  };

  const confirmReset = () => {
    resetIncurredCost();
    setShowResetAlert(false);
  };

  // Separate Gemini (reliable pricing) from external providers (unreliable pricing)
  const geminiItems = predictedCost.breakdown.filter((item) => item.provider === "gemini");
  const externalItems = predictedCost.breakdown.filter(
    (item) => item.provider !== "gemini"
  );

  // Group external items by provider
  const externalByProvider = new Map<ProviderType, CostBreakdownItem[]>();
  externalItems.forEach((item) => {
    const existing = externalByProvider.get(item.provider);
    if (existing) {
      existing.push(item);
    } else {
      externalByProvider.set(item.provider, [item]);
    }
  });

  const geminiTotal = geminiItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const externalNodeCount = externalItems.reduce((sum, item) => sum + item.count, 0);

  const hasGemini = geminiItems.length > 0;
  const hasExternal = externalItems.length > 0;

  return (
    <>
      <CurrentSheet open title="Workflow Costs" onClose={onClose} width="compact">
        <div className="space-y-4">
          {/* Gemini Cost Section - prices are reliable */}
          {hasGemini && (
            <div className="bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ProviderIcon provider="gemini" />
                <span className="text-sm text-neutral-300">Gemini Cost</span>
                <span className="ml-auto text-lg font-semibold text-[var(--current-blue)]">
                  {formatCost(geminiTotal)}
                </span>
              </div>

              <div className="space-y-1 pl-7">
                {geminiItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-neutral-500">
                      {item.count}x {item.modelName}
                    </span>
                    <span className="text-neutral-400">
                      {item.subtotal !== null ? formatCost(item.subtotal) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Providers Section - show model links instead of prices */}
          {hasExternal && (
            <div className="bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-300">External Providers</span>
                <span className="text-xs text-neutral-500">
                  {externalNodeCount} node{externalNodeCount !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {Array.from(externalByProvider.entries()).map(([provider, items]) => (
                  <div key={provider}>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                      <ProviderIcon provider={provider} />
                      <span>{getProviderDisplayName(provider)}</span>
                    </div>
                    <div className="space-y-1 pl-7">
                      {items.map((item, idx) => {
                        const modelUrl = getModelUrl(provider, item.modelId);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-neutral-500">
                              {item.count}x {item.modelName}
                            </span>
                            {modelUrl && (
                              <a
                                href={modelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                View model
                                <ExternalLinkIcon />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-neutral-600 mt-3">
                Pricing varies by model, hardware, and usage. Check provider for details.
              </p>
            </div>
          )}

          {/* No nodes message */}
          {predictedCost.nodeCount === 0 && (
            <div className="bg-neutral-900 rounded-lg p-4">
              <p className="text-xs text-neutral-500">
                No generation nodes in workflow
              </p>
            </div>
          )}

          {/* Incurred Cost Section - Gemini only */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">Incurred Cost</span>
              <span className="text-lg font-semibold text-[var(--current-blue)]">
                {formatCost(incurredCost)}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Actual API spend from Gemini generations
            </p>

            {incurredCost > 0 && (
              <button
                onClick={handleReset}
                aria-label="Reset cost"
                className="mt-3 text-xs text-neutral-400 hover:text-red-400 transition-colors"
              >
                Reset to $0.00
              </button>
            )}
          </div>

          {/* Pricing Note */}
          <div className="text-xs text-neutral-600">
            <p>Gemini pricing: $0.039-$0.24/image. External providers not tracked.</p>
          </div>
        </div>
      </CurrentSheet>
      <CurrentAlert
        open={showResetAlert}
        title="Reset incurred cost?"
        description="This clears the tracked spend for this workflow. It cannot be undone."
        cancelLabel="Keep cost"
        confirmLabel="Reset cost"
        danger
        onCancel={() => setShowResetAlert(false)}
        onConfirm={confirmReset}
      />
    </>
  );
}
