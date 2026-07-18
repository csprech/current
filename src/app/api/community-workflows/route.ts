import { NextResponse } from "next/server";
import {
  resolveCommunityRepo,
  communityRawUrl,
  communitySubmitUrl,
  communityBrowseUrl,
  parseCommunityIndex,
  toCommunityWorkflowMeta,
} from "@/lib/templates/communityRepo";

/**
 * GET: list community templates from the GitHub-backed repo.
 *
 * Reads index.json from raw.githubusercontent.com — no hosted service, no
 * token. A missing repo or index is a normal state (the marketplace just has
 * nothing in it yet), reported as an empty list rather than an error. The
 * response includes the repo source so the client can link to browsing and
 * PR-based publishing.
 */
export async function GET() {
  const repo = resolveCommunityRepo();
  const source = {
    repo: `${repo.owner}/${repo.repo}`,
    branch: repo.branch,
    browseUrl: communityBrowseUrl(repo),
    submitUrl: communitySubmitUrl(repo),
  };

  try {
    const response = await fetch(communityRawUrl(repo, "index.json"), {
      headers: { Accept: "application/json" },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (response.status === 404) {
      return NextResponse.json({ success: true, workflows: [], source });
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Community repo responded with ${response.status}`, source },
        { status: 502 }
      );
    }

    const entries = parseCommunityIndex(await response.json());
    return NextResponse.json({
      success: true,
      workflows: entries.map(toCommunityWorkflowMeta),
      source,
    });
  } catch (error) {
    console.error("Error listing community templates:", error);
    return NextResponse.json(
      { success: false, error: "Could not reach the community template repo", source },
      { status: 502 }
    );
  }
}
