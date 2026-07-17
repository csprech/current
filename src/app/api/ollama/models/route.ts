/**
 * GET /api/ollama/models — list models the local Ollama daemon has pulled.
 *
 * Proxies GET {base}/api/tags so the browser (and any integration) can
 * discover local models without CORS friction. The daemon URL comes from the
 * X-Ollama-URL header, the OLLAMA_URL env var, or the localhost default.
 * Unreachable daemons return success:false with a friendly hint rather than
 * an error status — an absent Ollama is a normal state, not a failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveOllamaBaseUrl } from "../../llm/route";

export const dynamic = "force-dynamic";

interface OllamaTag {
  name: string;
  model?: string;
  size?: number;
  details?: { parameter_size?: string };
}

export async function GET(request: NextRequest) {
  const baseUrl = resolveOllamaBaseUrl(request.headers.get("X-Ollama-URL"));

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        models: [],
        error: `Ollama at ${baseUrl} responded with ${response.status}`,
      });
    }
    const data = (await response.json()) as { models?: OllamaTag[] };
    const models = (data.models ?? []).map((m) => ({
      id: m.name,
      name: m.name,
      parameterSize: m.details?.parameter_size ?? null,
    }));
    return NextResponse.json({ success: true, models });
  } catch {
    return NextResponse.json({
      success: false,
      models: [],
      error: `Could not reach Ollama at ${baseUrl}. Start it with \`ollama serve\`.`,
    });
  }
}
