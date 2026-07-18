/**
 * Local image operations for the Image Action node.
 *
 * Every operation runs on-device via canvas — no API call, no cost.
 * Operations take base64/data-URL images and return a PNG data URL.
 */

export type ImageActionOperation =
  | "rotate"
  | "flip"
  | "grayscale"
  | "blur"
  | "adjust"
  | "canny"
  | "resizeAspect"
  | "sideBySide"
  | "addText";

export interface ImageActionOptionDef {
  key: string;
  label: string;
  type: "select" | "number" | "text" | "color";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number;
}

export interface ImageActionDef {
  operation: ImageActionOperation;
  label: string;
  /** How many input images the operation consumes. */
  imageCount: 1 | 2;
  options: ImageActionOptionDef[];
}

export const ASPECT_RATIO_OPTIONS = [
  "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9",
] as const;

/** Catalog of operations: drives both the node UI and parameter validation. */
export const IMAGE_ACTIONS: ImageActionDef[] = [
  {
    operation: "rotate",
    label: "Rotate",
    imageCount: 1,
    options: [
      {
        key: "angle", label: "Angle", type: "select", default: "90",
        options: [
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180°" },
          { value: "270", label: "90° counter-clockwise" },
        ],
      },
    ],
  },
  {
    operation: "flip",
    label: "Flip",
    imageCount: 1,
    options: [
      {
        key: "direction", label: "Direction", type: "select", default: "horizontal",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
    ],
  },
  { operation: "grayscale", label: "Grayscale", imageCount: 1, options: [] },
  {
    operation: "blur",
    label: "Blur",
    imageCount: 1,
    options: [
      { key: "radius", label: "Radius (px)", type: "number", min: 1, max: 50, step: 1, default: 8 },
    ],
  },
  {
    operation: "adjust",
    label: "Adjust colors",
    imageCount: 1,
    options: [
      { key: "brightness", label: "Brightness", type: "number", min: -100, max: 100, step: 5, default: 0 },
      { key: "contrast", label: "Contrast", type: "number", min: -100, max: 100, step: 5, default: 0 },
      { key: "saturation", label: "Saturation", type: "number", min: -100, max: 100, step: 5, default: 0 },
    ],
  },
  {
    operation: "canny",
    label: "Edge detect (Canny)",
    imageCount: 1,
    options: [
      { key: "lowThreshold", label: "Low threshold", type: "number", min: 1, max: 254, step: 1, default: 100 },
      { key: "highThreshold", label: "High threshold", type: "number", min: 2, max: 255, step: 1, default: 200 },
    ],
  },
  {
    operation: "resizeAspect",
    label: "Change aspect ratio",
    imageCount: 1,
    options: [
      {
        key: "aspectRatio", label: "Aspect ratio", type: "select", default: "1:1",
        options: ASPECT_RATIO_OPTIONS.map((ar) => ({ value: ar, label: ar })),
      },
      {
        key: "mode", label: "Mode", type: "select", default: "crop",
        options: [
          { value: "crop", label: "Crop to fill" },
          { value: "pad", label: "Pad (letterbox)" },
        ],
      },
      { key: "padColor", label: "Pad color", type: "color", default: "#000000" },
    ],
  },
  {
    operation: "sideBySide",
    label: "Side by side",
    imageCount: 2,
    options: [
      {
        key: "direction", label: "Direction", type: "select", default: "horizontal",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
      { key: "gap", label: "Gap (px)", type: "number", min: 0, max: 64, step: 2, default: 0 },
    ],
  },
  {
    operation: "addText",
    label: "Add text",
    imageCount: 1,
    options: [
      { key: "text", label: "Text", type: "text", default: "" },
      {
        key: "position", label: "Position", type: "select", default: "bottom",
        options: [
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" },
        ],
      },
      { key: "size", label: "Size (% of height)", type: "number", min: 2, max: 20, step: 1, default: 7 },
      { key: "color", label: "Color", type: "color", default: "#ffffff" },
    ],
  },
];

export const IMAGE_ACTIONS_BY_OPERATION = new Map(IMAGE_ACTIONS.map((a) => [a.operation, a]));

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function selectValue(value: unknown, def: ImageActionOptionDef): string {
  const allowed = (def.options ?? []).map((o) => o.value);
  return typeof value === "string" && allowed.includes(value) ? value : String(def.default);
}

/** Resolve raw node params against an operation's option definitions. */
export function resolveActionParams(
  operation: ImageActionOperation,
  raw: Record<string, unknown> | undefined
): Record<string, string | number> {
  const def = IMAGE_ACTIONS_BY_OPERATION.get(operation);
  const resolved: Record<string, string | number> = {};
  if (!def) return resolved;
  for (const option of def.options) {
    const value = raw?.[option.key];
    if (option.type === "number") {
      resolved[option.key] = clampNumber(value, option.min ?? -Infinity, option.max ?? Infinity, option.default as number);
    } else if (option.type === "select") {
      resolved[option.key] = selectValue(value, option);
    } else {
      resolved[option.key] = typeof value === "string" ? value : String(option.default);
    }
  }
  return resolved;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load input image"));
    img.src = src;
  });
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return { canvas, ctx };
}

