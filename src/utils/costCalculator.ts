import { ModelType, Resolution, MODEL_DISPLAY_NAMES, NanoBananaNodeData, GenerateVideoNodeData, Generate3DNodeData, GenerateAudioNodeData, SplitGridNodeData, WorkflowNode, ProviderType, SelectedModelPricing } from "@/types";

// Pricing in USD per image (Gemini API)
export const PRICING = {
  "nano-banana": {
    "512": 0.039,
    "1K": 0.039,
    "2K": 0.039, // nano-banana only supports 1K
    "4K": 0.039,
  },
  "nano-banana-pro": {
    "512": 0.134,
    "1K": 0.134,
    "2K": 0.134,
    "4K": 0.24,
  },
  "nano-banana-2": {
    "512": 0.045,
    "1K": 0.067,
    "2K": 0.101,
    "4K": 0.151,
  },
} as const;

export function calculateGenerationCost(model: ModelType, resolution: Resolution): number {
  // nano-banana only supports 1K resolution (flat pricing)
  if (model === "nano-banana") {
    return PRICING["nano-banana"]["1K"];
  }
  return PRICING[model][resolution];
}

/**
 * Pricing info for external provider models
 */
export interface ModelPricing {
  unitCost: number;
  unit: string;  // "image", "video", "second", etc.
}

/**
 * Get cost info from ProviderModel pricing field
 * Returns null if pricing is unavailable (e.g., Replicate has no pricing API)
 */
export function getModelCost(pricing: { type: 'per-run' | 'per-second'; amount: number } | null | undefined): ModelPricing | null {
  if (!pricing) return null;
  return {
    unitCost: pricing.amount,
    unit: pricing.type === 'per-run' ? 'image' : 'second',
  };
}

/** Clamp a node's variants-per-run setting to the supported 1–4 range. */
function clampVariantCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(4, Math.round(value)));
}

/**
 * Hardcoded Gemini pricing for legacy models.
 */
function getGeminiPricing(
  provider: ProviderType,
  modelId: string,
  resolution?: Resolution
): { unitCost: number; unit: string } | null {
  if (provider !== "gemini") return null;
  if (modelId === "nano-banana" || modelId === "gemini-2.5-flash-image") {
    return { unitCost: PRICING["nano-banana"]["1K"], unit: "image" };
  }
  if (modelId === "nano-banana-pro" || modelId === "gemini-3-pro-image-preview") {
    return { unitCost: PRICING["nano-banana-pro"][resolution || "1K"], unit: "image" };
  }
  if (modelId === "nano-banana-2" || modelId === "gemini-3.1-flash-image-preview") {
    return { unitCost: PRICING["nano-banana-2"][resolution || "1K"], unit: "image" };
  }
  return null;
}

/**
 * Estimate the cost of running a single node once.
 * Returns null when the node's model has no pricing data (e.g. Replicate),
 * and 0 for nodes that run locally at no cost.
 */
export function estimateNodeRunCost(node: WorkflowNode): number | null {
  if (node.type === "removeBackground" || node.type === "imageAction" || node.type === "videoAction") {
    return 0; // runs on-device
  }

  if (node.type === "nanoBanana") {
    const data = node.data as NanoBananaNodeData;
    if (data.selectedModel) {
      const pricing =
        getModelCost(data.selectedModel.pricing) ??
        getGeminiPricing(data.selectedModel.provider, data.selectedModel.modelId, data.resolution);
      return pricing?.unitCost ?? null;
    }
    return getGeminiPricing("gemini", data.model, data.model === "nano-banana" ? "1K" : data.resolution)?.unitCost ?? null;
  }

  if (node.type === "generateVideo" || node.type === "generateAudio" || node.type === "generate3d") {
    const data = node.data as GenerateVideoNodeData | GenerateAudioNodeData | Generate3DNodeData;
    return getModelCost(data.selectedModel?.pricing)?.unitCost ?? null;
  }

  return null; // llmGenerate and other types: token-based or unknown
}

/**
 * Cost breakdown item supporting multiple providers
 */
export interface CostBreakdownItem {
  provider: ProviderType;
  modelId: string;
  modelName: string;
  count: number;
  unitCost: number | null;  // null means pricing unavailable
  unit: string;  // "image", "video", "second", etc.
  subtotal: number | null;  // null if unitCost is null
}

/**
 * Result of predicted cost calculation
 */
export interface PredictedCostResult {
  totalCost: number;  // Only includes known pricing
  breakdown: CostBreakdownItem[];
  nodeCount: number;
  unknownPricingCount: number;  // Count of items without pricing
}

/**
 * Legacy cost breakdown item for backward compatibility
 * @deprecated Use CostBreakdownItem instead
 */
export interface LegacyCostBreakdownItem {
  model: ModelType;
  resolution: Resolution;
  count: number;
  unitCost: number;
  subtotal: number;
}

/**
 * Calculate predicted cost for all generation nodes in the workflow.
 * Handles nanoBanana (image) and generateVideo (video) nodes.
 *
 * @param nodes - Workflow nodes to analyze
 * @param modelPricing - Optional map of modelId -> pricing for external providers.
 *                       If not provided, only Gemini models get pricing.
 * @returns PredictedCostResult with total cost, breakdown, and counts
 */
