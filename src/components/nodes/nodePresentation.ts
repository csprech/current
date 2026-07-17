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

export interface NodeStatusModifiers {
  running?: boolean;
  error?: string | null;
  skipped?: boolean;
  locked?: boolean;
  disabled?: boolean;
  complete?: boolean;
  detail?: string;
}

export type PresentedHandleType = HandleType | "generic";

// Category accents from the design system: each connection type carries one
// solid accent (like swatch dots) — no gradients in chrome.
const HANDLE_PRESENTATIONS: Record<PresentedHandleType, HandlePresentation> = {
  text: { label: "Text", color: "var(--current-blue)" },
  image: { label: "Image", color: "var(--current-aqua)" },
  video: { label: "Video", color: "var(--current-blue-indigo)" },
  audio: { label: "Audio", color: "var(--current-pink)" },
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
  imageAction: "processor",
  videoAction: "processor",
  router: "router",
  switch: "router",
  conditionalSwitch: "router",
  output: "output",
  outputGallery: "output",
};

/* Minimap dots follow the category-accent families (mid-tone hexes chosen to
   read on both the light and dark navigator surfaces): teal = image,
   info blue = text, purple = video, pink = audio, cyan = 3D, stone = routing. */
const MINIMAP_COLORS: Record<NodeType, string> = {
  imageInput: "#0E93A6",
  audioInput: "#E8479E",
  videoInput: "#8B6FF0",
  prompt: "#3D6BFF",
  array: "#3D6BFF",
  promptConstructor: "#3D6BFF",
  glbViewer: "#2AA5B8",
  nanoBanana: "#0E93A6",
  generateVideo: "#8B6FF0",
  generateAudio: "#E8479E",
  llmGenerate: "#3D6BFF",
  generate3d: "#2AA5B8",
  annotation: "#0E93A6",
  splitGrid: "#0E93A6",
  imageCompare: "#0E93A6",
  videoStitch: "#8B6FF0",
  easeCurve: "#8B6FF0",
  videoTrim: "#8B6FF0",
  videoFrameGrab: "#0E93A6",
  removeBackground: "#0E93A6",
  imageAction: "#0E93A6",
  videoAction: "#8B6FF0",
  router: "#8A8D96",
  switch: "#8A8D96",
  conditionalSwitch: "#8A8D96",
  output: "#0E93A6",
  outputGallery: "#0E93A6",
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
  if (input.disabled) return { state: "disabled", label: "Disabled" };
  if (input.locked) return { state: "locked", label: "Locked" };
  if (input.skipped) return { state: "skipped", label: "Skipped", detail: "Missing optional input" };
  if (input.running) return { state: "running", label: "Running" };
  if (input.complete) return { state: "complete", label: "Complete" };
  return { state: "idle", label: "Ready" };
}

const PROCESSOR_METADATA: Partial<Record<NodeType, [operation: string, format: string]>> = {
  annotation: ["Annotate image", "PNG"],
  splitGrid: ["Split grid", "Reference output"],
  imageCompare: ["Compare images", "Image"],
  videoStitch: ["Stitch video", "MP4"],
  easeCurve: ["Ease curve", "MP4"],
  videoTrim: ["Trim video", "MP4"],
  videoFrameGrab: ["Extract frame", "PNG"],
  removeBackground: ["Remove background", "PNG"],
  imageAction: ["Image action", "Local"],
  videoAction: ["Video action", "Local"],
};

function hasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function hasMeaningfulSerializedArray(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

function hasCompletionEvidence(nodeType: NodeType | undefined, record: Record<string, unknown>): boolean {
  switch (nodeType) {
    case "imageInput": return hasValue(record.image) || hasValue(record.imageRef);
    case "audioInput": return hasValue(record.audioFile) || hasValue(record.audioFileRef);
    case "videoInput": return hasValue(record.video) || hasValue(record.videoRef);
    case "prompt": return hasValue(record.prompt);
    case "array": return hasValue(record.outputItems) || hasMeaningfulSerializedArray(record.outputText);
    case "promptConstructor": return hasValue(record.outputText);
    case "glbViewer": return hasValue(record.glbUrl) || hasValue(record.capturedImage);
    case "nanoBanana":
    case "annotation":
    case "videoFrameGrab":
    case "removeBackground": return hasValue(record.outputImage) || hasValue(record.outputImageRef);
    case "imageAction": return hasValue(record.outputImage) || hasValue(record.outputImageRef);
    case "generateVideo":
    case "videoStitch":
    case "easeCurve":
    case "videoTrim":
    case "videoAction": return hasValue(record.outputVideo) || hasValue(record.outputVideoRef);
    case "generateAudio": return hasValue(record.outputAudio) || hasValue(record.outputAudioRef);
    case "llmGenerate": return hasValue(record.outputText);
    case "generate3d": return hasValue(record.output3dUrl);
    case "splitGrid": return hasValue(record.childNodeIds);
    case "imageCompare": return hasValue(record.imageA) && hasValue(record.imageB);
    case "output": return hasValue(record.image) || hasValue(record.imageRef) || hasValue(record.video) || hasValue(record.audio);
    case "outputGallery": return hasValue(record.images) || hasValue(record.imageRefs) || hasValue(record.videos) || hasValue(record.videoRefs);
    default: return false;
  }
}

function formatName(value: unknown, filename?: unknown): string | undefined {
  if (typeof value === "string" && value) {
    const subtype = value.includes("/") ? value.split("/").pop() : value;
    return subtype?.replace("mpeg", "mp3").toUpperCase();
  }
  if (typeof filename === "string" && filename.includes(".")) return filename.split(".").pop()?.toUpperCase();
  return undefined;
}

function deriveNodeDetail(nodeType: NodeType | undefined, record: Record<string, unknown>, state: CurrentNodeState): string | undefined {
  const parts: string[] = [];
  const dimensions = record.dimensions && typeof record.dimensions === "object"
    ? record.dimensions as Record<string, unknown>
    : null;

  if (nodeType === "imageInput" || nodeType === "audioInput" || nodeType === "videoInput") {
    if (dimensions && typeof dimensions.width === "number" && typeof dimensions.height === "number") {
      parts.push(`${dimensions.width} × ${dimensions.height}`);
    }
    if (typeof record.duration === "number") parts.push(`${record.duration.toFixed(1)} s`);
    const format = formatName(record.format, record.filename);
    if (format) parts.push(format);
    if (record.isOptional) parts.push("Optional");
  } else if (nodeType === "prompt") {
    if (record.isOptional) parts.push("Optional");
    if (typeof record.prompt === "string" && record.prompt) parts.push(`${record.prompt.length} characters`);
  } else if (getNodeRole(nodeType as NodeType) === "generator") {
    const selected = record.selectedModel && typeof record.selectedModel === "object"
      ? record.selectedModel as Record<string, unknown>
      : null;
    const provider = selected?.provider ?? record.provider;
    const model = selected?.displayName ?? selected?.modelId ?? record.model;
    if (typeof provider === "string" && typeof model === "string") parts.push(`${provider} · ${model}`);
    else if (typeof model === "string") parts.push(model);
    const parameters = record.parameters && typeof record.parameters === "object"
      ? record.parameters as Record<string, unknown>
      : {};
    const resolution = record.resolution ?? parameters.resolution;
    const duration = record.duration ?? parameters.duration;
    if (typeof resolution === "string") parts.push(resolution);
    if (typeof duration === "number") parts.push(`${duration.toFixed(1)} s`);
    if (state === "running" && typeof record.progress === "number") parts.push(`${Math.round(record.progress)}%`);
  } else if (nodeType && PROCESSOR_METADATA[nodeType]) {
    parts.push(...PROCESSOR_METADATA[nodeType]!);
    if (typeof record.duration === "number") parts.push(`${record.duration.toFixed(1)} s`);
    if (state === "running" && typeof record.progress === "number") parts.push(`${Math.round(record.progress)}%`);
  } else if (nodeType === "switch") {
    const switches = Array.isArray(record.switches) ? record.switches as Array<Record<string, unknown>> : [];
    const active = switches.filter((item) => item.enabled).map((item) => item.name).filter((name): name is string => typeof name === "string");
    parts.push(active.length ? `${active.join(", ")} active` : "No active branch");
    parts.push(`${switches.length} branch${switches.length === 1 ? "" : "es"}`);
  } else if (nodeType === "conditionalSwitch") {
    const rules = Array.isArray(record.rules) ? record.rules as Array<Record<string, unknown>> : [];
    if (record.evaluationPaused) {
      parts.push("Evaluation paused", "No active route");
      parts.push(`${rules.length} rule${rules.length === 1 ? "" : "s"}`);
      return parts.join(" · ");
    }
    const active = rules.find((rule) => rule.isMatched);
    parts.push(active && typeof active.label === "string" ? `${active.label} active` : "Default active");
    parts.push(`${rules.length} rule${rules.length === 1 ? "" : "s"}`);
  } else if (nodeType === "router") {
    if (typeof record.activeBranch === "string") parts.push(`${record.activeBranch} active`);
  } else if (nodeType === "output" || nodeType === "outputGallery") {
    if (record.audio || record.contentType === "audio") parts.push("Audio available");
    else if (record.video || (Array.isArray(record.videos) && record.videos.length) || record.contentType === "video") parts.push("Video available");
    else if (record.image || (Array.isArray(record.images) && record.images.length) || record.contentType === "image") parts.push("Image available");
    else parts.push("No result");
  }

  return parts.length ? parts.join(" · ") : undefined;
}

/** Normalize the heterogeneous legacy node payloads without changing store types. */
export function deriveNodeStatusFromData(
  nodeType: NodeType | undefined,
  data: unknown,
  modifiers: NodeStatusModifiers = {}
): { state: CurrentNodeState; label: string; detail?: string } {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const status = typeof record.status === "string" ? record.status.toLowerCase() : "";
  const dataError = typeof record.error === "string" && record.error.trim() ? record.error : null;
  const running = modifiers.running ?? Boolean(
    record.isLoading || record.isProcessing || status === "loading" || status === "running" || status === "processing"
  );
  const complete = modifiers.complete ?? Boolean(
    hasCompletionEvidence(nodeType, record)
  );
  const result = deriveNodeStatus({
    error: modifiers.error ?? (status === "error" ? dataError || "Operation failed" : null),
    running,
    locked: modifiers.locked ?? Boolean(record.locked || record.isLocked || record.isInLockedGroup),
    disabled: modifiers.disabled ?? Boolean(record.disabled || record.isDisabled),
    skipped: modifiers.skipped ?? Boolean(record.skipped || record.isSkipped || status === "skipped"),
    complete,
  });
  const recoveryDetail = result.state === "error" && nodeType && getNodeRole(nodeType) === "generator"
    ? `${result.detail ?? "Operation failed"} · Run again to retry`
    : result.detail;
  const detail = modifiers.detail ?? recoveryDetail ?? deriveNodeDetail(nodeType, record, result.state);
  return detail ? { ...result, detail } : result;
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
