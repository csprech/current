import type { NodeType } from "@/types";

export type ConnectionDataType = "image" | "text" | "audio" | "video" | "3d" | "easeCurve" | "reference";

export interface NodeConnectionCapabilities {
  inputs: readonly ConnectionDataType[];
  outputs: readonly ConnectionDataType[];
}

export const NODE_CONNECTION_CAPABILITIES: Record<NodeType, NodeConnectionCapabilities> = {
  imageInput: { inputs: ["reference"], outputs: ["image"] },
  audioInput: { inputs: ["audio"], outputs: ["audio"] },
  videoInput: { inputs: ["video"], outputs: ["video"] },
  annotation: { inputs: ["image"], outputs: ["image"] },
  prompt: { inputs: ["text"], outputs: ["text"] },
  array: { inputs: ["text"], outputs: ["text"] },
  promptConstructor: { inputs: ["text"], outputs: ["text"] },
  nanoBanana: { inputs: ["image", "text"], outputs: ["image"] },
  generateVideo: { inputs: ["image", "video", "text", "audio"], outputs: ["video"] },
  generate3d: { inputs: ["image", "text"], outputs: ["3d"] },
  generateAudio: { inputs: ["text"], outputs: ["audio"] },
  llmGenerate: { inputs: ["text", "image"], outputs: ["text"] },
  splitGrid: { inputs: ["image"], outputs: ["reference"] },
  output: { inputs: ["image", "video", "audio"], outputs: [] },
  outputGallery: { inputs: ["image", "video"], outputs: [] },
  imageCompare: { inputs: ["image"], outputs: [] },
  videoStitch: { inputs: ["video", "audio"], outputs: ["video"] },
  easeCurve: { inputs: ["video", "easeCurve"], outputs: ["video", "easeCurve"] },
  videoTrim: { inputs: ["video"], outputs: ["video"] },
  videoFrameGrab: { inputs: ["video"], outputs: ["image"] },
  removeBackground: { inputs: ["image"], outputs: ["image"] },
  imageAction: { inputs: ["image"], outputs: ["image"] },
  router: { inputs: ["image", "text", "video", "audio", "3d", "easeCurve", "reference"], outputs: ["image", "text", "video", "audio", "3d", "easeCurve", "reference"] },
  switch: { inputs: ["image", "text", "video", "audio", "3d", "easeCurve"], outputs: ["image", "text", "video", "audio", "3d", "easeCurve"] },
  conditionalSwitch: { inputs: ["text"], outputs: ["text"] },
  glbViewer: { inputs: ["3d"], outputs: ["image"] },
};

export function getNodeConnectionCapabilities(type: NodeType): NodeConnectionCapabilities {
  return NODE_CONNECTION_CAPABILITIES[type];
}
