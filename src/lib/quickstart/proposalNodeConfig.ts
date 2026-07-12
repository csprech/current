import type { NodeType, ProposedNode } from "@/types";
import {
  getNanoBananaAspectRatios,
  getNanoBananaResolutions,
  isNanoBananaModel,
  supportsGoogleSearch,
  supportsImageSearch,
} from "@/lib/nanoBananaOptions";
import { getProposalSplitGridLayout } from "@/lib/splitGridLayouts";

type SettingValidator = (value: unknown) => boolean;

const isBoolean: SettingValidator = (value) => typeof value === "boolean";
const isShortString: SettingValidator = (value) => typeof value === "string" && value.length <= 500;
const isVariableName: SettingValidator = (value) => typeof value === "string" && /^[a-zA-Z0-9_]{1,30}$/.test(value);
const isTenthStep = (value: number): boolean => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
const isNonNegativeNumber: SettingValidator = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && isTenthStep(value);
const isEaseDuration: SettingValidator = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0.1 && value <= 30 && isTenthStep(value);
const oneOf = (values: readonly unknown[]): SettingValidator => (value) => values.includes(value);

function isSafeJson(value: unknown, depth = 0): boolean {
  if (depth > 5) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 100 && value.every((entry) => isSafeJson(entry, depth + 1));
  if (typeof value !== "object") return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 100 && entries.every(([key, entry]) =>
    !["__proto__", "prototype", "constructor"].includes(key) && isSafeJson(entry, depth + 1));
}

const isSafeRecord: SettingValidator = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) && isSafeJson(value);

const SETTING_RULES: Partial<Record<NodeType, Record<string, SettingValidator>>> = {
  imageInput: { isOptional: isBoolean },
  audioInput: { isOptional: isBoolean },
  videoInput: { isOptional: isBoolean },
  prompt: { variableName: isVariableName, isOptional: isBoolean },
  array: {
    splitMode: oneOf(["delimiter", "newline", "regex"]),
    delimiter: isShortString,
    regexPattern: isShortString,
    trimItems: isBoolean,
    removeEmpty: isBoolean,
    batchMode: isBoolean,
  },
  generateVideo: { parameters: isSafeRecord },
  generate3d: { parameters: isSafeRecord },
  generateAudio: { parameters: isSafeRecord },
  output: { outputFilename: isShortString },
  videoStitch: { loopCount: oneOf([1, 2, 3]) },
  easeCurve: { outputDuration: isEaseDuration },
  videoFrameGrab: { framePosition: oneOf(["first", "last"]) },
};

const LLM_MODEL_PROVIDERS = {
  "gemini-2.5-flash": "google",
  "gemini-3-flash-preview": "google",
  "gemini-3-pro-preview": "google",
  "gemini-3.1-pro-preview": "google",
  "gpt-4.1-mini": "openai",
  "gpt-4.1-nano": "openai",
  "claude-opus-4.6": "anthropic",
  "claude-sonnet-4.5": "anthropic",
  "claude-haiku-4.5": "anthropic",
} as const;

function getLlmProvider(model: unknown): "google" | "openai" | "anthropic" | null {
  if (typeof model !== "string" || !(model in LLM_MODEL_PROVIDERS)) return null;
  return LLM_MODEL_PROVIDERS[model as keyof typeof LLM_MODEL_PROVIDERS];
}

function sanitizeNanoBananaSettings(node: ProposedNode, settings: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const model = isNanoBananaModel(node.suggestedModel) ? node.suggestedModel : null;
  const ratioModel = model ?? "nano-banana";
  if (typeof settings.aspectRatio === "string" && (getNanoBananaAspectRatios(ratioModel) as readonly string[]).includes(settings.aspectRatio)) result.aspectRatio = settings.aspectRatio;
  if (model && typeof settings.resolution === "string" && (getNanoBananaResolutions(model) as readonly string[]).includes(settings.resolution)) result.resolution = settings.resolution;
  if (model && supportsGoogleSearch(model) && isBoolean(settings.useGoogleSearch)) result.useGoogleSearch = settings.useGoogleSearch;
  if (model && supportsImageSearch(model) && isBoolean(settings.useImageSearch)) result.useImageSearch = settings.useImageSearch;
  if (isSafeRecord(settings.parameters)) result.parameters = settings.parameters;
  return result;
}

