/**
 * ElevenLabs Provider for Generate API Route
 *
 * BYO-key audio generation against ElevenLabs' own API: text-to-speech,
 * sound effects, and music. All three endpoints answer synchronously with
 * audio bytes (seconds for TTS/SFX, under a minute for music), so this
 * provider completes inline like the Gemini image path — no submit+poll.
 *
 * Model ids in the catalog map to endpoints:
 *   tts/<model_id>   → POST /v1/text-to-speech/{voiceId}   (voiceId parameter)
 *   sound-effects    → POST /v1/sound-generation
 *   music            → POST /v1/music
 */

import { GenerationInput, GenerationOutput } from "@/lib/providers/types";

/** Overridable for tests; the real API host otherwise. */
export function elevenLabsBaseUrl(): string {
  return (process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/+$/, "");
}

/** ElevenLabs' "Rachel" premade voice — the conventional default. */
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function numberParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Extract ElevenLabs' error message ({detail: {message}} or {detail: "..."}). */
async function elevenLabsError(response: Response): Promise<string> {
  const fallback = `ElevenLabs error: ${response.status}`;
  try {
    const data = (await response.json()) as { detail?: { message?: string } | string };
    if (typeof data.detail === "string") return data.detail;
    return data.detail?.message || fallback;
  } catch {
    return fallback;
  }
}

async function audioOutput(requestId: string, response: Response): Promise<GenerationOutput> {
  const contentType = response.headers.get("content-type")?.startsWith("audio/")
    ? (response.headers.get("content-type") as string)
    : "audio/mpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[API:${requestId}] ElevenLabs output: ${contentType}, ${(buffer.byteLength / 1024).toFixed(0)}KB`);
  return {
    success: true,
    outputs: [{ type: "audio", data: `data:${contentType};base64,${buffer.toString("base64")}` }],
  };
}

export async function generateWithElevenLabs(
  requestId: string,
  apiKey: string,
  input: GenerationInput
): Promise<GenerationOutput> {
  const baseUrl = elevenLabsBaseUrl();
  const parameters = input.parameters ?? {};
  const modelId = input.model.id;
  const headers = {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
  };

  console.log(`[API:${requestId}] ElevenLabs generate: ${modelId}`);

  if (modelId.startsWith("tts/")) {
    const voiceId = typeof parameters.voiceId === "string" && parameters.voiceId ? parameters.voiceId : DEFAULT_VOICE_ID;
    const body: Record<string, unknown> = {
      text: input.prompt,
      model_id: modelId.slice("tts/".length),
    };
    const stability = numberParam(parameters.stability, NaN, 0, 1);
    const similarity = numberParam(parameters.similarityBoost, NaN, 0, 1);
    if (Number.isFinite(stability) || Number.isFinite(similarity)) {
      body.voice_settings = {
        ...(Number.isFinite(stability) ? { stability } : {}),
        ...(Number.isFinite(similarity) ? { similarity_boost: similarity } : {}),
      };
    }
    const response = await fetch(
      `${baseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      { method: "POST", headers, body: JSON.stringify(body) }
    );
    if (!response.ok) return { success: false, error: await elevenLabsError(response) };
    return audioOutput(requestId, response);
  }

  if (modelId === "sound-effects") {
    const body: Record<string, unknown> = { text: input.prompt };
    const duration = numberParam(parameters.durationSeconds, NaN, 0.5, 22);
    if (Number.isFinite(duration)) body.duration_seconds = duration;
    const influence = numberParam(parameters.promptInfluence, NaN, 0, 1);
    if (Number.isFinite(influence)) body.prompt_influence = influence;

    const response = await fetch(`${baseUrl}/v1/sound-generation`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) return { success: false, error: await elevenLabsError(response) };
    return audioOutput(requestId, response);
  }

  if (modelId === "music") {
    const body: Record<string, unknown> = { prompt: input.prompt };
    const duration = numberParam(parameters.durationSeconds, NaN, 10, 300);
    if (Number.isFinite(duration)) body.music_length_ms = Math.round(duration * 1000);

    const response = await fetch(`${baseUrl}/v1/music`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) return { success: false, error: await elevenLabsError(response) };
    return audioOutput(requestId, response);
  }

  return { success: false, error: `Unknown ElevenLabs model: ${modelId}` };
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  category?: string;
}

/** List the account's voices (premade + cloned) for the TTS voice picker. */
export async function fetchElevenLabsVoices(
  apiKey: string
): Promise<Array<{ id: string; name: string; category: string | null }>> {
  const response = await fetch(`${elevenLabsBaseUrl()}/v1/voices`, {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(await elevenLabsError(response));
  }
  const data = (await response.json()) as { voices?: ElevenLabsVoice[] };
  return (data.voices ?? []).map((voice) => ({
    id: voice.voice_id,
    name: voice.name,
    category: voice.category ?? null,
  }));
}
