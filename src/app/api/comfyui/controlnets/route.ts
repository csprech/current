/**
 * GET /api/comfyui/controlnets — ControlNet models installed in the local
 * ComfyUI daemon, plus whether a depth preprocessor (comfyui_controlnet_aux)
 * is available. Drives the ControlNet section of the image node's settings.
 * An absent daemon returns success:false with a hint, never an error status.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchComfyUIControlNets,
  detectDepthPreprocessor,
  resolveComfyUIBaseUrl,
  comfyUIUnreachableError,
} from "../../generate/providers/comfyui";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const baseUrl = resolveComfyUIBaseUrl(request.headers.get("X-ComfyUI-URL"));

  try {
    const [controlnets, depthPreprocessor] = await Promise.all([
      fetchComfyUIControlNets(baseUrl),
      detectDepthPreprocessor(baseUrl),
    ]);
    return NextResponse.json({ success: true, controlnets, depthPreprocessor });
  } catch {
    return NextResponse.json({
      success: false,
      controlnets: [],
      depthPreprocessor: null,
      error: comfyUIUnreachableError(baseUrl),
    });
  }
}
