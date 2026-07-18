/**
 * ComfyUI provider: graph construction, base-URL resolution, submit + poll
 * against a fetch-mocked daemon speaking the real protocol shapes
 * (POST /prompt, GET /history/{id}, GET /view, GET /object_info/...).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_COMFYUI_URL,
  resolveComfyUIBaseUrl,
  buildComfyUIGraph,
  buildPreprocessorInputs,
  dimensionsForAspect,
  submitComfyUITask,
  checkComfyUITaskOnce,
  fetchComfyUICheckpoints,
  fetchComfyUIControlNets,
  checkpointDisplayName,
} from "../comfyui";
import type { GenerationInput } from "@/lib/providers/types";

const makeInput = (overrides: Partial<GenerationInput> = {}): GenerationInput => ({
  model: {
    id: "sd_xl_base_1.0.safetensors",
    name: "sd_xl_base_1.0",
    provider: "comfyui",
    capabilities: ["text-to-image"],
    description: null,
  },
  prompt: "a lighthouse at dusk",
  ...overrides,
});

describe("resolveComfyUIBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers the header URL, then env, then the default", () => {
    vi.stubEnv("COMFYUI_URL", "http://env-host:8188");
    expect(resolveComfyUIBaseUrl("http://header-host:8188")).toBe("http://header-host:8188");
    expect(resolveComfyUIBaseUrl(null)).toBe("http://env-host:8188");
    vi.stubEnv("COMFYUI_URL", "");
    expect(resolveComfyUIBaseUrl(null)).toBe(DEFAULT_COMFYUI_URL);
    expect(DEFAULT_COMFYUI_URL).toBe("http://localhost:8188");
  });

  it("strips trailing slashes", () => {
    expect(resolveComfyUIBaseUrl("http://host:8188//")).toBe("http://host:8188");
  });
});

describe("buildComfyUIGraph", () => {
  const base = {
    checkpoint: "model.safetensors",
    prompt: "pos",
    negativePrompt: "neg",
    width: 1024,
    height: 768,
    seed: 42,
    steps: 20,
    cfg: 7,
    samplerName: "euler",
    scheduler: "normal",
    denoise: 1,
  };

  it("builds the standard txt2img graph with an empty latent", () => {
    const graph = buildComfyUIGraph(base) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    expect(graph["4"].inputs.ckpt_name).toBe("model.safetensors");
    expect(graph["5"]).toEqual({
      class_type: "EmptyLatentImage",
      inputs: { width: 1024, height: 768, batch_size: 1 },
    });
    expect(graph["6"].inputs.text).toBe("pos");
    expect(graph["7"].inputs.text).toBe("neg");
    expect(graph["3"].inputs).toMatchObject({
      seed: 42, steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1,
      latent_image: ["5", 0],
    });
    expect(graph["9"].class_type).toBe("SaveImage");
    expect(graph["10"]).toBeUndefined();
  });

  it("swaps the latent source to LoadImage → VAEEncode for img2img", () => {
    const graph = buildComfyUIGraph({ ...base, inputImageName: "input.png", denoise: 0.7 }) as
      Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    expect(graph["5"]).toBeUndefined();
    expect(graph["10"]).toEqual({ class_type: "LoadImage", inputs: { image: "input.png" } });
    expect(graph["11"].class_type).toBe("VAEEncode");
    expect(graph["3"].inputs.latent_image).toEqual(["11", 0]);
    expect(graph["3"].inputs.denoise).toBe(0.7);
  });

  it("routes conditioning through ControlNetApplyAdvanced when a ControlNet is set", () => {
    const graph = buildComfyUIGraph({
      ...base,
      controlNet: {
        modelName: "control_v11p_sd15_canny.pth",
        controlImageName: "hint.png",
        strength: 0.85,
        preprocessor: null,
      },
    }) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;

    expect(graph["20"]).toEqual({ class_type: "LoadImage", inputs: { image: "hint.png" } });
    expect(graph["21"]).toBeUndefined(); // no preprocessor — image already a hint map
    expect(graph["22"]).toEqual({
      class_type: "ControlNetLoader",
      inputs: { control_net_name: "control_v11p_sd15_canny.pth" },
    });
    expect(graph["23"].inputs).toMatchObject({
      positive: ["6", 0],
      negative: ["7", 0],
      control_net: ["22", 0],
      image: ["20", 0],
      strength: 0.85,
      start_percent: 0,
      end_percent: 1,
    });
    // Sampler now consumes the conditioned outputs
    expect(graph["3"].inputs.positive).toEqual(["23", 0]);
    expect(graph["3"].inputs.negative).toEqual(["23", 1]);
  });

  it("inserts the preprocessor between the control image and the apply node", () => {
    const graph = buildComfyUIGraph({
      ...base,
      controlNet: {
        modelName: "cn.safetensors",
        controlImageName: "photo.png",
        strength: 1,
        preprocessor: { classType: "Canny", inputs: { low_threshold: 0.4, high_threshold: 0.8 } },
      },
    }) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;

    expect(graph["21"]).toEqual({
      class_type: "Canny",
      inputs: { low_threshold: 0.4, high_threshold: 0.8, image: ["20", 0] },
    });
    expect(graph["23"].inputs.image).toEqual(["21", 0]);
  });
});

describe("buildPreprocessorInputs", () => {
  it("fills required inputs from declared defaults, first combo option as fallback", () => {
    const spec = {
      input: {
        required: {
          image: [["IMAGE"]] as [unknown],
          ckpt_name: [["depth_anything_v2_vits.pth", "other.pth"]] as [unknown],
          resolution: [["INT"], { default: 512 }] as [unknown, { default?: unknown }],
        },
      },
    };
    expect(buildPreprocessorInputs(spec)).toEqual({
      ckpt_name: "depth_anything_v2_vits.pth",
      resolution: 512,
    });
  });

  it("returns empty inputs for an image-only spec", () => {
    expect(buildPreprocessorInputs({ input: { required: { image: [["IMAGE"]] as [unknown] } } })).toEqual({});
    expect(buildPreprocessorInputs({})).toEqual({});
  });
});

describe("dimensionsForAspect", () => {
  it("maps aspect ratios to SDXL buckets, defaulting to square", () => {
    expect(dimensionsForAspect("16:9", undefined)).toEqual({ width: 1344, height: 768 });
    expect(dimensionsForAspect("9:16", undefined)).toEqual({ width: 768, height: 1344 });
    expect(dimensionsForAspect(undefined, undefined)).toEqual({ width: 1024, height: 1024 });
    expect(dimensionsForAspect("weird", undefined)).toEqual({ width: 1024, height: 1024 });
  });

  it("lets explicit width/height parameters win, clamped to sane bounds", () => {
    expect(dimensionsForAspect("1:1", { width: 512, height: 640 })).toEqual({ width: 512, height: 640 });
    expect(dimensionsForAspect("1:1", { width: 99999 })).toEqual({ width: 4096, height: 1024 });
  });
});

describe("checkpointDisplayName", () => {
  it("strips directories and weight-file extensions", () => {
    expect(checkpointDisplayName("sd_xl_base_1.0.safetensors")).toBe("sd_xl_base_1.0");
    expect(checkpointDisplayName("subdir/dreamshaper_8.ckpt")).toBe("dreamshaper_8");
    expect(checkpointDisplayName("flux1-dev.sft")).toBe("flux1-dev");
  });
});

describe("submitComfyUITask", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts the graph to /prompt and returns the prompt_id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ prompt_id: "abc-123", number: 0, node_errors: {} }),
    });

    const { taskId } = await submitComfyUITask("req1", "http://localhost:8188", makeInput(), "16:9");
    expect(taskId).toBe("abc-123");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8188/prompt");
    const sent = JSON.parse(init.body);
    const graph = sent.prompt;
    expect(graph["4"].inputs.ckpt_name).toBe("sd_xl_base_1.0.safetensors");
    expect(graph["5"].inputs).toMatchObject({ width: 1344, height: 768 });
    expect(graph["6"].inputs.text).toBe("a lighthouse at dusk");
  });

  it("uploads the first reference image and builds an img2img graph", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: "up.png", subfolder: "" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ prompt_id: "img-1", node_errors: {} }) });

    const input = makeInput({ images: ["data:image/png;base64,AAAA"] });
    await submitComfyUITask("req2", "http://localhost:8188", input, "1:1");

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8188/upload/image");
    const graph = JSON.parse(fetchMock.mock.calls[1][1].body).prompt;
    expect(graph["10"].inputs.image).toBe("up.png");
    expect(graph["3"].inputs.denoise).toBe(0.7);
  });

  it("surfaces node validation errors from the daemon", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { type: "prompt_outputs_failed_validation", message: "Prompt outputs failed validation" },
        node_errors: {
          "4": { errors: [{ message: "Value not in list", details: "ckpt_name: 'missing.safetensors' not in [...]" }] },
        },
      }),
    });

    await expect(submitComfyUITask("req3", "http://localhost:8188", makeInput())).rejects.toThrow(
      /Value not in list: ckpt_name/
    );
  });

  it("uploads the control image and wires ControlNet with the builtin Canny preprocessor", async () => {
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      if (String(url).endsWith("/upload/image")) {
        return Promise.resolve({ ok: true, json: async () => ({ name: "hint-up.png", subfolder: "" }) });
      }
      if (String(url).endsWith("/prompt") && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ prompt_id: "cn-1", node_errors: {} }) });
      }
      return Promise.reject(new TypeError("unexpected url"));
    });

    await submitComfyUITask(
      "req-cn",
      "http://localhost:8188",
      makeInput({
        parameters: {
          controlNetModel: "control_v11p_sd15_canny.pth",
          controlNetStrength: 0.6,
          controlPreprocessor: "canny",
        },
      }),
      "1:1",
      "data:image/png;base64,CCCC"
    );

    const promptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/prompt"));
    const graph = JSON.parse(promptCall![1].body).prompt;
    expect(graph["20"].inputs.image).toBe("hint-up.png");
    expect(graph["21"].class_type).toBe("Canny");
    expect(graph["22"].inputs.control_net_name).toBe("control_v11p_sd15_canny.pth");
    expect(graph["23"].inputs.strength).toBe(0.6);
    expect(graph["3"].inputs.positive).toEqual(["23", 0]);
  });

  it("resolves the depth preprocessor from the daemon's own spec", async () => {
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      const u = String(url);
      if (u.endsWith("/upload/image")) {
        return Promise.resolve({ ok: true, json: async () => ({ name: "photo-up.png", subfolder: "" }) });
      }
      if (u.includes("/object_info/DepthAnythingV2Preprocessor")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            DepthAnythingV2Preprocessor: {
              input: {
                required: {
                  image: [["IMAGE"]],
                  ckpt_name: [["depth_anything_v2_vits.pth"]],
                  resolution: [["INT"], { default: 512 }],
                },
              },
            },
          }),
        });
      }
      if (u.endsWith("/prompt") && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ prompt_id: "cn-2", node_errors: {} }) });
      }
      return Promise.reject(new TypeError("unexpected url"));
    });

    await submitComfyUITask(
      "req-depth",
      "http://localhost:8188",
      makeInput({ parameters: { controlNetModel: "cn-depth.safetensors", controlPreprocessor: "depth" } }),
      "1:1",
      "data:image/png;base64,DDDD"
    );

    const promptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/prompt"));
    const graph = JSON.parse(promptCall![1].body).prompt;
    expect(graph["21"]).toEqual({
      class_type: "DepthAnythingV2Preprocessor",
      inputs: { ckpt_name: "depth_anything_v2_vits.pth", resolution: 512, image: ["20", 0] },
    });
  });

  it("explains the missing aux pack when depth preprocessing is unavailable", async () => {
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      const u = String(url);
      if (u.endsWith("/upload/image")) {
        return Promise.resolve({ ok: true, json: async () => ({ name: "x.png", subfolder: "" }) });
      }
      if (u.includes("/object_info/")) {
        return Promise.resolve({ ok: true, json: async () => ({}) }); // class not installed
      }
      if (u.endsWith("/prompt") && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ prompt_id: "never", node_errors: {} }) });
      }
      return Promise.reject(new TypeError("unexpected url"));
    });

    await expect(
      submitComfyUITask(
        "req-nodepth",
        "http://localhost:8188",
        makeInput({ parameters: { controlNetModel: "cn.safetensors", controlPreprocessor: "depth" } }),
        "1:1",
        "data:image/png;base64,EEEE"
      )
    ).rejects.toThrow(/comfyui_controlnet_aux/);
  });

  it("rejects a connected control image with no ControlNet model selected", async () => {
    await expect(
      submitComfyUITask("req-nocn", "http://localhost:8188", makeInput(), "1:1", "data:image/png;base64,FFFF")
    ).rejects.toThrow(/no ControlNet model is selected/);
  });

  it("honors sampler parameters from the node", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ prompt_id: "p", node_errors: {} }) });
    await submitComfyUITask("req4", "http://localhost:8188", makeInput({
      parameters: { steps: 30, cfg: 5.5, seed: 7, samplerName: "dpmpp_2m", scheduler: "karras", negativePrompt: "blurry" },
    }));
    const graph = JSON.parse(fetchMock.mock.calls[0][1].body).prompt;
    expect(graph["3"].inputs).toMatchObject({
      steps: 30, cfg: 5.5, seed: 7, sampler_name: "dpmpp_2m", scheduler: "karras",
    });
    expect(graph["7"].inputs.text).toBe("blurry");
  });
});

describe("checkComfyUITaskOnce", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reports processing while the task is absent from history", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const check = await checkComfyUITaskOnce("req", "http://localhost:8188", "task-1");
    expect(check).toEqual({ status: "processing" });
  });

  it("fetches the finished image from /view and returns a data URL", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "task-1": {
            outputs: { "9": { images: [{ filename: "current_00001_.png", subfolder: "", type: "output" }] } },
            status: { status_str: "success", completed: true, messages: [] },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
      });

    const check = await checkComfyUITaskOnce("req", "http://localhost:8188", "task-1");
    expect(check.status).toBe("completed");
    if (check.status === "completed") {
      expect(check.result.outputs?.[0].type).toBe("image");
      expect(check.result.outputs?.[0].data).toBe(`data:image/png;base64,${png.toString("base64")}`);
    }
    expect(fetchMock.mock.calls[1][0]).toContain("/view?filename=current_00001_.png");
  });

  it("extracts the daemon's exception message on execution errors", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        "task-1": {
          outputs: {},
          status: {
            status_str: "error",
            completed: false,
            messages: [
              ["execution_start", {}],
              ["execution_error", { exception_message: "CUDA out of memory", exception_type: "OutOfMemoryError" }],
            ],
          },
        },
      }),
    });

    const check = await checkComfyUITaskOnce("req", "http://localhost:8188", "task-1");
    expect(check).toEqual({ status: "failed", error: "CUDA out of memory" });
  });

  it("fails cleanly when a completed task has no image output", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        "task-1": { outputs: {}, status: { status_str: "success", completed: true } },
      }),
    });
    const check = await checkComfyUITaskOnce("req", "http://localhost:8188", "task-1");
    expect(check).toEqual({ status: "failed", error: "ComfyUI produced no image output" });
  });
});

describe("fetchComfyUICheckpoints", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads the checkpoint list from the loader node's input options", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        CheckpointLoaderSimple: {
          input: { required: { ckpt_name: [["sd_xl_base_1.0.safetensors", "dreamshaper_8.safetensors"], {}] } },
        },
      }),
    });

    const checkpoints = await fetchComfyUICheckpoints("http://localhost:8188");
    expect(checkpoints).toEqual(["sd_xl_base_1.0.safetensors", "dreamshaper_8.safetensors"]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8188/object_info/CheckpointLoaderSimple");
  });

  it("throws when the daemon is unreachable so callers can decide the severity", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchComfyUICheckpoints("http://localhost:8188")).rejects.toThrow();
  });
});

describe("fetchComfyUIControlNets", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads installed ControlNet models from the loader node's options", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ControlNetLoader: {
          input: { required: { control_net_name: [["control_v11p_sd15_canny.pth", "control_depth.safetensors"], {}] } },
        },
      }),
    });
    const models = await fetchComfyUIControlNets("http://localhost:8188");
    expect(models).toEqual(["control_v11p_sd15_canny.pth", "control_depth.safetensors"]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8188/object_info/ControlNetLoader");
  });
});
