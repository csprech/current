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
});
