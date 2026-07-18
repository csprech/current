/**
 * GitHub-backed community template repo.
 *
 * Templates live in an ordinary public GitHub repository — an `index.json`
 * at the root listing entries, and the workflow files (shareable exports with
 * an embedded templateInterface) under `templates/`. Files are served over
 * raw.githubusercontent.com (CORS-enabled, no token), and publishing is a
 * pull request against the repo — the PR queue IS the review queue. No
 * hosted service, no lock-in: point COMMUNITY_TEMPLATES_REPO at any
 * "owner/repo" or "owner/repo@branch" to run your own marketplace.
 */

import type { CommunityWorkflowMeta } from "@/types/quickstart";

export interface CommunityRepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export const DEFAULT_COMMUNITY_REPO = "csprech/current-templates";

/** Parse "owner/repo" or "owner/repo@branch" (falls back to the default repo). */
export function parseCommunityRepo(value?: string | null): CommunityRepoRef {
  const raw = (value || DEFAULT_COMMUNITY_REPO).trim();
  const [ownerRepo, branch = "main"] = raw.split("@");
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo) {
    const [defaultOwner, defaultRepo] = DEFAULT_COMMUNITY_REPO.split("/");
    return { owner: defaultOwner, repo: defaultRepo, branch: "main" };
  }
  return { owner, repo, branch };
}

export function resolveCommunityRepo(): CommunityRepoRef {
  return parseCommunityRepo(process.env.COMMUNITY_TEMPLATES_REPO);
}

export function communityRawUrl(ref: CommunityRepoRef, path: string): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${path}`;
}

/** GitHub's drag-drop upload page — non-collaborators get a fork+PR flow automatically. */
export function communitySubmitUrl(ref: CommunityRepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}/upload/${ref.branch}/templates`;
}

export function communityBrowseUrl(ref: CommunityRepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}

/** One entry in the repo's index.json. Only id/name/author/file are required. */
export interface CommunityIndexEntry {
  id: string;
  name: string;
  author: string;
  /** Path of the workflow JSON relative to templates/ (or repo root when prefixed with /). */
  file: string;
  description?: string;
  tags?: string[];
  nodeCount?: number;
  previewImage?: string;
}

export function entryFilePath(entry: CommunityIndexEntry): string {
  return entry.file.startsWith("/") ? entry.file.slice(1) : `templates/${entry.file}`;
}

/** Map an index entry to the meta shape the quickstart UI renders. */
export function toCommunityWorkflowMeta(entry: CommunityIndexEntry): CommunityWorkflowMeta {
  return {
    id: entry.id,
    name: entry.name,
    filename: entryFilePath(entry),
    author: entry.author,
    size: 0,
    description: entry.description ?? "",
    nodeCount: entry.nodeCount ?? 0,
    tags: entry.tags ?? [],
    previewImage: entry.previewImage,
  };
}

/** Parse and validate the repo's index.json payload into usable entries. */
export function parseCommunityIndex(payload: unknown): CommunityIndexEntry[] {
  const templates = (payload as { templates?: unknown })?.templates;
  if (!Array.isArray(templates)) return [];
  return templates.filter(
    (t): t is CommunityIndexEntry =>
      !!t &&
      typeof (t as CommunityIndexEntry).id === "string" &&
      typeof (t as CommunityIndexEntry).name === "string" &&
      typeof (t as CommunityIndexEntry).author === "string" &&
      typeof (t as CommunityIndexEntry).file === "string"
  );
}
