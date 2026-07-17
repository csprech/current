import { resolveOutputMedia } from "./outputMedia";

/**
 * Resolve a copyable still-image source (data URL or fetchable path) from a
 * node's data, by node type. Returns null for types without an image output.
 */
export function getNodeImageSource(type: string | undefined, data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const pick = (key: string): string | null =>
    typeof record[key] === "string" && record[key] ? (record[key] as string) : null;

  switch (type) {
    case "imageInput":
      return pick("image");
    case "output": {
      const media = resolveOutputMedia(data);
      return media?.type === "image" ? media.src : null;
    }
    case "nanoBanana":
    case "annotation":
    case "removeBackground":
    case "videoFrameGrab":
      return pick("outputImage");
    default:
      return null;
  }
}

async function convertBlobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error("PNG conversion failed"))),
        "image/png"
      );
    });
  } finally {
    bitmap.close();
  }
}

/**
 * Copy an image (data URL or fetchable path) to the OS clipboard.
 * Browsers only accept PNG on the async clipboard, so other formats are converted.
 */
export async function copyImageToClipboard(src: string): Promise<void> {
  const blob = await (await fetch(src)).blob();
  const pngBlob = blob.type === "image/png" ? blob : await convertBlobToPng(blob);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
}
