/**
 * Ollama branch of POST /api/llm plus the base-URL resolution helper.
 * The daemon is mocked at the fetch layer with protocol-faithful
 * /api/chat responses ({ message: { content } }, non-streaming).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { POST, resolveOllamaBaseUrl, DEFAULT_OLLAMA_URL } from "../route";

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as NextRequest;
}

const ollamaBody = {
  prompt: "Say hello",
  provider: "ollama",
  model: "llama3.2",
  temperature: 0.4,
  maxTokens: 512,
};

describe("resolveOllamaBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the header URL over everything else", () => {
    vi.stubEnv("OLLAMA_URL", "http://env-host:11434");
    expect(resolveOllamaBaseUrl("http://header-host:11434")).toBe("http://header-host:11434");
  });

  it("falls back to the OLLAMA_URL env var", () => {
    vi.stubEnv("OLLAMA_URL", "http://env-host:11434");
    expect(resolveOllamaBaseUrl(null)).toBe("http://env-host:11434");
  });

  it("defaults to localhost:11434", () => {
    vi.stubEnv("OLLAMA_URL", "");
    expect(resolveOllamaBaseUrl(null)).toBe(DEFAULT_OLLAMA_URL);
    expect(DEFAULT_OLLAMA_URL).toBe("http://localhost:11434");
  });

  it("strips trailing slashes so path joins stay clean", () => {
    expect(resolveOllamaBaseUrl("http://host:11434///")).toBe("http://host:11434");
  });
});

describe("POST /api/llm with provider=ollama", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OLLAMA_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts a non-streaming chat request to the daemon and returns its text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { role: "assistant", content: "Hello from llama!" } }),
    });

    const response = await POST(makeRequest(ollamaBody));
    const data = await response.json();

    expect(data).toEqual({ success: true, text: "Hello from llama!" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/api/chat");
    const sent = JSON.parse(init.body);
    expect(sent).toEqual({
      model: "llama3.2",
      messages: [{ role: "user", content: "Say hello" }],
      stream: false,
      options: { temperature: 0.4, num_predict: 512 },
    });
  });

  it("targets the daemon named by the X-Ollama-URL header", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "ok" } }),
    });

    await POST(makeRequest(ollamaBody, { "X-Ollama-URL": "http://gpu-box:11434/" }));

    expect(fetchMock.mock.calls[0][0]).toBe("http://gpu-box:11434/api/chat");
  });

  it("strips data-URL prefixes from images (Ollama wants raw base64)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "an image" } }),
    });

    await POST(
      makeRequest({
        ...ollamaBody,
        images: ["data:image/png;base64,AAAA", "BBBB"],
      })
    );

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].images).toEqual(["AAAA", "BBBB"]);
  });

  it("returns a friendly hint when the daemon is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(makeRequest(ollamaBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Could not reach Ollama at http://localhost:11434");
    expect(data.error).toContain("ollama serve");
  });

  it("surfaces the daemon's own error message (e.g. model not pulled)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'model "llama3.2" not found, try pulling it first' }),
    });

    const response = await POST(makeRequest(ollamaBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('model "llama3.2" not found, try pulling it first');
  });

  it("errors when the daemon returns no text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "" } }),
    });

    const response = await POST(makeRequest(ollamaBody));
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toContain("No text in Ollama response");
  });
});