function parseAspect(aspect: string): number {
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) return 1;
  return w / h;
}

/** Minimal pixel-buffer shape shared with ImageData so the kernel is testable headlessly. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Full Canny edge detector on RGBA pixels: grayscale → 5×5 gaussian →
 * Sobel gradients → non-maximum suppression → double threshold with
 * hysteresis. Returns the ControlNet-standard map: white edges on black.
 * Pure and canvas-free so it runs (and tests) anywhere.
 */
export function cannyEdges(source: PixelBuffer, lowThreshold: number, highThreshold: number): PixelBuffer {
  const { width, height } = source;
  const size = width * height;
  const low = Math.min(lowThreshold, highThreshold);
  const high = Math.max(lowThreshold, highThreshold);

  // 1. Grayscale (Rec. 601 luma)
  const gray = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const o = i * 4;
    gray[i] = 0.299 * source.data[o] + 0.587 * source.data[o + 1] + 0.114 * source.data[o + 2];
  }

  // 2. 5×5 gaussian blur (σ≈1.4), edges clamped
  const G = [2, 4, 5, 4, 2, 4, 9, 12, 9, 4, 5, 12, 15, 12, 5, 4, 9, 12, 9, 4, 2, 4, 5, 4, 2];
  const blurred = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let ky = -2; ky <= 2; ky++) {
        const sy = Math.min(height - 1, Math.max(0, y + ky));
        for (let kx = -2; kx <= 2; kx++) {
          const sx = Math.min(width - 1, Math.max(0, x + kx));
          acc += gray[sy * width + sx] * G[(ky + 2) * 5 + (kx + 2)];
        }
      }
      blurred[y * width + x] = acc / 159;
    }
  }

  // 3. Sobel gradients (magnitude + direction)
  const magnitude = new Float32Array(size);
  const direction = new Float32Array(size);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = blurred[i - width - 1], t = blurred[i - width], tr = blurred[i - width + 1];
      const l = blurred[i - 1], r = blurred[i + 1];
      const bl = blurred[i + width - 1], b = blurred[i + width], br = blurred[i + width + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      magnitude[i] = Math.hypot(gx, gy);
      direction[i] = Math.atan2(gy, gx);
    }
  }

  // 4. Non-maximum suppression along the quantized gradient direction
  const thinned = new Float32Array(size);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const mag = magnitude[i];
      if (mag === 0) continue;
      // Quantize direction to one of 4 sectors (0°, 45°, 90°, 135°)
      const angle = ((direction[i] * 180) / Math.PI + 180) % 180;
      let n1: number, n2: number;
      if (angle < 22.5 || angle >= 157.5) {
        n1 = magnitude[i - 1]; n2 = magnitude[i + 1];
      } else if (angle < 67.5) {
        n1 = magnitude[i - width + 1]; n2 = magnitude[i + width - 1];
      } else if (angle < 112.5) {
        n1 = magnitude[i - width]; n2 = magnitude[i + width];
      } else {
        n1 = magnitude[i - width - 1]; n2 = magnitude[i + width + 1];
      }
      if (mag >= n1 && mag >= n2) thinned[i] = mag;
    }
  }

  // 5. Double threshold + hysteresis: strong edges seed, weak edges join if connected
  const STRONG = 2, WEAK = 1;
  const marks = new Uint8Array(size);
  const stack: number[] = [];
  for (let i = 0; i < size; i++) {
    if (thinned[i] >= high) {
      marks[i] = STRONG;
      stack.push(i);
    } else if (thinned[i] >= low) {
      marks[i] = WEAK;
    }
  }
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % width, y = (i - x) / width;
    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const nx = x + kx, ny = y + ky;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (marks[n] === WEAK) {
          marks[n] = STRONG;
          stack.push(n);
        }
      }
    }
  }

  // 6. Render: white edge pixels on black
  const out = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i++) {
    const v = marks[i] === STRONG ? 255 : 0;
    const o = i * 4;
    out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
  }
  return { data: out, width, height };
}

/**
 * Apply an image operation. `images` come from the node's connected inputs in
 * connection order; most operations use the first, sideBySide uses two.
 */
