import type { NodeType, ProposedNode } from "@/types";

type SettingValidator = (value: unknown) => boolean;

const isBoolean: SettingValidator = (value) => typeof value === "boolean";
const isShortString: SettingValidator = (value) => typeof value === "string" && value.length <= 500;
const isNonNegativeNumber: SettingValidator = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
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
  prompt: { variableName: isShortString, isOptional: isBoolean },
  array: {
    splitMode: oneOf(["delimiter", "newline", "regex"]),
    delimiter: isShortString,
    regexPattern: isShortString,
    trimItems: isBoolean,
    removeEmpty: isBoolean,
    batchMode: isBoolean,
  },
  nanoBanana: {
    aspectRatio: oneOf(["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"]),
    resolution: oneOf(["512", "1K", "2K", "4K"]),
    useGoogleSearch: isBoolean,
    useImageSearch: isBoolean,
    parameters: isSafeRecord,
  },
  generateVideo: { parameters: isSafeRecord },
  generate3d: { parameters: isSafeRecord },
  generateAudio: { parameters: isSafeRecord },
  llmGenerate: {
    provider: oneOf(["google", "openai", "anthropic"]),
    temperature: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 2,
    maxTokens: (value) => Number.isInteger(value) && (value as number) > 0 && (value as number) <= 1_000_000,
  },
  splitGrid: { targetCount: oneOf([4, 6, 8, 9, 10]) },
  output: { outputFilename: isShortString },
  videoStitch: { loopCount: oneOf([1, 2, 3]) },
  easeCurve: { outputDuration: isNonNegativeNumber },
  videoTrim: { startTime: isNonNegativeNumber, endTime: isNonNegativeNumber },
  videoFrameGrab: { framePosition: oneOf(["first", "middle", "last"]) },
};

export function sanitizeProposalSettings(type: NodeType, settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const rules = SETTING_RULES[type];
  if (!rules) return {};
  return Object.fromEntries(
    Object.entries(settings as Record<string, unknown>)
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
  if (node.type === "nanoBanana" && ["nano-banana", "nano-banana-pro", "nano-banana-2"].includes(node.suggestedModel)) return { model: node.suggestedModel };
  if (node.type === "llmGenerate" && [
    "gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-3.1-pro-preview",
    "gpt-4.1-mini", "gpt-4.1-nano", "claude-opus-4.6", "claude-sonnet-4.5", "claude-haiku-4.5",
  ].includes(node.suggestedModel)) return { model: node.suggestedModel };
  if (node.type === "removeBackground" && ["isnet_quint8", "isnet_fp16", "isnet"].includes(node.suggestedModel)) return { model: node.suggestedModel };
  return {};
}

export function getAppliedProposalNodeData(node: ProposedNode): Record<string, unknown> {
  return {
    ...sanitizeProposalSettings(node.type, node.suggestedSettings),
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
  for (const [key, value] of Object.entries(sanitizeProposalSettings(node.type, node.suggestedSettings))) {
    rows.push(`${humanizeSetting(key)}: ${displayValue(value)}`);
  }
  return rows;
}
