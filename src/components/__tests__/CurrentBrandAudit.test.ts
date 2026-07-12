// @vitest-environment node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AUDIT_ROOTS = ["src", "public"];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".svg", ".ts", ".tsx"]);
const LEGACY_TERMS = [
  ["ir", "is-"].join(""),
  ["Node", "Banana"].join(" "),
  ["node", "banana.png"].join("-"),
  ["banana", "icon"].join("_"),
];
// Red remains available for destructive/error semantics. Success and warning must use
// their named Current variables; user-authored color values are data, not source chrome.
const RETIRED_CATEGORY_ACCENTS = /(?:lime|violet|purple|pink|fuchsia|orange|yellow|green|emerald|amber|cyan|teal|rose)-(?:[1-9]00|50)/i;
const RETIRED_HARDCODED_ACCENTS = /#bef264|rgb\(167,\s*139,\s*250\)|rgb\(251,\s*191,\s*36\)/i;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

function isTextSource(path: string): boolean {
  const extension = path.slice(path.lastIndexOf("."));
  return TEXT_EXTENSIONS.has(extension);
}

describe("Current brand source audit", () => {
  it("contains no retired visual or product identity references", () => {
    const matches = AUDIT_ROOTS.flatMap((root) => {
      const directory = join(ROOT, root);
      return sourceFiles(directory).filter(isTextSource).flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return LEGACY_TERMS.some((term) => source.toLowerCase().includes(term.toLowerCase()))
          ? [relative(ROOT, path)]
          : [];
      });
    });

    expect(matches).toEqual([]);
  });

  it("keeps product category chrome within the Current cool-color system", () => {
    const componentRoot = join(ROOT, "src/components");
    const matches = sourceFiles(componentRoot)
      .filter((path) => isTextSource(path) && !path.includes("/__tests__/"))
      .flatMap((path) => {
        const relativePath = relative(ROOT, path);
        const source = readFileSync(path, "utf8");
        return RETIRED_CATEGORY_ACCENTS.test(source) || RETIRED_HARDCODED_ACCENTS.test(source)
          ? [relativePath]
          : [];
      });

    expect(matches).toEqual([]);
  });
});