export async function applyImageOperation(
  images: string[],
  operation: ImageActionOperation,
  rawParams: Record<string, unknown> | undefined
): Promise<string> {
  const def = IMAGE_ACTIONS_BY_OPERATION.get(operation);
  if (!def) throw new Error(`Unknown image operation: ${operation}`);
  if (images.length < def.imageCount) {
    throw new Error(
      def.imageCount === 2
        ? "Side by side needs two connected images"
        : "Connect an image input first"
    );
  }

  const params = resolveActionParams(operation, rawParams);
  const first = await loadImage(images[0]);

  switch (operation) {
    case "rotate": {
      const angle = Number(params.angle);
      const swap = angle === 90 || angle === 270;
      const { canvas, ctx } = makeCanvas(swap ? first.height : first.width, swap ? first.width : first.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(first, -first.width / 2, -first.height / 2);
      return canvas.toDataURL("image/png");
    }

    case "flip": {
      const { canvas, ctx } = makeCanvas(first.width, first.height);
      if (params.direction === "vertical") {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      } else {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(first, 0, 0);
      return canvas.toDataURL("image/png");
    }

    case "grayscale":
    case "blur":
    case "adjust": {
      const { canvas, ctx } = makeCanvas(first.width, first.height);
      if (operation === "grayscale") {
        ctx.filter = "grayscale(100%)";
      } else if (operation === "blur") {
        ctx.filter = `blur(${params.radius}px)`;
      } else {
        const b = 100 + Number(params.brightness);
        const c = 100 + Number(params.contrast);
        const s = 100 + Number(params.saturation);
        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
      }
      ctx.drawImage(first, 0, 0);
      return canvas.toDataURL("image/png");
    }

    case "canny": {
      const { canvas, ctx } = makeCanvas(first.width, first.height);
      ctx.drawImage(first, 0, 0);
      const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const edges = cannyEdges(
        { data: source.data, width: source.width, height: source.height },
        Number(params.lowThreshold),
        Number(params.highThreshold)
      );
      const output = ctx.createImageData(edges.width, edges.height);
      output.data.set(edges.data);
      ctx.putImageData(output, 0, 0);
      return canvas.toDataURL("image/png");
    }

    case "resizeAspect": {
      const targetAspect = parseAspect(String(params.aspectRatio));
      const sourceAspect = first.width / first.height;
      if (params.mode === "pad") {
        const width = sourceAspect >= targetAspect ? first.width : first.height * targetAspect;
        const height = sourceAspect >= targetAspect ? first.width / targetAspect : first.height;
        const { canvas, ctx } = makeCanvas(width, height);
        ctx.fillStyle = String(params.padColor);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(first, (canvas.width - first.width) / 2, (canvas.height - first.height) / 2);
        return canvas.toDataURL("image/png");
      }
      // crop to fill
      const width = sourceAspect >= targetAspect ? first.height * targetAspect : first.width;
      const height = sourceAspect >= targetAspect ? first.height : first.width / targetAspect;
      const { canvas, ctx } = makeCanvas(width, height);
      ctx.drawImage(first, (canvas.width - first.width) / 2, (canvas.height - first.height) / 2);
      return canvas.toDataURL("image/png");
    }

    case "sideBySide": {
      const second = await loadImage(images[1]);
      const gap = Number(params.gap);
      if (params.direction === "vertical") {
        const width = Math.max(first.width, second.width);
        const { canvas, ctx } = makeCanvas(width, first.height + gap + second.height);
        ctx.drawImage(first, (width - first.width) / 2, 0);
        ctx.drawImage(second, (width - second.width) / 2, first.height + gap);
        return canvas.toDataURL("image/png");
      }
      const height = Math.max(first.height, second.height);
      const { canvas, ctx } = makeCanvas(first.width + gap + second.width, height);
      ctx.drawImage(first, 0, (height - first.height) / 2);
      ctx.drawImage(second, first.width + gap, (height - second.height) / 2);
      return canvas.toDataURL("image/png");
    }

    case "addText": {
      const text = String(params.text).trim();
      if (!text) throw new Error("Enter the text to add");
      const { canvas, ctx } = makeCanvas(first.width, first.height);
      ctx.drawImage(first, 0, 0);
      const fontSize = Math.max(8, Math.round((first.height * Number(params.size)) / 100));
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = String(params.color);
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = Math.max(1, fontSize / 12);
      const x = canvas.width / 2;
      const y =
        params.position === "top"
          ? fontSize * 1.4
          : params.position === "center"
            ? canvas.height / 2 + fontSize / 3
            : canvas.height - fontSize * 0.8;
      ctx.strokeText(text, x, y, canvas.width * 0.94);
      ctx.fillText(text, x, y, canvas.width * 0.94);
      return canvas.toDataURL("image/png");
    }
  }
}
