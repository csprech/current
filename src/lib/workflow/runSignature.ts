/**
 * Run signatures for smart re-run.
 *
 * A generator's signature captures everything that determines its output:
 * the connected inputs it will consume and its own generation settings.
 * If a node's signature matches its last successful run (and the output is
 * still present), re-running the workflow can skip it — same inputs, same
 * settings, no reason to bill the provider again.
 *
 * Fields are EXCLUDED by blacklist rather than included by whitelist: an
 * unknown new field then causes a spurious re-run (safe) instead of a stale
 * skip (wrong output shown as fresh).
 */

import type { ConnectedInputs } from "@/store/utils/connectedInputs";

/** Node types whose runs are skippable, mapped to their output field. */
export const GENERATOR_OUTPUT_FIELDS: Record<string, string> = {
  nanoBanana: "outputImage",
  generateVideo: "outputVideo",
  generateAudio: "outputAudio",
  generate3d: "output3dUrl",
  llmGenerate: "outputText",
};

/**
 * Node-data fields that do not influence what a generator produces:
 * outputs, run bookkeeping, history, UI state, and persistence artifacts.
 */
const NON_GENERATIVE_FIELDS = new Set([
  // outputs + run state
  "outputImage",
  "outputVideo",
  "outputAudio",
  "output3dUrl",
  "outputText",
  "status",
  "error",
  "__lastRunSignature",
  "__usedFallback",
  "__fallbackModelUsed",
  "__primaryError",
  // carousel history
  "imageHistory",
  "videoHistory",
  "audioHistory",
  "selectedHistoryIndex",
  "selectedVideoHistoryIndex",
  "selectedAudioHistoryIndex",
  // UI state
  "label",
  "customTitle",
  "comment",
  "parametersExpanded",
  "isTemplateInput",
  // derived from the selected model, arrives async — noise, not signal
  "inputSchema",
  // external-storage persistence artifacts
  "imageRef",
  "outputImageRef",
  "sourceImageRef",
  "inputImageRefs",
]);

/** Deterministic JSON: object keys sorted at every level. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/** FNV-1a 32-bit — fast enough for multi-MB media strings, tiny output. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Signature of what this run would consume: connected inputs + the node's
 * generation-relevant settings.
 */
export function computeRunSignature(
  nodeType: string,
  nodeData: Record<string, unknown>,
  inputs: ConnectedInputs
): string {
  const settings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(nodeData)) {
    if (!NON_GENERATIVE_FIELDS.has(key)) settings[key] = value;
  }

  const payload = stableStringify({
    type: nodeType,
    inputs: {
      images: inputs.images,
      videos: inputs.videos,
      audio: inputs.audio,
      model3d: inputs.model3d,
      text: inputs.text,
      textItems: inputs.textItems,
      dynamicInputs: inputs.dynamicInputs,
      easeCurve: inputs.easeCurve,
      mask: inputs.mask ?? null,
      control: inputs.control ?? null,
    },
    settings,
  });

  // Length folded in alongside the hash makes accidental collisions across
  // differently-sized media payloads even less likely.
  return `${fnv1a(payload)}-${payload.length.toString(36)}`;
}
