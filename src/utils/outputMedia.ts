export type OutputMediaType = "image" | "video" | "audio";

export interface OutputMediaValue {
  type: OutputMediaType;
  src: string;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Shared media resolution contract for Output node surfaces. */
export function resolveOutputMedia(data: unknown): OutputMediaValue | null {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const audio = stringValue(record.audio);
  const video = stringValue(record.video);
  const image = stringValue(record.image);
  const contentType = record.contentType;
  const src = audio || video || image;
  if (!src) return null;

  if (audio || contentType === "audio" || image?.startsWith("data:audio/")) return { type: "audio", src };
  if (video || contentType === "video" || image?.startsWith("data:video/") || image?.includes(".mp4") || image?.includes(".webm")) {
    return { type: "video", src };
  }
  return { type: "image", src };
}
