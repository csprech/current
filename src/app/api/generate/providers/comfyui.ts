/**
 * ComfyUI Provider for Generate API Route
 *
 * Drives a local ComfyUI daemon over its HTTP API — free, private image
 * generation on the user's own GPU. Follows the same submit+poll contract as
 * the cloud providers: submitComfyUITask() queues a graph via POST /prompt and
 * returns the prompt_id; checkComfyUITaskOnce() reads GET /history/{id} and
 * fetches the finished image via GET /view.
 *
 * The daemon address resolves X-ComfyUI-URL header → COMFYUI_URL env →
 * http://localhost:8188, mirroring the Ollama provider. Checkpoints installed
 * in the daemon are discovered from GET /object_info/CheckpointLoaderSimple.
 *
 * v1 scope: text-to-image and single-reference image-to-image through the
 * standard checkpoint → CLIP encode → KSampler → VAE decode graph. Custom
 * workflows, ControlNet, and video models vary per install and stay out of
 * scope.
 */

import { GenerationInput } from "@/lib/providers/types";
import type { TaskCheckResult } from "./taskPolling";

/** Default ComfyUI daemon address; override via X-ComfyUI-URL header or COMFYUI_URL env. */
export const DEFAULT_COMFYUI_URL = "http://localhost:8188";

export function resolveComfyUIBaseUrl(headerUrl?: string | null): string {
  return (headerUrl || process.env.COMFYUI_URL || DEFAULT_COMFYUI_URL).replace(/\/+$/, "");
}

export function comfyUIUnreachableError(baseUrl: string): string {
  return `Could not reach ComfyUI at ${baseUrl}. Start ComfyUI (it listens on port 8188 by default), or set the URL in Settings.`;
}

/**
 * SDXL-native resolution buckets per aspect ratio (multiples of 64).
 * parameters.width/height override these when provided.
 */
const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
  "3:2": { width: 1216, height: 832 },
  "2:3": { width: 832, height: 1216 },
  "21:9": { width: 1536, height: 640 },
};

interface ComfyUIGraphOptions {
  checkpoint: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  /** Uploaded input-image filename for img2img; omit for txt2img. */
  inputImageName?: string;
  /** KSampler denoise — 1 for txt2img, lower keeps more of the input image. */
  denoise: number;
}

/**
 * Build the standard generation graph in ComfyUI's API ("prompt") format.
 * txt2img: checkpoint → CLIP pos/neg → empty latent → KSampler → VAE decode → save
 * img2img: the empty latent is replaced by LoadImage → VAEEncode.
 */
export function buildComfyUIGraph(options: ComfyUIGraphOptions): Record<string, unknown> {
  const {
    checkpoint, prompt, negativePrompt, width, height,
    seed, steps, cfg, samplerName, scheduler, inputImageName, denoise,
  } = options;

  const graph: Record<string, unknown> = {
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: negativePrompt, clip: ["4", 1] } },
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: samplerName,
        scheduler,
        denoise,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: inputImageName ? ["11", 0] : ["5", 0],
      },
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "current" } },
  };

  if (inputImageName) {
    graph["10"] = { class_type: "LoadImage", inputs: { image: inputImageName } };
    graph["11"] = { class_type: "VAEEncode", inputs: { pixels: ["10", 0], vae: ["4", 2] } };
  } else {
    graph["5"] = { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } };
  }

  return graph;
}

/** Coerce an unknown parameter to a finite number within [min, max], else the fallback. */
function numberParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function dimensionsForAspect(
  aspectRatio: string | undefined,
  parameters: Record<string, unknown> | undefined
): { width: number; height: number } {
  const base = ASPECT_DIMENSIONS[aspectRatio ?? ""] ?? ASPECT_DIMENSIONS["1:1"];
  return {
    width: numberParam(parameters?.width, base.width, 64, 4096),
    height: numberParam(parameters?.height, base.height, 64, 4096),
  };
}

/**
 * Upload a base64 data-URL image to the daemon's input store for img2img.
 * Returns the stored filename to reference from a LoadImage node.
 */
async function uploadComfyUIImage(
  requestId: string,
  baseUrl: string,
  dataUrl: string
): Promise<string> {
  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  const mimeType = matches?.[1] ?? "image/png";
  const base64 = matches?.[2] ?? dataUrl;
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];

  const bytes = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append(
    "image",
    new Blob([new Uint8Array(bytes)], { type: mimeType }),
    `current-input-${requestId}.${extension}`
  );
  form.append("overwrite", "true");

  const response = await fetch(`${baseUrl}/upload/image`, { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`ComfyUI image upload failed: ${response.status}`);
  }
  const data = (await response.json()) as { name?: string; subfolder?: string };
  if (!data.name) {
    throw new Error("ComfyUI image upload returned no filename");
  }
  // LoadImage resolves "subfolder/name" relative to the input directory
  return data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
}

/**
 * Queue a generation on the daemon. Returns the prompt_id used as the task id.
 */