function sanitizeLlmSettings(node: ProposedNode, settings: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const provider = getLlmProvider(node.suggestedModel);
  if (provider) result.provider = provider;
  const maxTemperature = provider === "anthropic" ? 1 : 2;
  const temperatureSteps = typeof settings.temperature === "number" ? settings.temperature * 100 : NaN;
  if (typeof settings.temperature === "number" && Number.isFinite(settings.temperature) && settings.temperature >= 0 && settings.temperature <= maxTemperature && Math.abs(temperatureSteps - Math.round(temperatureSteps)) < 1e-9) {
    result.temperature = settings.temperature;
  }
  if (Number.isInteger(settings.maxTokens) && (settings.maxTokens as number) >= 256 && (settings.maxTokens as number) <= 16384 && (settings.maxTokens as number) % 256 === 0) {
    result.maxTokens = settings.maxTokens;
  }
  return result;
}

function sanitizeVideoTrimSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (isNonNegativeNumber(settings.startTime)) result.startTime = settings.startTime;
  if (isNonNegativeNumber(settings.endTime)) result.endTime = settings.endTime;
  if (typeof result.startTime === "number" && typeof result.endTime === "number" && result.endTime > 0 && result.endTime <= result.startTime) {
    delete result.endTime;
  }
  return result;
}

export function sanitizeProposalSettings(node: ProposedNode): Record<string, unknown> {
  const { type, suggestedSettings: settings } = node;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const record = settings as Record<string, unknown>;
  if (type === "nanoBanana") return sanitizeNanoBananaSettings(node, record);
  if (type === "llmGenerate") return sanitizeLlmSettings(node, record);
  if (type === "splitGrid") return getProposalSplitGridLayout(record.targetCount) ?? {};
  if (type === "videoTrim") return sanitizeVideoTrimSettings(record);
  const rules = SETTING_RULES[type];
  if (!rules) return {};
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key, value]) => rules[key]?.(value)),
  );
}

function promptData(node: ProposedNode): Record<string, unknown> {
  if (typeof node.suggestedPrompt !== "string") return {};
  if (node.type === "prompt") return { prompt: node.suggestedPrompt };
  if (node.type === "promptConstructor") return { template: node.suggestedPrompt };
  if (node.type === "splitGrid") return { defaultPrompt: node.suggestedPrompt };
  return {};
}

function modelData(node: ProposedNode): Record<string, unknown> {
  if (typeof node.suggestedModel !== "string") return {};
  if (node.type === "nanoBanana" && isNanoBananaModel(node.suggestedModel)) return { model: node.suggestedModel };
  if (node.type === "llmGenerate" && getLlmProvider(node.suggestedModel)) return { model: node.suggestedModel };
  if (node.type === "removeBackground" && ["isnet_quint8", "isnet_fp16", "isnet"].includes(node.suggestedModel)) return { model: node.suggestedModel };
  return {};
}

export function getAppliedProposalNodeData(node: ProposedNode): Record<string, unknown> {
  return {
    ...sanitizeProposalSettings(node),
    ...promptData(node),
    ...modelData(node),
    customTitle: node.suggestedTitle,
    comment: node.purpose,
  };
}

function humanizeSetting(key: string): string {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words
    .replace(/^./, (character) => character.toUpperCase());
}

function displayValue(value: unknown): string {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getProposalNodeConfigRows(node: ProposedNode): string[] {
  const rows: string[] = [];
  const prompt = promptData(node);
  if (typeof prompt.prompt === "string") rows.push(`Prompt: ${prompt.prompt}`);
  if (typeof prompt.template === "string") rows.push(`Template: ${prompt.template}`);
  if (typeof prompt.defaultPrompt === "string") rows.push(`Prompt: ${prompt.defaultPrompt}`);
  const model = modelData(node).model;
  if (typeof model === "string") rows.push(`Model: ${model}`);
  const settings = sanitizeProposalSettings(node);
  if (node.type === "splitGrid" && typeof settings.targetCount === "number") {
    rows.push(`Layout: ${settings.gridRows} × ${settings.gridCols} (${settings.targetCount} images)`);
    return rows;
  }
  for (const [key, value] of Object.entries(settings)) {
    rows.push(`${humanizeSetting(key)}: ${displayValue(value)}`);
  }
  return rows;
}
