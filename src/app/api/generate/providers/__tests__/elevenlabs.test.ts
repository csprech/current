/**
 * ElevenLabs provider: TTS / sound-effects / music dispatch against a
 * fetch-mocked API speaking the real request shapes (xi-api-key header,
 * per-endpoint bodies, audio bytes back).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateWithElevenLabs,
  fetchElevenLabsVoices,
  DEFAULT_VOICE_ID,
} from "../elevenlabs";
import type { GenerationInput } from "@/lib/providers/types";

const makeInput = (modelId: string, overrides: Partial<GenerationInput> = {}): GenerationInput => ({
  model: { id: modelId, name: modelId, provider: "elevenlabs", capabilities: ["text-to-audio"], description: null },
  prompt: "Hello from the tests",
  ...overrides,
});

const audioResponse = () => ({
  ok: true,
  headers: new Headers({ "content-type": "audio/mpeg" }),
  arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
});

describe("generateWithElevenLabs", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ELEVENLABS_BASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts TTS to the voice endpoint with the model id and key header", async () => {
    fetchMock.mockResolvedValue(audioResponse());

    const result = await generateWithElevenLabs("req", "xi-key", makeInput("tts/eleven_multilingual_v2"));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_128`
    );
    expect(init.headers["xi-api-key"]).toBe("xi-key");
    expect(JSON.parse(init.body)).toEqual({
      text: "Hello from the tests",
      model_id: "eleven_multilingual_v2",
    });
    expect(result.success).toBe(true);
    expect(result.outputs?.[0].type).toBe("audio");
    expect(result.outputs?.[0].data.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });

  it("honors voiceId and voice settings parameters", async () => {
    fetchMock.mockResolvedValue(audioResponse());

    await generateWithElevenLabs("req", "xi-key", makeInput("tts/eleven_turbo_v2_5", {
      parameters: { voiceId: "custom-voice", stability: 0.3, similarityBoost: 0.9 },
    }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/v1/text-to-speech/custom-voice");
    expect(JSON.parse(init.body).voice_settings).toEqual({ stability: 0.3, similarity_boost: 0.9 });
  });

  it("posts sound effects with clamped duration", async () => {
    fetchMock.mockResolvedValue(audioResponse());

    await generateWithElevenLabs("req", "xi-key", makeInput("sound-effects", {
      parameters: { durationSeconds: 99, promptInfluence: 0.4 },
    }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/sound-generation");
    expect(JSON.parse(init.body)).toEqual({
      text: "Hello from the tests",
      duration_seconds: 22,
      prompt_influence: 0.4,
    });
  });

  it("posts music with the duration converted to milliseconds", async () => {
    fetchMock.mockResolvedValue(audioResponse());

    await generateWithElevenLabs("req", "xi-key", makeInput("music", {
      parameters: { durationSeconds: 45 },
    }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/music");
    expect(JSON.parse(init.body)).toEqual({ prompt: "Hello from the tests", music_length_ms: 45000 });
  });

  it("surfaces ElevenLabs' own error message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: { status: "invalid_api_key", message: "Invalid API key" } }),
    });

    const result = await generateWithElevenLabs("req", "bad", makeInput("tts/eleven_v3"));
    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("rejects unknown model ids without calling the API", async () => {
    const result = await generateWithElevenLabs("req", "xi-key", makeInput("dubbing"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown ElevenLabs model");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the env base URL override (for stubs and proxies)", async () => {
    vi.stubEnv("ELEVENLABS_BASE_URL", "http://localhost:8190/");
    fetchMock.mockResolvedValue(audioResponse());

    await generateWithElevenLabs("req", "xi-key", makeInput("sound-effects"));
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8190/v1/sound-generation");
  });
});

describe("fetchElevenLabsVoices", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ELEVENLABS_BASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps the account's voice list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          { voice_id: "v1", name: "Rachel", category: "premade" },
          { voice_id: "v2", name: "My Clone", category: "cloned" },
        ],
      }),
    });

    const voices = await fetchElevenLabsVoices("xi-key");
    expect(voices).toEqual([
      { id: "v1", name: "Rachel", category: "premade" },
      { id: "v2", name: "My Clone", category: "cloned" },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.elevenlabs.io/v1/voices");
    expect(fetchMock.mock.calls[0][1].headers["xi-api-key"]).toBe("xi-key");
  });

  it("throws the API's message on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized" }),
    });
    await expect(fetchElevenLabsVoices("bad")).rejects.toThrow("Unauthorized");
  });
});
