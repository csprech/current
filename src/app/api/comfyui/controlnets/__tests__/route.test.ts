/**
 * GET /api/comfyui/controlnets — ControlNet + depth-preprocessor discovery.
 * An absent daemon must come back success:false with a hint, never an error
 * status.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "../route";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe("GET /api/comfyui/controlnets", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("COMFYUI_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("lists ControlNets and reports the installed depth preprocessor", async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("/object_info/ControlNetLoader")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ControlNetLoader: { input: { required: { control_net_name: [["cn_canny.pth"], {}] } } },
          }),
        });
      }
      if (u.includes("/object_info/DepthAnythingV2Preprocessor")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ DepthAnythingV2Preprocessor: { input: { required: { image: [["IMAGE"]] } } } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const response = await GET(makeRequest({ "X-ComfyUI-URL": "http://gpu-box:8188" }));
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      controlnets: ["cn_canny.pth"],
      depthPreprocessor: "DepthAnythingV2Preprocessor",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("http://gpu-box:8188");
  });

  it("reports a null depth preprocessor when the aux pack is absent", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/object_info/ControlNetLoader")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ControlNetLoader: { input: { required: { control_net_name: [[], {}] } } } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }); // unknown classes → empty
    });

    const response = await GET(makeRequest());
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.depthPreprocessor).toBeNull();
  });

  it("reports an unreachable daemon as success:false with a hint", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.controlnets).toEqual([]);
    expect(data.error).toContain("Could not reach ComfyUI at http://localhost:8188");
  });
});
