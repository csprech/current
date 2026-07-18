/**
 * Typed template interface for a workflow: which nodes act as form inputs and
 * where the results come out. This is the contract behind the App
 * (run-as-form) view, the shareable-export metadata, and the headless
 * validate response — the same names work as `inputs` keys on POST /api/run
 * and the CLI's --input flags (matched by custom title or node id).
 *
 * Pure and store-free so the browser, the headless engine, and API routes all
 * share one definition.
 */

import type { WorkflowNode } from "@/types";

export type TemplateInputType = "text" | "image" | "video" | "audio";

export interface TemplateInputDef {
  /** Stable reference for /api/run `inputs` and CLI --input (custom title, else node id). */
  key: string;
  /** Human label shown on the form. */
  name: string;
  type: TemplateInputType;
  nodeId: string;
  nodeType: string;
  /** Present when the node currently has a value (form pre-fill / optional-ness). */
  hasValue: boolean;
}

export interface TemplateOutputDef {
  key: string;
  name: string;
  nodeId: string;
  nodeType: string;
}

export interface TemplateInterface {
  inputs: TemplateInputDef[];
  outputs: TemplateOutputDef[];
}

const INPUT_TYPE_BY_NODE: Record<string, TemplateInputType> = {
  prompt: "text",
  imageInput: "image",
  videoInput: "video",
  audioInput: "audio",
};

const DEFAULT_INPUT_NAMES: Record<string, string> = {
  prompt: "Prompt",
  imageInput: "Image",
  videoInput: "Video",
  audioInput: "Audio",
};

function nodeValue(node: WorkflowNode): unknown {
  const data = node.data as Record<string, unknown>;
  switch (node.type) {
    case "prompt": return data.prompt;
    case "imageInput": return data.image;
    case "videoInput": return data.video;
    case "audioInput": return data.audioFile;
    default: return undefined;
  }
}

/** Reading order for form fields: top-to-bottom, then left-to-right. */
function byCanvasPosition(a: WorkflowNode, b: WorkflowNode): number {
  return a.position.y - b.position.y || a.position.x - b.position.x;
}

/**
 * Describe a workflow's template interface. Input-family nodes participate
 * unless marked `isTemplateInput: false`; output nodes are always reported.
 */
export function describeTemplateInterface(nodes: WorkflowNode[]): TemplateInterface {
  const inputs: TemplateInputDef[] = nodes
    .filter((node) => node.type && node.type in INPUT_TYPE_BY_NODE)
    .filter((node) => (node.data as { isTemplateInput?: boolean }).isTemplateInput !== false)
    .sort(byCanvasPosition)
    .map((node) => {
      const data = node.data as { customTitle?: string };
      const value = nodeValue(node);
      return {
        key: data.customTitle || node.id,
        name: data.customTitle || DEFAULT_INPUT_NAMES[node.type as string],
        type: INPUT_TYPE_BY_NODE[node.type as string],
        nodeId: node.id,
        nodeType: node.type as string,
        hasValue: typeof value === "string" && value.length > 0,
      };
    });

  const outputs: TemplateOutputDef[] = nodes
    .filter((node) => node.type === "output" || node.type === "outputGallery")
    .sort(byCanvasPosition)
    .map((node) => {
      const data = node.data as { customTitle?: string };
      return {
        key: data.customTitle || node.id,
        name: data.customTitle || (node.type === "outputGallery" ? "Gallery" : "Output"),
        nodeId: node.id,
        nodeType: node.type as string,
      };
    });

  return { inputs, outputs };
}
