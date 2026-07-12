import type { NodeType } from "@/types";

export const INSPECTOR_CONFIGURABLE_NODE_TYPES: readonly NodeType[] = [
  "nanoBanana",
  "generateVideo",
  "generate3d",
  "generateAudio",
  "llmGenerate",
  "easeCurve",
  "conditionalSwitch",
];

export const INSPECTOR_GENERATION_NODE_TYPES: readonly NodeType[] = [
  "nanoBanana",
  "generateVideo",
  "generate3d",
  "generateAudio",
  "llmGenerate",
];

export function isInspectorConfigurableNodeType(type: unknown): type is NodeType {
  return INSPECTOR_CONFIGURABLE_NODE_TYPES.includes(type as NodeType);
}
