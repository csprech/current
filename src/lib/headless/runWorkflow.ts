/**
 * Headless workflow runner.
 *
 * Executes a workflow JSON server-side — no canvas, no browser — by walking
 * the graph with the same pure utilities the editor uses and calling this
 * app's own /api/generate and /api/llm endpoints for generation nodes.
 * Powers POST /api/run and the CLI (scripts/run-workflow.mjs).
 *
 * v1 scope: input nodes, prompt, nanoBanana, llmGenerate, generateVideo,
 * generateAudio, output, outputGallery. Canvas-coupled nodes (annotation,
 * imageAction, videoAction, removeBackground, video processing, routing,
 * splitGrid, loops/pause edges, batching, variants, fallback models) report
 * a clear unsupported error instead of failing mysteriously.
 */

import type {
  GenerateAudioNodeData,
  GenerateVideoNodeData,
  LLMGenerateNodeData,
  NanoBananaNodeData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
} from "@/types";
import { getConnectedInputsPure, validateWorkflowPure } from "@/store/utils/connectedInputs";
import { describeTemplateInterface, type TemplateInterface } from "@/lib/workflow/templateInterface";
import { groupNodesByLevel } from "@/store/utils/executionUtils";

export const SUPPORTED_NODE_TYPES = new Set([
  "imageInput",
  "videoInput",
  "audioInput",
  "prompt",
  "nanoBanana",
  "llmGenerate",
  "generateVideo",
  "generateAudio",
  "output",
  "outputGallery",
]);

export interface HeadlessInputValue {
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
}

export interface HeadlessRunRequest {
  workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  /** Overrides keyed by node id or customTitle: text for prompt nodes, media for input nodes. */
  inputs?: Record<string, HeadlessInputValue>;
  /** Check supported types, edges, inputs, and structure without executing anything. */
  validateOnly?: boolean;
}

export interface HeadlessOutput {
  nodeId: string;
  title: string;
  type: "image" | "video" | "audio" | "text";
  data: string; // data URL for media, plain string for text
}

export interface HeadlessNodeResult {
  nodeId: string;
  type: string;
  status: "complete" | "error" | "skipped";
  error?: string;
  durationMs: number;
}

export interface HeadlessRunResult {
  success: boolean;
  error?: string;
  outputs: HeadlessOutput[];
  nodeResults: HeadlessNodeResult[];
  /** Typed inputs/outputs of the workflow (present on validateOnly responses). */
  templateInterface?: TemplateInterface;
}

