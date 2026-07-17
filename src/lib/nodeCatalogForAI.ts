/**
 * AI-facing node catalog.
 *
 * Single source of truth for what the workflow assistant and quickstart
 * proposer know about node types. Types derive from the same NODE_CATALOG
 * that drives the add palette, so new node types become visible to the AI
 * surfaces by adding one doc entry here.
 */

import { NODE_CATALOG } from "@/components/workspace/nodeCatalog";
import type { NodeType } from "@/types";

/** Every node type the AI surfaces may create. */
export const AI_NODE_TYPES: NodeType[] = NODE_CATALOG.map((item) => item.type);

interface AINodeDoc {
  /** "in → out" handle signature using handle type names. */
  io: string;
  purpose: string;
}

/** Terse per-type documentation: handle signature + when to use it. */
const AI_NODE_DOCS: Record<NodeType, AINodeDoc> = {
  imageInput: { io: "→ image", purpose: "Upload or load a source image (photos, references, backgrounds)" },
  audioInput: { io: "audio → audio", purpose: "Upload an audio file, or relay upstream audio" },
  videoInput: { io: "video → video", purpose: "Upload a video clip, or relay upstream video" },
  glbViewer: { io: "3d → image", purpose: "Display a 3D GLB model and capture its viewport as an image" },
  prompt: { io: "text? → text", purpose: "Text prompt box; can also relay and edit upstream text" },
  array: { io: "text → text (items)", purpose: "Split text into a list; connected generators run once per item (batch)" },
  promptConstructor: { io: "text* → text", purpose: "Prompt template combining upstream texts via @variables" },
  nanoBanana: { io: "image*, text → image", purpose: "AI image generation; needs a connected text or a prompt typed on the node" },
  generateVideo: { io: "image/video/audio/text (per model) → video", purpose: "AI video generation; input handles adapt to the selected model" },
  generate3d: { io: "image?, text? → 3d", purpose: "AI 3D model generation (text-to-3D or image-to-3D)" },
  generateAudio: { io: "text → audio", purpose: "AI audio generation (speech, music, sound effects)" },
  llmGenerate: { io: "text, image? → text", purpose: "LLM text generation for prompt expansion or image analysis" },
  annotation: { io: "image → image", purpose: "Draw or mark up an image on a canvas editor" },
  splitGrid: { io: "image → reference", purpose: "Split one image into grid cells, creating child input+generate nodes" },
  videoStitch: { io: "video*, audio? → video", purpose: "Concatenate video clips in order, optionally with an audio track" },
  videoTrim: { io: "video → video", purpose: "Trim the start/end of a clip" },
  easeCurve: { io: "video → video", purpose: "Apply a speed curve (ease in/out) to a video" },
  videoFrameGrab: { io: "video → image", purpose: "Extract the first or last frame as an image" },
  removeBackground: { io: "image → image", purpose: "Remove the image background on-device (free, no API cost)" },
  imageAction: { io: "image(s) → image", purpose: "Local image ops — rotate, flip, blur, adjust colors, aspect crop/pad, side-by-side, add text — free, no API cost" },
  imageCompare: { io: "image, image → (display)", purpose: "Before/after slider comparing two images" },
  router: { io: "any → same type", purpose: "Pass-through hub for organizing many connections of one type" },
  switch: { io: "one input → toggled outputs", purpose: "Route one input to named outputs toggled on/off manually" },
  conditionalSwitch: { io: "text → matched text outputs", purpose: "Route text by rules (equals/contains/starts/ends) with a default branch" },
  output: { io: "image/video/audio → (display)", purpose: "Display a final result" },
  outputGallery: { io: "image*/video* → (display)", purpose: "Collect many results in a grid; can extract items back to input nodes" },
};

/**
 * Markdown node reference for AI prompts: one line per type with label,
 * handle signature, and purpose.
 */
export function buildNodeReferenceSection(): string {
  const lines = NODE_CATALOG.map((item) => {
    const doc = AI_NODE_DOCS[item.type];
    return `- **${item.type}** (${item.label}, ${item.category}): ${doc.io} — ${doc.purpose}`;
  });
  return lines.join("\n");
}
