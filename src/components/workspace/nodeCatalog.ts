import type { NodeType } from "@/types";

export type NodeCatalogCategory = "Input" | "Generate" | "Process" | "Route" | "Output";

export interface NodeCatalogItem {
  type: NodeType;
  label: string;
  category: NodeCatalogCategory;
  keywords: readonly string[];
}

export const NODE_CATALOG = [
  { type: "imageInput", label: "Image input", category: "Input", keywords: ["photo", "reference"] },
  { type: "audioInput", label: "Audio input", category: "Input", keywords: ["sound", "music"] },
  { type: "videoInput", label: "Video input", category: "Input", keywords: ["movie", "clip"] },
  { type: "glbViewer", label: "3D viewer", category: "Input", keywords: ["glb", "model"] },
  { type: "prompt", label: "Prompt", category: "Input", keywords: ["text"] },
  { type: "array", label: "Array", category: "Input", keywords: ["list", "batch"] },
  { type: "promptConstructor", label: "Prompt constructor", category: "Input", keywords: ["template", "variables"] },
  { type: "nanoBanana", label: "Generate image", category: "Generate", keywords: ["gemini", "picture"] },
  { type: "generateVideo", label: "Generate video", category: "Generate", keywords: ["movie", "motion"] },
  { type: "generate3d", label: "Generate 3D", category: "Generate", keywords: ["glb", "mesh"] },
  { type: "generateAudio", label: "Generate audio", category: "Generate", keywords: ["speech", "music"] },
  { type: "llmGenerate", label: "Generate text", category: "Generate", keywords: ["llm", "language"] },
  { type: "annotation", label: "Annotate", category: "Process", keywords: ["draw", "mask"] },
  { type: "splitGrid", label: "Split grid", category: "Process", keywords: ["tiles", "cells"] },
  { type: "videoStitch", label: "Stitch video", category: "Process", keywords: ["join", "combine"] },
  { type: "videoTrim", label: "Trim video", category: "Process", keywords: ["cut", "clip"] },
  { type: "easeCurve", label: "Ease curve", category: "Process", keywords: ["speed", "timing"] },
  { type: "videoFrameGrab", label: "Grab frame", category: "Process", keywords: ["still", "extract"] },
  { type: "removeBackground", label: "Remove background", category: "Process", keywords: ["cutout", "alpha"] },
  { type: "imageCompare", label: "Compare images", category: "Process", keywords: ["before", "after"] },
  { type: "router", label: "Router", category: "Route", keywords: ["branch", "pass"] },
  { type: "switch", label: "Switch", category: "Route", keywords: ["toggle", "branch"] },
  { type: "conditionalSwitch", label: "Conditional switch", category: "Route", keywords: ["rule", "condition"] },
  { type: "output", label: "Output", category: "Output", keywords: ["result", "final"] },
  { type: "outputGallery", label: "Output gallery", category: "Output", keywords: ["results", "collection"] },
] satisfies NodeCatalogItem[];

export const NODE_CATALOG_BY_TYPE = new Map(NODE_CATALOG.map((item) => [item.type, item]));

export const CURRENT_ADD_PALETTE_RECENTS_KEY = "current:add-palette-recents";
const RECENTS_LIMIT = 5;

export function readRecentNodes(): NodeType[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const value = JSON.parse(sessionStorage.getItem(CURRENT_ADD_PALETTE_RECENTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((type): type is NodeType => NODE_CATALOG_BY_TYPE.has(type)) : [];
  } catch {
    return [];
  }
}

export function recordRecentNode(type: NodeType) {
  if (typeof sessionStorage === "undefined" || !NODE_CATALOG_BY_TYPE.has(type)) return;
  try {
    const next = [type, ...readRecentNodes().filter((recent) => recent !== type)].slice(0, RECENTS_LIMIT);
    sessionStorage.setItem(CURRENT_ADD_PALETTE_RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Recents are optional; storage privacy or quota failures must not block node creation.
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
}

export function matchesNodeCatalogItem(item: NodeCatalogItem, query: string) {
  const normalized = normalize(query);
  if (!normalized) return true;
  return [item.label, item.type, item.category, ...item.keywords]
    .some((value) => normalize(value).includes(normalized));
}
