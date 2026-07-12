// @vitest-environment node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "@babel/parser";
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
const UNDERSIZED_BUTTON = /(?:^|\s)(?:w|h)-(?:[1-6])(?:\s|$)/;
const CURRENT_ACTION_TARGET = /current-(?:icon-button|media-action|toolbar-action)/;

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

type AstNode = {
  type?: string;
  start?: number | null;
  end?: number | null;
  loc?: { start: { line: number } } | null;
  [key: string]: unknown;
};

function walkAst(value: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(value)) {
    value.forEach((item) => walkAst(item, visit));
    return;
  }
  if (!value || typeof value !== "object") return;
  const node = value as AstNode;
  if (typeof node.type !== "string") return;
  visit(node);
  Object.entries(node).forEach(([key, child]) => {
    if (key !== "loc" && key !== "start" && key !== "end") walkAst(child, visit);
  });
}

function jsxElementName(node: AstNode): string | null {
  const opening = node.openingElement as AstNode | undefined;
  const name = opening?.name as AstNode | undefined;
  return name?.type === "JSXIdentifier" && typeof name.name === "string" ? name.name : null;
}

function containsSvg(value: unknown): boolean {
  let found = false;
  walkAst(value, (node) => {
    if (node.type === "JSXElement" && jsxElementName(node) === "svg") found = true;
  });
  return found;
}

function hasVisibleNonIconContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasVisibleNonIconContent);
  if (!value || typeof value !== "object") return false;
  const node = value as AstNode;
  if (node.type === "JSXText") return typeof node.value === "string" && node.value.trim().length > 0;
  if (node.type === "JSXExpressionContainer") {
    const expression = node.expression as AstNode | undefined;
    return expression?.type !== "JSXEmptyExpression";
  }
  if (node.type === "JSXElement") {
    if (jsxElementName(node) === "svg") return false;
    return hasVisibleNonIconContent(node.children);
  }
  return false;
}

function findIconControlViolations(source: string, file = "fixture.tsx"): string[] {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const violations: string[] = [];

  walkAst(ast, (node) => {
    if (node.type !== "JSXElement" || jsxElementName(node) !== "button") return;
    const opening = node.openingElement as AstNode;
    const children = node.children;
    if (!containsSvg(children) || hasVisibleNonIconContent(children)) return;

    const attributes = (opening.attributes as AstNode[] | undefined) ?? [];
    const isNamed = attributes.some((attribute) => {
      const name = attribute.name as AstNode | undefined;
      return attribute.type === "JSXAttribute" && name?.name === "aria-label";
    });
    const openingSource = source.slice(opening.start ?? 0, opening.end ?? 0);
    const isSmall = UNDERSIZED_BUTTON.test(openingSource);
    const usesCurrentTarget = CURRENT_ACTION_TARGET.test(openingSource);
    if (isNamed && (!isSmall || usesCurrentTarget)) return;
    violations.push(`${file}:${opening.loc?.start.line ?? 1}`);
  });

  return violations;
}

describe("icon control source scanner", () => {
  it("keeps a self-closing button separate from the paired button that follows it", () => {
    const source = `const view = <>
  <button aria-label="Add" className="current-icon-button" />
  <button className="current-icon-button"><svg /></button>
</>`;

    expect(findIconControlViolations(source)).toEqual(["fixture.tsx:3"]);
  });

  it("reports an icon-only button without an accessible name or title", () => {
    const source = `<button className="current-icon-button"><svg /></button>`;

    expect(findIconControlViolations(source)).toEqual(["fixture.tsx:1"]);
  });
});

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

  it("gives every icon-only button a name and every small icon button a Current action target", () => {
    const componentRoot = join(ROOT, "src/components");
    const violations = sourceFiles(componentRoot)
      .filter((path) => path.endsWith(".tsx") && !path.includes("/__tests__/"))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return findIconControlViolations(source, relative(ROOT, path));
      });

    expect(violations).toEqual([]);
  });
});