export function calculatePredictedCost(
  nodes: WorkflowNode[],
  modelPricing?: Map<string, ModelPricing>
): PredictedCostResult {
  // Group by provider + modelId for breakdown
  const breakdown: Map<string, CostBreakdownItem> = new Map();
  let nodeCount = 0;
  let unknownPricingCount = 0;

  /**
   * Helper to add an item to the breakdown map
   */
  function addToBreakdown(
    provider: ProviderType,
    modelId: string,
    modelName: string,
    unit: string,
    unitCost: number | null,
    count: number = 1
  ) {
    const key = `${provider}:${modelId}`;
    const existing = breakdown.get(key);
    if (existing) {
      existing.count += count;
      if (existing.subtotal !== null && unitCost !== null) {
        existing.subtotal += count * unitCost;
      }
    } else {
      breakdown.set(key, {
        provider,
        modelId,
        modelName,
        count,
        unitCost,
        unit,
        subtotal: unitCost !== null ? count * unitCost : null,
      });
    }
    nodeCount += count;
    if (unitCost === null) {
      unknownPricingCount += count;
    }
  }

  /**
   * Get pricing for a model.
   * Checks the modelPricing map, then pricing carried on the node's selected
   * model, then falls back to hardcoded Gemini pricing.
   */
  function getPricing(
    provider: ProviderType,
    modelId: string,
    resolution?: Resolution,
    selectedModelPricing?: SelectedModelPricing | null
  ): { unitCost: number; unit: string } | null {
    // Check external pricing map first
    if (modelPricing?.has(modelId)) {
      return modelPricing.get(modelId)!;
    }

    // Pricing stored on the node when the model was selected (fal/Kie models)
    const carried = getModelCost(selectedModelPricing);
    if (carried) {
      return carried;
    }

    return getGeminiPricing(provider, modelId, resolution);
  }

  nodes.forEach((node) => {
    // Handle nanoBanana (image generation) nodes
    if (node.type === "nanoBanana") {
      const data = node.data as NanoBananaNodeData;

      // Determine provider and model info
      let provider: ProviderType;
      let modelId: string;
      let modelName: string;

      if (data.selectedModel) {
        // New multi-provider model selection
        provider = data.selectedModel.provider;
        modelId = data.selectedModel.modelId;
        modelName = data.selectedModel.displayName;
      } else {
        // Legacy Gemini-only model
        provider = "gemini";
        modelId = data.model;
        modelName = MODEL_DISPLAY_NAMES[data.model] || data.model;
      }

      const resolution = data.model === "nano-banana" ? "1K" : data.resolution;
      const pricing = getPricing(provider, modelId, resolution, data.selectedModel?.pricing);
      const unitCost = pricing?.unitCost ?? null;
      const unit = pricing?.unit ?? "image";

      addToBreakdown(provider, modelId, modelName, unit, unitCost, clampVariantCount(data.variantCount));
    }

    // Handle generateVideo / generateAudio / generate3d nodes — these require
    // selectedModel (no legacy fallback); pricing rides on the selected model.
    if (node.type === "generateVideo" || node.type === "generateAudio" || node.type === "generate3d") {
      const data = node.data as GenerateVideoNodeData | GenerateAudioNodeData | Generate3DNodeData;
      const fallbackUnit =
        node.type === "generateVideo" ? "video" : node.type === "generateAudio" ? "audio" : "model";

      if (data.selectedModel) {
        const provider = data.selectedModel.provider;
        const modelId = data.selectedModel.modelId;
        const modelName = data.selectedModel.displayName;

        const pricing = getPricing(provider, modelId, undefined, data.selectedModel.pricing);
        const unitCost = pricing?.unitCost ?? null;
        // Per-run pricing reports a generic "image" unit — relabel per media type
        const unit = !pricing || pricing.unit === "image" ? fallbackUnit : pricing.unit;

        const count = node.type === "generateVideo"
          ? clampVariantCount((data as GenerateVideoNodeData).variantCount)
          : 1;
        addToBreakdown(provider, modelId, modelName, unit, unitCost, count);
      }
    }

    // SplitGrid nodes create child nanoBanana nodes - count those from settings
    // Note: child nodes are in the nodes array, but we count from splitGrid settings
    // to show what WILL be generated when the grid runs
    if (node.type === "splitGrid") {
      const data = node.data as SplitGridNodeData;
      if (data.isConfigured && data.targetCount > 0) {
        const model = data.generateSettings.model;
        const resolution = model === "nano-banana" ? "1K" : data.generateSettings.resolution;
        const modelName = MODEL_DISPLAY_NAMES[model] || model;

        const pricing = getPricing("gemini", model, resolution);
        const unitCost = pricing?.unitCost ?? null;
        const unit = pricing?.unit ?? "image";

        addToBreakdown("gemini", model, modelName, unit, unitCost, data.targetCount);
      }
    }
  });

  const breakdownArray = Array.from(breakdown.values());
  const totalCost = breakdownArray.reduce(
    (sum, item) => sum + (item.subtotal ?? 0),
    0
  );

  return {
    totalCost,
    breakdown: breakdownArray,
    nodeCount,
    unknownPricingCount,
  };
}

export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}
