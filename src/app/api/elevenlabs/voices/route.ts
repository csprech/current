/**
 * GET /api/elevenlabs/voices — the account's voice list for the TTS voice
 * picker. BYO-key: the key comes from the X-ElevenLabs-Key header or the
 * server env. A missing key or unreachable API reports success:false with a
 * hint rather than an error status.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchElevenLabsVoices } from "../../generate/providers/elevenlabs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-ElevenLabs-Key") || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      voices: [],
      error: "Add your ElevenLabs API key in Settings to pick a voice.",
    });
  }

  try {
    const voices = await fetchElevenLabsVoices(apiKey);
    return NextResponse.json({ success: true, voices });
  } catch (error) {
    return NextResponse.json({
      success: false,
      voices: [],
      error: error instanceof Error ? error.message : "Could not load ElevenLabs voices",
    });
  }
}
