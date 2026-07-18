/**
 * GitHub-backed community template routes: list from index.json, resolve
 * template ids to raw download URLs, and treat a not-yet-created repo as an
 * empty marketplace rather than an error.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as listTemplates } from "../route";
import { GET as resolveTemplate } from "../[id]/route";
import { GET as relayTemplate } from "../[id]/file/route";

const INDEX = {
  templates: [
    { id: "poster", name: "Poster maker", author: "ann", file: "poster.json", description: "Type a line, get a poster", tags: ["image"] },
    { id: "trailer", name: "Trailer cutter", author: "bo", file: "/custom/trailer.json" },
  ],
};

function resolveParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("community template routes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("COMMUNITY_TEMPLATES_REPO", "acme/flows");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lists templates from the repo index with source links", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => INDEX });

    const response = await listTemplates();
    const data = await response.json();

    expect(fetchMock.mock.calls[0][0]).toBe("https://raw.githubusercontent.com/acme/flows/main/index.json");
    expect(data.success).toBe(true);
    expect(data.workflows).toHaveLength(2);
    expect(data.workflows[0]).toMatchObject({ id: "poster", name: "Poster maker", author: "ann" });
    expect(data.source).toEqual({
      repo: "acme/flows",
      branch: "main",
      browseUrl: "https://github.com/acme/flows",
      submitUrl: "https://github.com/acme/flows/upload/main/templates",
    });
  });

  it("treats a missing repo/index as an empty marketplace", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    const response = await listTemplates();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.workflows).toEqual([]);
    expect(data.source.submitUrl).toContain("acme/flows");
  });

  it("reports other upstream failures as errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await listTemplates();
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.success).toBe(false);
  });

  it("resolves a template id to its raw download URL", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => INDEX });

    const response = await resolveTemplate(new Request("http://x"), resolveParams("poster"));
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      downloadUrl: "https://raw.githubusercontent.com/acme/flows/main/templates/poster.json",
    });
  });

  it("honors absolute file paths in the index", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => INDEX });

    const response = await resolveTemplate(new Request("http://x"), resolveParams("trailer"));
    const data = await response.json();

    expect(data.downloadUrl).toBe("https://raw.githubusercontent.com/acme/flows/main/custom/trailer.json");
  });

  it("relays the template file server-side for blocked networks", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith("/index.json")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => INDEX });
      }
      if (String(url).endsWith("/templates/poster.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": "26" }),
          arrayBuffer: async () => new TextEncoder().encode('{"name":"Poster maker"}').buffer,
        });
      }
      return Promise.reject(new TypeError("unexpected url"));
    });

    const response = await relayTemplate(new Request("http://x"), resolveParams("poster"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Poster maker" });
  });

  it("404s the relay for unknown ids", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => INDEX });
    const response = await relayTemplate(new Request("http://x"), resolveParams("nope"));
    expect(response.status).toBe(404);
  });

  it("404s unknown template ids", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => INDEX });

    const response = await resolveTemplate(new Request("http://x"), resolveParams("nope"));
    expect(response.status).toBe(404);
  });
});