export interface HeadlessRunContext {
  /** Origin for self-calls to /api/generate and /api/llm (e.g. http://localhost:3000). */
  origin: string;
  /** Provider key headers forwarded to the generation endpoints. */
  headers: Record<string, string>;
  /** Poll pacing override for tests. */
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

function nodeTitle(node: WorkflowNode): string {
  return (node.data as { customTitle?: string }).customTitle || node.id;
}

function findByIdOrTitle(nodes: WorkflowNode[], key: string): WorkflowNode | undefined {
  return (
    nodes.find((n) => n.id === key) ??
    nodes.find((n) => (n.data as { customTitle?: string }).customTitle === key)
  );
}

/** Apply CLI/API input overrides onto input and prompt nodes. */
export function applyInputOverrides(
  nodes: WorkflowNode[],
  inputs: Record<string, HeadlessInputValue> | undefined
): { applied: string[]; errors: string[] } {
  const applied: string[] = [];
  const errors: string[] = [];
  if (!inputs) return { applied, errors };

  for (const [key, value] of Object.entries(inputs)) {
    const node = findByIdOrTitle(nodes, key);
    if (!node) {
      errors.push(`Input "${key}" matches no node id or title`);
      continue;
    }
    const data = node.data as Record<string, unknown>;
    if (node.type === "prompt" && value.text !== undefined) {
      data.prompt = value.text;
    } else if (node.type === "imageInput" && value.image !== undefined) {
      data.image = value.image;
    } else if (node.type === "videoInput" && value.video !== undefined) {
      data.video = value.video;
    } else if (node.type === "audioInput" && value.audio !== undefined) {
      data.audioFile = value.audio;
    } else if ((node.type === "nanoBanana" || node.type === "llmGenerate" || node.type === "generateVideo" || node.type === "generateAudio") && value.text !== undefined) {
      data.inlinePrompt = value.text;
    } else {
      errors.push(`Input "${key}" has no value usable by a ${node.type} node`);
      continue;
    }
    applied.push(key);
  }

  return { applied, errors };
}

async function postJson(
  ctx: HeadlessRunContext,
  path: string,
  body: unknown
): Promise<Record<string, unknown>> {
  const fetcher = ctx.fetchImpl ?? fetch;
  const response = await fetcher(`${ctx.origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ctx.headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${response.status} from ${path}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error((json.error as string) || `HTTP ${response.status} from ${path}`);
  }
  return json;
}

const POLL_MAX_MS = 10 * 60 * 1000;

/** Poll /api/generate/poll until a long-running provider task settles. */
async function pollUntilDone(
  ctx: HeadlessRunContext,
  submit: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const interval = ctx.pollIntervalMs ?? 3000;
  const started = Date.now();
  let result: Record<string, unknown> = submit;

  while (result.polling) {
    if (Date.now() - started > POLL_MAX_MS) {
      throw new Error("Generation timed out after 10 minutes");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    result = await postJson(ctx, "/api/generate/poll", {
      taskId: result.taskId,
      provider: result.pollProvider,
      modelId: result.pollModelId,
      modelName: result.pollModelName,
      mediaType: result.pollMediaType,
      pollContext: result.pollContext,
    });
  }
  return result;
}

async function runGenerateNode(
  ctx: HeadlessRunContext,
  node: WorkflowNode,
  images: string[],
  videos: string[],
  audio: string[],
  text: string | null,
  dynamicInputs: Record<string, string | string[]>,
  control: string | null
): Promise<void> {
  const data = node.data as Record<string, unknown>;

  if (node.type === "llmGenerate") {
    const llm = node.data as LLMGenerateNodeData;
    const prompt = text || llm.inlinePrompt;
    if (!prompt) throw new Error("Missing text input");
    const result = await postJson(ctx, "/api/llm", {
      prompt,
      ...(images.length > 0 && { images }),
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
      maxTokens: llm.maxTokens,
    });
    if (!result.success || !result.text) {
      throw new Error((result.error as string) || "LLM generation failed");
    }
    data.outputText = result.text;
    return;
  }

  if (node.type === "nanoBanana") {
    const nb = node.data as NanoBananaNodeData;
    const prompt = text || nb.inlinePrompt;
    if (!prompt) throw new Error("Missing text input");
    let result = await postJson(ctx, "/api/generate", {
      images,
      prompt,
      aspectRatio: nb.aspectRatio,
      resolution: nb.resolution,
      model: nb.model,
      useGoogleSearch: nb.useGoogleSearch,
      useImageSearch: nb.useImageSearch,
      selectedModel: nb.selectedModel,
      parameters: nb.parameters,
      dynamicInputs,
      ...(control ? { controlImage: control } : {}),
    });
    result = await pollUntilDone(ctx, result);
    if (!result.success || !result.image) {
      throw new Error((result.error as string) || "Image generation failed");
    }
    data.outputImage = result.image;
    return;
  }

  if (node.type === "generateVideo") {
    const vid = node.data as GenerateVideoNodeData;
    if (!vid.selectedModel?.modelId) throw new Error("No video model selected");
    if (images.length === 0 && videos.length === 0 && audio.length === 0 && !text && !vid.inlinePrompt) {
      throw new Error("Missing required inputs");
    }
    const prompt = text || vid.inlinePrompt || null;
    let result = await postJson(ctx, "/api/generate", {
      images,
      prompt,
      selectedModel: vid.selectedModel,
      parameters: vid.parameters,
      dynamicInputs,
      mediaType: "video",
    });
    result = await pollUntilDone(ctx, result);
    const media = (result.video as string) || (result.image as string);
    if (!result.success || !media) {
      throw new Error((result.error as string) || "Video generation failed");
    }
    data.outputVideo = media;
    return;
  }

  if (node.type === "generateAudio") {
    const aud = node.data as GenerateAudioNodeData;
    if (!aud.selectedModel?.modelId) throw new Error("No audio model selected");
    const prompt = text || aud.inlinePrompt;
    if (!prompt) throw new Error("Missing text input for audio generation");
    let result = await postJson(ctx, "/api/generate", {
      images: [],
      prompt,
      selectedModel: aud.selectedModel,
      parameters: aud.parameters,
      dynamicInputs,
      mediaType: "audio",
    });
    result = await pollUntilDone(ctx, result);
    const media = (result.audio as string) || (result.image as string);
    if (!result.success || !media) {
      throw new Error((result.error as string) || "Audio generation failed");
    }
    data.outputAudio = media;
    return;
  }
}

function collectOutputs(nodes: WorkflowNode[], edges: WorkflowEdge[]): HeadlessOutput[] {
  const outputs: HeadlessOutput[] = [];

  for (const node of nodes) {
    if (node.type !== "output" && node.type !== "outputGallery") continue;
    const inputs = getConnectedInputsPure(node.id, nodes, edges);
    const title = nodeTitle(node);
    for (const image of inputs.images) {
      outputs.push({ nodeId: node.id, title, type: "image", data: image });
    }
    for (const video of inputs.videos) {
      outputs.push({ nodeId: node.id, title, type: "video", data: video });
    }
    for (const clip of inputs.audio) {
      outputs.push({ nodeId: node.id, title, type: "audio", data: clip });
    }
    if (inputs.text) {
      outputs.push({ nodeId: node.id, title, type: "text", data: inputs.text });
    }
  }

  // No output nodes: fall back to terminal generation results
  if (outputs.length === 0) {
    const withOutgoing = new Set(edges.map((e) => e.source));
    for (const node of nodes) {
      if (withOutgoing.has(node.id)) continue;
      const data = node.data as Record<string, unknown>;
      const title = nodeTitle(node);
      if (typeof data.outputImage === "string" && data.outputImage) {
        outputs.push({ nodeId: node.id, title, type: "image", data: data.outputImage });
      } else if (typeof data.outputVideo === "string" && data.outputVideo) {
        outputs.push({ nodeId: node.id, title, type: "video", data: data.outputVideo });
      } else if (typeof data.outputAudio === "string" && data.outputAudio) {
        outputs.push({ nodeId: node.id, title, type: "audio", data: data.outputAudio });
      } else if (typeof data.outputText === "string" && data.outputText) {
        outputs.push({ nodeId: node.id, title, type: "text", data: data.outputText });
      }
    }
  }

  return outputs;
}

export async function runWorkflowHeadless(
  request: HeadlessRunRequest,
  ctx: HeadlessRunContext
): Promise<HeadlessRunResult> {
  const nodes: WorkflowNode[] = request.workflow.nodes.map((node) => ({
    ...node,
    data: { ...(node.data as Record<string, unknown>) } as WorkflowNodeData,
  })) as WorkflowNode[];
  const edges = request.workflow.edges;
  const nodeResults: HeadlessNodeResult[] = [];

  // Reject graph features the headless engine does not run yet
  const unsupported = [...new Set(
    nodes.filter((n) => !SUPPORTED_NODE_TYPES.has(n.type as string)).map((n) => n.type as string)
  )];
  if (unsupported.length > 0) {
    return {
      success: false,
      error: `Node type${unsupported.length === 1 ? "" : "s"} not supported in headless runs yet: ${unsupported.join(", ")}`,
      outputs: [],
      nodeResults,
    };
  }
  if (edges.some((e) => e.data?.isLoop || e.data?.hasPause)) {
    return {
      success: false,
      error: "Loop and pause edges are not supported in headless runs yet",
      outputs: [],
      nodeResults,
    };
  }

  const overrides = applyInputOverrides(nodes, request.inputs);
  if (overrides.errors.length > 0) {
    return { success: false, error: overrides.errors.join("; "), outputs: [], nodeResults };
  }

  const validation = validateWorkflowPure(nodes, edges);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; "), outputs: [], nodeResults };
  }

  if (request.validateOnly) {
    return {
      success: true,
      outputs: [],
      nodeResults,
      templateInterface: describeTemplateInterface(nodes),
    };
  }

  const levels = groupNodesByLevel(nodes, edges);
  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  for (const level of levels) {
    for (const nodeId of level.nodeIds) {
      const node = nodesById.get(nodeId);
      if (!node) continue;
      const started = Date.now();

      try {
        if (node.type === "prompt") {
          const inputs = getConnectedInputsPure(node.id, nodes, edges);
          if (inputs.text) (node.data as Record<string, unknown>).prompt = inputs.text;
        } else if (
          node.type === "nanoBanana" ||
          node.type === "llmGenerate" ||
          node.type === "generateVideo" ||
          node.type === "generateAudio"
        ) {
          const inputs = getConnectedInputsPure(node.id, nodes, edges);
          await runGenerateNode(
            ctx,
            node,
            inputs.images,
            inputs.videos,
            inputs.audio,
            inputs.text,
            inputs.dynamicInputs,
            inputs.control ?? null
          );
        }
        // input and output nodes need no work here

        nodeResults.push({
          nodeId,
          type: node.type as string,
          status: "complete",
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        nodeResults.push({
          nodeId,
          type: node.type as string,
          status: "error",
          error: message,
          durationMs: Date.now() - started,
        });
        return {
          success: false,
          error: `Node "${nodeTitle(node)}" (${node.type}) failed: ${message}`,
          outputs: [],
          nodeResults,
        };
      }
    }
  }

  return { success: true, outputs: collectOutputs(nodes, edges), nodeResults };
}