export async function submitComfyUITask(
  requestId: string,
  baseUrl: string,
  input: GenerationInput,
  aspectRatio?: string
): Promise<{ taskId: string }> {
  const parameters = input.parameters ?? {};
  const { width, height } = dimensionsForAspect(aspectRatio, parameters);

  // img2img uses the first reference image; further references need custom
  // graphs (IPAdapter etc.) and stay out of v1 scope.
  let inputImageName: string | undefined;
  const firstImage = input.images?.[0];
  if (firstImage) {
    inputImageName = await uploadComfyUIImage(requestId, baseUrl, firstImage);
  }

  const graph = buildComfyUIGraph({
    checkpoint: input.model.id,
    prompt: input.prompt,
    negativePrompt: typeof parameters.negativePrompt === "string" ? parameters.negativePrompt : "",
    width,
    height,
    seed: numberParam(parameters.seed, Math.floor(Math.random() * 0xffffffff), 0, Number.MAX_SAFE_INTEGER),
    steps: numberParam(parameters.steps, 20, 1, 150),
    cfg: numberParam(parameters.cfg, 7, 0, 30),
    samplerName: typeof parameters.samplerName === "string" ? parameters.samplerName : "euler",
    scheduler: typeof parameters.scheduler === "string" ? parameters.scheduler : "normal",
    inputImageName,
    denoise: inputImageName ? numberParam(parameters.denoise, 0.7, 0.01, 1) : 1,
  });

  console.log(`[API:${requestId}] ComfyUI submit: ${input.model.id} ${width}x${height} ${inputImageName ? "img2img" : "txt2img"}`);

  const response = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: graph }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: { message?: string; type?: string } | string;
    node_errors?: Record<string, { errors?: Array<{ message?: string; details?: string }> }>;
  };

  if (!response.ok || !data.prompt_id) {
    const nodeError = Object.values(data.node_errors ?? {})
      .flatMap((n) => n.errors ?? [])
      .map((e) => [e.message, e.details].filter(Boolean).join(": "))
      .find(Boolean);
    const topError = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(nodeError || topError || `ComfyUI rejected the workflow (${response.status})`);
  }

  return { taskId: data.prompt_id };
}

interface ComfyUIHistoryEntry {
  outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
  status?: {
    status_str?: string;
    completed?: boolean;
    messages?: Array<[string, { exception_message?: string; exception_type?: string }?]>;
  };
}

/**
 * One short status check against /history/{id}; fetches the image on success.
 */
export async function checkComfyUITaskOnce(
  requestId: string,
  baseUrl: string,
  taskId: string
): Promise<TaskCheckResult> {
  const response = await fetch(`${baseUrl}/history/${encodeURIComponent(taskId)}`);
  if (!response.ok) {
    return { status: "failed", error: `ComfyUI history check failed: ${response.status}` };
  }

  const history = (await response.json()) as Record<string, ComfyUIHistoryEntry>;
  const entry = history[taskId];
  if (!entry) {
    return { status: "processing" }; // still queued or running
  }

  if (entry.status?.status_str === "error") {
    const detail = (entry.status.messages ?? [])
      .map(([, payload]) => payload?.exception_message)
      .find(Boolean);
    return { status: "failed", error: detail || "ComfyUI reported an execution error" };
  }

  const image = Object.values(entry.outputs ?? {})
    .flatMap((node) => node.images ?? [])
    .find((img) => img.type === "output") ??
    Object.values(entry.outputs ?? {}).flatMap((node) => node.images ?? [])[0];

  if (!image) {
    if (entry.status?.completed === false) {
      return { status: "processing" };
    }
    return { status: "failed", error: "ComfyUI produced no image output" };
  }

  // Fetch the finished image from the daemon (local address — the shared
  // fetchMediaOutput SSRF validation intentionally rejects localhost).
  const viewUrl =
    `${baseUrl}/view?filename=${encodeURIComponent(image.filename)}` +
    `&subfolder=${encodeURIComponent(image.subfolder ?? "")}` +
    `&type=${encodeURIComponent(image.type ?? "output")}`;
  const imageResponse = await fetch(viewUrl);
  if (!imageResponse.ok) {
    return { status: "failed", error: `Failed to fetch ComfyUI output: ${imageResponse.status}` };
  }

  const contentType = imageResponse.headers.get("content-type")?.startsWith("image/")
    ? (imageResponse.headers.get("content-type") as string)
    : "image/png";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  console.log(`[API:${requestId}] ComfyUI output: ${contentType}, ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`);

  return {
    status: "completed",
    result: {
      success: true,
      outputs: [{ type: "image", data: `data:${contentType};base64,${buffer.toString("base64")}` }],
    },
  };
}

/**
 * List checkpoints installed in the daemon, from the CheckpointLoaderSimple
 * node's input options. Throws when the daemon is unreachable — callers decide
 * whether that is an error (explicit filter) or a normal absence (aggregate).
 */
export async function fetchComfyUICheckpoints(baseUrl: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/object_info/CheckpointLoaderSimple`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI at ${baseUrl} responded with ${response.status}`);
  }
  const data = (await response.json()) as {
    CheckpointLoaderSimple?: { input?: { required?: { ckpt_name?: unknown[] } } };
  };
  const options = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
  return Array.isArray(options) ? options.filter((o): o is string => typeof o === "string") : [];
}

/** "sd_xl_base_1.0.safetensors" → "sd_xl_base_1.0" for display. */
export function checkpointDisplayName(checkpoint: string): string {
  const basename = checkpoint.split("/").pop() ?? checkpoint;
  return basename.replace(/\.(safetensors|ckpt|pt|pth|sft|gguf)$/i, "");
}
