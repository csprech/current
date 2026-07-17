/**
 * Local video operations for the Video Action node.
 *
 * Every operation runs on-device via WebCodecs (mediabunny) — no API call,
 * no cost. Operations decode the source, re-time frames, and re-encode to
 * MP4 (H.264). Audio tracks are not carried through, so output is silent;
 * for "mute" that is the point, and it matches easeCurve/videoTrim behavior.
 */

export type VideoActionOperation = "reverse" | "speed" | "boomerang" | "mute";

export interface VideoActionOptionDef {
  key: string;
  label: string;
  type: "select" | "number";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number;
}

export interface VideoActionDef {
  operation: VideoActionOperation;
  label: string;
  options: VideoActionOptionDef[];
}

export const SPEED_MIN = 0.25;
export const SPEED_MAX = 4;

/** Catalog of operations: drives both the node UI and parameter validation. */
export const VIDEO_ACTIONS: VideoActionDef[] = [
  { operation: "reverse", label: "Reverse", options: [] },
  {
    operation: "speed",
    label: "Change speed",
    options: [
      { key: "rate", label: "Speed ×", type: "number", min: SPEED_MIN, max: SPEED_MAX, step: 0.25, default: 2 },
    ],
  },
  { operation: "boomerang", label: "Boomerang", options: [] },
  { operation: "mute", label: "Mute", options: [] },
];

export const VIDEO_ACTIONS_BY_OPERATION = new Map(VIDEO_ACTIONS.map((a) => [a.operation, a]));

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/** Resolve raw node params against an operation's option definitions. */
export function resolveVideoActionParams(
  operation: VideoActionOperation,
  raw: Record<string, unknown> | undefined
): Record<string, string | number> {
  const def = VIDEO_ACTIONS_BY_OPERATION.get(operation);
  const resolved: Record<string, string | number> = {};
  if (!def) return resolved;
  for (const option of def.options) {
    const value = raw?.[option.key];
    if (option.type === "number") {
      resolved[option.key] = clampNumber(value, option.min ?? -Infinity, option.max ?? Infinity, option.default as number);
    } else {
      const allowed = (option.options ?? []).map((o) => o.value);
      resolved[option.key] = typeof value === "string" && allowed.includes(value) ? value : String(option.default);
    }
  }
  return resolved;
}

const MAX_OUTPUT_FPS = 60;
const FALLBACK_FPS = 30;
const DEFAULT_BITRATE = 8_000_000;
/** Keep the last sampled frame just inside the source's decodable range. */
const END_EPSILON = 0.001;

export interface VideoActionPlan {
  outputDuration: number;
  fps: number;
  /** Source timestamp to decode for each output frame slot, in emit order. */
  sourceTimestamps: number[];
  /** Output timestamp for each frame slot (i / fps). */
  outputTimestamps: number[];
}

/**
 * Compute the frame re-timing plan for an operation — pure math, no decoding.
 * Maps each output frame slot to the source timestamp it should display.
 */
export function computeVideoActionPlan(
  operation: VideoActionOperation,
  params: Record<string, unknown> | undefined,
  sourceDuration: number,
  sourceFps: number
): VideoActionPlan {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    throw new Error("Video has no duration");
  }

  const fps = Math.max(1, Math.min(MAX_OUTPUT_FPS, Math.round(Number.isFinite(sourceFps) && sourceFps > 0 ? sourceFps : FALLBACK_FPS)));
  const resolved = resolveVideoActionParams(operation, params);

  let outputDuration: number;
  let mapToSource: (outputTime: number) => number;

  switch (operation) {
    case "reverse":
      outputDuration = sourceDuration;
      mapToSource = (t) => sourceDuration - t;
      break;
    case "speed": {
      const rate = clampNumber(resolved.rate, SPEED_MIN, SPEED_MAX, 2);
      outputDuration = sourceDuration / rate;
      mapToSource = (t) => t * rate;
      break;
    }
    case "boomerang":
      outputDuration = sourceDuration * 2;
      mapToSource = (t) => (t <= sourceDuration ? t : sourceDuration * 2 - t);
      break;
    case "mute":
      outputDuration = sourceDuration;
      mapToSource = (t) => t;
      break;
    default:
      throw new Error(`Unknown video operation: ${operation}`);
  }

  const totalFrames = Math.max(1, Math.round(outputDuration * fps));
  const sourceTimestamps: number[] = [];
  const outputTimestamps: number[] = [];
  const maxSourceTime = Math.max(0, sourceDuration - END_EPSILON);

  for (let slot = 0; slot < totalFrames; slot++) {
    const outputTime = slot / fps;
    const sourceTime = Math.max(0, Math.min(mapToSource(outputTime), maxSourceTime));
    sourceTimestamps.push(sourceTime);
    outputTimestamps.push(outputTime);
  }

  return { outputDuration, fps, sourceTimestamps, outputTimestamps };
}

