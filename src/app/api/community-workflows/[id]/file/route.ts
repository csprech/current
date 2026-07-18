import { NextResponse } from "next/server";
import {
  resolveCommunityRepo,
  communityRawUrl,
  parseCommunityIndex,
  entryFilePath,
} from "@/lib/templates/communityRepo";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Templates are JSON with optional inline media; cap the relay well below
// anything reasonable so this can't be used to funnel huge blobs.
const MAX_TEMPLATE_BYTES = 100 * 1024 * 1024;

/**
 * GET: server-side relay for a community template file.
 *
 * The primary download path is the browser fetching raw.githubusercontent.com
 * directly (CORS-open, no server load). Some networks block that host — this
 * relay is the fallback the client uses when the direct fetch fails, keeping
 * the marketplace usable behind restrictive proxies.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const repo = resolveCommunityRepo();

  try {
    const { id } = await params;

    const indexResponse = await fetch(communityRawUrl(repo, "index.json"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!indexResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Community template index unavailable" },
        { status: indexResponse.status === 404 ? 404 : 502 }
      );
    }

    const entry = parseCommunityIndex(await indexResponse.json()).find((e) => e.id === id);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: `Template not found: ${id}` },
        { status: 404 }
      );
    }

    const fileResponse = await fetch(communityRawUrl(repo, entryFilePath(entry)));
    if (!fileResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Template file unavailable (${fileResponse.status})` },
        { status: 502 }
      );
    }

    const contentLength = parseInt(fileResponse.headers.get("content-length") || "0", 10);
    if (!isNaN(contentLength) && contentLength > MAX_TEMPLATE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Template file too large to relay" },
        { status: 502 }
      );
    }

    const body = await fileResponse.arrayBuffer();
    if (body.byteLength > MAX_TEMPLATE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Template file too large to relay" },
        { status: 502 }
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error relaying community template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load template" },
      { status: 502 }
    );
  }
}
