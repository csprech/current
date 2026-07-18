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

/**
 * GET: resolve a community template id to its raw.githubusercontent.com URL.
 *
 * Returns { success: true, downloadUrl } so the client downloads the workflow
 * file straight from GitHub's CDN (CORS-enabled) instead of proxying
 * potentially large files through the server — the same two-step contract the
 * quickstart UI has always used.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const repo = resolveCommunityRepo();

  try {
    const { id } = await params;

    const response = await fetch(communityRawUrl(repo, "index.json"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Community template index unavailable" },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const entries = parseCommunityIndex(await response.json());
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: `Template not found: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      downloadUrl: communityRawUrl(repo, entryFilePath(entry)),
    });
  } catch (error) {
    console.error("Error resolving community template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load template" },
      { status: 502 }
    );
  }
}