const getVideoDimensions = (blob: Blob): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(blob);
  });
};

/**
 * True when this browser can encode with at least one codec the Video
 * Action pipeline supports (H.264/MP4, or VP9/VP8/WebM as fallback for
 * Chromium builds without proprietary codecs).
 */
export async function checkVideoActionSupport(): Promise<boolean> {
  try {
    const { canEncodeVideo } = await import("mediabunny");
    for (const codec of ["avc", "vp9", "vp8"] as const) {
      if (await canEncodeVideo(codec, { width: 1280, height: 720, bitrate: DEFAULT_BITRATE })) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Apply a video operation to a blob and return the re-encoded blob.
 * Same mediabunny pipeline as the ease-curve node: decode frames at the
 * planned source timestamps, re-stamp them, and encode with tier fallback
 * (original → 1080p → 720p). Prefers H.264/MP4; falls back to VP9/VP8
 * WebM on browsers without an H.264 encoder.
 */
export async function applyVideoOperation(
  videoBlob: Blob,
  operation: VideoActionOperation,
  rawParams: Record<string, unknown> | undefined,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const {
    Input, Output, VideoSampleSink, VideoSampleSource,
    BlobSource, ALL_FORMATS, BufferTarget, Mp4OutputFormat, WebMOutputFormat, canEncodeVideo,
  } = await import("mediabunny");
  const { createAvcEncodingConfig, AVC_LEVEL_4_0, AVC_LEVEL_5_1 } = await import("@/lib/video-encoding");

  let input: InstanceType<typeof Input> | null = null;
  let videoSource: InstanceType<typeof VideoSampleSource> | null = null;
  let output: InstanceType<typeof Output> | null = null;
  let outputStarted = false;

  try {
    onProgress?.(5);

    input = new Input({ source: new BlobSource(videoBlob), formats: ALL_FORMATS });
    const videoTracks = await input.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error("No video track found in input");
    }
    const videoTrack = videoTracks[0];
    const rotation = videoTrack.rotation === 90 || videoTrack.rotation === 180 || videoTrack.rotation === 270
      ? videoTrack.rotation
      : 0;

    const [trackDuration, containerDuration, packetStats, dimensions] = await Promise.all([
      videoTrack.computeDuration().catch(() => null),
      input.computeDuration().catch(() => null),
      videoTrack.computePacketStats().catch(() => null),
      getVideoDimensions(videoBlob).catch(() => ({ width: 1920, height: 1080 })),
    ]);

    const sourceDuration =
      typeof trackDuration === "number" && Number.isFinite(trackDuration) && trackDuration > 0
        ? trackDuration
        : typeof containerDuration === "number" && Number.isFinite(containerDuration) && containerDuration > 0
          ? containerDuration
          : 0;
    const sourceFps =
      packetStats?.averagePacketRate && Number.isFinite(packetStats.averagePacketRate)
        ? packetStats.averagePacketRate
        : FALLBACK_FPS;
    let bitrate = DEFAULT_BITRATE;
    if (packetStats?.averageBitrate && Number.isFinite(packetStats.averageBitrate)) {
      bitrate = Math.max(1, Math.floor(Math.max(bitrate, packetStats.averageBitrate)));
    }

    const plan = computeVideoActionPlan(operation, rawParams, sourceDuration, sourceFps);
    onProgress?.(15);

    // Encoder tier fallback, preserving aspect ratio and even dimensions.
    // H.264/MP4 first (High 5.1 at original size, High 4.0 downscaled), then
    // VP9/VP8 WebM for browsers without proprietary codecs.
    const sizeTiers = [
      { maxWidth: dimensions.width, maxHeight: dimensions.height, avcCodec: AVC_LEVEL_5_1 },
      { maxWidth: Math.min(dimensions.width, 1920), maxHeight: Math.min(dimensions.height, 1080), avcCodec: AVC_LEVEL_4_0 },
      { maxWidth: Math.min(dimensions.width, 1280), maxHeight: Math.min(dimensions.height, 720), avcCodec: AVC_LEVEL_4_0 },
    ];
    const fitTier = (tier: { maxWidth: number; maxHeight: number }) => {
      if (tier.maxWidth >= dimensions.width && tier.maxHeight >= dimensions.height) {
        return { width: dimensions.width, height: dimensions.height };
      }
      const scale = Math.min(tier.maxWidth / dimensions.width, tier.maxHeight / dimensions.height);
      return {
        width: Math.round(dimensions.width * scale) & ~1,
        height: Math.round(dimensions.height * scale) & ~1,
      };
    };

    let selected: { codec: "avc" | "vp9" | "vp8"; width: number; height: number; fullCodecString?: string } | null = null;
    outer: for (const codec of ["avc", "vp9", "vp8"] as const) {
      for (const tier of sizeTiers) {
        const { width, height } = fitTier(tier);
        const fullCodecString = codec === "avc" ? tier.avcCodec : undefined;
        const supported = await canEncodeVideo(codec, {
          width, height, bitrate,
          ...(fullCodecString ? { fullCodecString } : {}),
        });
        if (supported) {
          selected = { codec, width, height, fullCodecString };
          break outer;
        }
      }
    }
    if (!selected) {
      throw new Error("This browser has no supported video encoder (H.264, VP9, or VP8).");
    }

    const isAvc = selected.codec === "avc";
    videoSource = new VideoSampleSource(
      isAvc
        ? createAvcEncodingConfig(bitrate, selected.width, selected.height, selected.fullCodecString!, plan.fps)
        : {
            codec: selected.codec,
            bitrate,
            keyFrameInterval: 1,
            latencyMode: "quality",
            sizeChangeBehavior: "cover",
            onEncoderConfig: (config) => {
              config.framerate = plan.fps;
              config.width = selected!.width;
              config.height = selected!.height;
            },
          }
    );
    const bufferTarget = new BufferTarget();
    output = new Output({
      format: isAvc ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
      target: bufferTarget,
    });
    output.addVideoTrack(videoSource, {
      frameRate: plan.fps,
      ...(output.format.supportsVideoRotationMetadata ? { rotation } : {}),
    });
    await output.start();
    outputStarted = true;

    onProgress?.(20);

    const sink = new VideoSampleSink(videoTrack);
    const frameDuration = 1 / plan.fps;
    const totalFrames = plan.sourceTimestamps.length;
    let emitted = 0;

    for await (const sample of sink.samplesAtTimestamps(plan.sourceTimestamps)) {
      if (!sample) {
        emitted++;
        continue;
      }
      const outputSample = sample.clone();
      outputSample.setTimestamp(plan.outputTimestamps[emitted]);
      outputSample.setDuration(frameDuration);
      await videoSource.add(outputSample);
      outputSample.close();
      sample.close();
      emitted++;
      if (emitted % 10 === 0) {
        onProgress?.(20 + (emitted / totalFrames) * 70);
      }
    }

    if (emitted === 0) {
      throw new Error("No frames were decoded from the source video");
    }

    onProgress?.(95);
    await videoSource.close();
    videoSource = null;
    await output.finalize();
    outputStarted = false;
    output = null;

    if (!bufferTarget.buffer) {
      throw new Error("Failed to generate output buffer");
    }
    onProgress?.(100);
    return new Blob([bufferTarget.buffer], { type: isAvc ? "video/mp4" : "video/webm" });
  } finally {
    if (videoSource) {
      try { await videoSource.close(); } catch { /* already closing */ }
    }
    if (output && outputStarted) {
      try { await output.cancel(); } catch { /* already cancelled */ }
    }
    if (input) {
      try { input.dispose(); } catch { /* already disposed */ }
    }
  }
}
