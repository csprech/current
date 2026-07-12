import type { HandleType, NodeType } from "@/types";

export type NodeRole = "input" | "generator" | "processor" | "router" | "output";
export type CurrentNodeState =
  | "idle"
  | "selected"
  | "running"
  | "complete"
  | "skipped"
  | "locked"
  | "disabled"
  | "error";

export interface HandlePresentation {
  label: string;
  color: string;
  endColor?: string;
  gradient?: boolean;
}

export interface NodeStatusInput {
  running?: boolean;
  error?: string | null;
  skipped?: boolean;
  locked?: boolean;
  disabled?: boolean;
  complete?: boolean;
}

export type PresentedHandleType = HandleType | "generic";

const HANDLE_PRESENTATIONS: Record<PresentedHandleType, HandlePresentation> = {
  text: { label: "Text", color: "var(--current-blue)" },
  image: { label: "Image", color: "var(--current-aqua)" },
  video: {
    label: "Video",
    color: "var(--current-blue)",
    endColor: "var(--current-aqua)",
    gradient: true,
  },
  audio: { label: "Audio", color: "var(--current-blue-indigo)" },
  "3d": { label: "3D", color: "var(--current-aqua-cyan)" },
  easeCurve: { label: "Ease curve", color: "var(--current-steel-blue)" },
  generic: { label: "Connection", color: "var(--current-steel-blue)" },
};

const NODE_ROLES: Record<NodeType, NodeRole> = {
  imageInput: "input",
  audioInput: "input",
  videoInput: "input",
  prompt: "input",
  array: "input",
  promptConstructor: "input",
  glbViewer: "input",
  nanoBanana: "generator",
  generateVideo: "generator",
  generateAudio: "generator",
  llmGenerate: "generator",
  generate3d: "generator",
  annotation: "processor",
  splitGrid: "processor",
  imageCompare: "processor",
  videoStitch: "processor",
  easeCurve: "processor",
  videoTrim: "processor",
  videoFrameGrab: "processor",
  removeBackground: "processor",
  router: "router",
  switch: "router",
  conditionalSwitch: "router",
  output: "output",
  outputGallery: "output",
};

const MINIMAP_COLORS: Record<NodeType, string> = {
  imageInput: "#47CBB3",
  audioInput: "#6A70E8",
  videoInput: "#5578F6",
  prompt: "#5578F6",
  array: "#528ADF",
  promptConstructor: "#5578F6",
  glbViewer: "#3DB9C4",
  nanoBanana: "#47CBB3",
  generateVideo: "#5578F6",
  generateAudio: "#6A70E8",
  llmGenerate: "#5578F6",
  generate3d: "#3DB9C4",
  annotation: "#528ADF",
  splitGrid: "#47CBB3",
  imageCompare: "#47CBB3",
  videoStitch: "#5578F6",
  easeCurve: "#528ADF",
  videoTrim: "#528ADF",
  videoFrameGrab: "#47CBB3",
  removeBackground: "#47CBB3",
  router: "#528ADF",
  switch: "#5578F6",
  conditionalSwitch: "#3DB9C4",
  output: "#47CBB3",
  outputGallery: "#3DB9C4",
};

export const CURRENT_MINIMAP_FALLBACK = "#8A8D96";

export function getHandlePresentation(type: PresentedHandleType): HandlePresentation {
  return HANDLE_PRESENTATIONS[type];
}

export function getNodeRole(type: NodeType): NodeRole {
  return NODE_ROLES[type];
}

export function getMinimapColor(type: NodeType): string;
export function getMinimapColor(type: unknown): string;
export function getMinimapColor(type: unknown): string {
  if (typeof type !== "string" || !(type in MINIMAP_COLORS)) return CURRENT_MINIMAP_FALLBACK;
  return MINIMAP_COLORS[type as NodeType];
}

export function deriveNodeStatus(
  input: NodeStatusInput
): { state: CurrentNodeState; label: string; detail?: string } {
  if (input.error) return { state: "error", label: "Error", detail: input.error };
  if (input.running) return { state: "running", label: "Running" };
  if (input.locked) return { state: "locked", label: "Locked" };
  if (input.disabled) return { state: "disabled", label: "Disabled" };
  if (input.skipped) return { state: "skipped", label: "Skipped", detail: "Missing optional input" };
  if (input.complete) return { state: "complete", label: "Complete" };
  return { state: "idle", label: "Ready" };
}

export function normalizeHandleType(handleId?: string | null): PresentedHandleType {
  const normalized = (handleId || "").replace(/-\d+$/, "");
  if (normalized === "prompt") return "text";
  if (
    normalized === "image" ||
    normalized === "text" ||
    normalized === "audio" ||
    normalized === "video" ||
    normalized === "3d" ||
    normalized === "easeCurve"
  ) {
    return normalized;
  }
  return "generic";
}
