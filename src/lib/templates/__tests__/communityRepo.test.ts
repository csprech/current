import { describe, it, expect } from "vitest";
import {
  parseCommunityRepo,
  communityRawUrl,
  communitySubmitUrl,
  communityBrowseUrl,
  parseCommunityIndex,
  toCommunityWorkflowMeta,
  entryFilePath,
  DEFAULT_COMMUNITY_REPO,
} from "@/lib/templates/communityRepo";

describe("parseCommunityRepo", () => {
  it("parses owner/repo with the default branch", () => {
    expect(parseCommunityRepo("acme/flows")).toEqual({ owner: "acme", repo: "flows", branch: "main" });
  });

  it("parses an explicit branch after @", () => {
    expect(parseCommunityRepo("acme/flows@staging")).toEqual({ owner: "acme", repo: "flows", branch: "staging" });
  });

  it("falls back to the default repo on missing or malformed values", () => {
    const fallback = parseCommunityRepo(undefined);
    expect(`${fallback.owner}/${fallback.repo}`).toBe(DEFAULT_COMMUNITY_REPO);
    expect(parseCommunityRepo("justarepo")).toMatchObject({ branch: "main" });
    expect(`${parseCommunityRepo("justarepo").owner}/${parseCommunityRepo("justarepo").repo}`).toBe(DEFAULT_COMMUNITY_REPO);
  });
});

describe("community URLs", () => {
  const ref = { owner: "acme", repo: "flows", branch: "main" };

  it("builds raw, submit, and browse URLs", () => {
    expect(communityRawUrl(ref, "index.json")).toBe("https://raw.githubusercontent.com/acme/flows/main/index.json");
    expect(communitySubmitUrl(ref)).toBe("https://github.com/acme/flows/upload/main/templates");
    expect(communityBrowseUrl(ref)).toBe("https://github.com/acme/flows");
  });
});

describe("parseCommunityIndex", () => {
  it("keeps only entries with the required fields", () => {
    const entries = parseCommunityIndex({
      templates: [
        { id: "a", name: "A", author: "ann", file: "a.json" },
        { id: "b", name: "B" }, // missing author + file
        "garbage",
        { id: "c", name: "C", author: "cy", file: "/custom/c.json", tags: ["video"] },
      ],
    });
    expect(entries.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("returns empty for malformed payloads", () => {
    expect(parseCommunityIndex(null)).toEqual([]);
    expect(parseCommunityIndex({})).toEqual([]);
    expect(parseCommunityIndex({ templates: "nope" })).toEqual([]);
  });
});

describe("entry mapping", () => {
  it("resolves files relative to templates/ unless absolute", () => {
    expect(entryFilePath({ id: "a", name: "A", author: "x", file: "a.json" })).toBe("templates/a.json");
    expect(entryFilePath({ id: "b", name: "B", author: "x", file: "/root/b.json" })).toBe("root/b.json");
  });

  it("maps index entries to the quickstart meta shape with defaults", () => {
    expect(
      toCommunityWorkflowMeta({ id: "a", name: "A", author: "ann", file: "a.json", description: "d" })
    ).toEqual({
      id: "a",
      name: "A",
      filename: "templates/a.json",
      author: "ann",
      size: 0,
      description: "d",
      nodeCount: 0,
      tags: [],
      previewImage: undefined,
    });
  });
});
