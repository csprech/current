import type { AspectRatio, ModelType, Resolution } from "@/types";

export const BASE_ASPECT_RATIOS: readonly AspectRatio[] = [
  "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9",
];

export const EXTENDED_ASPECT_RATIOS: readonly AspectRatio[] = [
  "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9",
];

export const RESOLUTIONS_PRO: readonly Resolution[] = ["1K", "2K", "4K"];
export const RESOLUTIONS_NB2: readonly Resolution[] = ["512", "1K", "2K", "4K"];

export const GEMINI_IMAGE_MODELS: readonly { value: ModelType; label: string }[] = [
  { value: "nano-banana", label: "Nano Banana" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
];

export function isNanoBananaModel(value: unknown): value is ModelType {
  return typeof value === "string" && GEMINI_IMAGE_MODELS.some((model) => model.value === value);
}

export function getNanoBananaAspectRatios(model: ModelType): readonly AspectRatio[] {
  return model === "nano-banana-2" ? EXTENDED_ASPECT_RATIOS : BASE_ASPECT_RATIOS;
}

export function getNanoBananaResolutions(model: ModelType): readonly Resolution[] {
  if (model === "nano-banana-2") return RESOLUTIONS_NB2;
  if (model === "nano-banana-pro") return RESOLUTIONS_PRO;
  return [];
}

export function supportsGoogleSearch(model: ModelType): boolean {
  return model === "nano-banana-pro" || model === "nano-banana-2";
}

export function supportsImageSearch(model: ModelType): boolean {
  return model === "nano-banana-2";
}
