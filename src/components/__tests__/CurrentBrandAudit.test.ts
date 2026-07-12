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
const CURRENT_ACTION_TARGET = /current-(?:icon-button|media-action|toolbar-action|node-header__more)/;

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
    return expressionProvidesVisibleContent(node.expression);
  }
  if (node.type === "JSXElement") {
    const name = jsxElementName(node);
    if (name === "svg") return false;
    if (name === "img" || name === "video" || name === "audio" || name === "canvas") return true;
    return hasVisibleNonIconContent(node.children);
  }
  if (node.type === "JSXFragment") return hasVisibleNonIconContent(node.children);
  return false;
}

function expressionProvidesVisibleContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(expressionProvidesVisibleContent);
  if (!value || typeof value !== "object") return false;
  const node = value as AstNode;
  switch (node.type) {
    case "JSXEmptyExpression":
    case "NullLiteral":
    case "BooleanLiteral":
      return false;
    case "StringLiteral":
      return typeof node.value === "string" && node.value.trim().length > 0;
    case "NumericLiteral":
    case "BigIntLiteral":
      return true;
    case "JSXElement":
    case "JSXFragment":
      return hasVisibleNonIconContent(node);
    case "ConditionalExpression":
      return expressionProvidesVisibleContent(node.consequent) || expressionProvidesVisibleContent(node.alternate);
    case "LogicalExpression":
      return expressionProvidesVisibleContent(node.right);
    case "ArrayExpression":
      return expressionProvidesVisibleContent(node.elements);
    case "TSAsExpression":
    case "TSTypeAssertion":
    case "TSNonNullExpression":
    case "ParenthesizedExpression":
      return expressionProvidesVisibleContent(node.expression);
    case "TemplateLiteral": {
      const quasis = (node.quasis as AstNode[] | undefined) ?? [];
      const hasText = quasis.some((quasi) => {
        const cooked = (quasi.value as { cooked?: unknown } | undefined)?.cooked;
        return typeof cooked === "string" && cooked.trim().length > 0;
      });
      return hasText || expressionProvidesVisibleContent(node.expressions);
    }
    default:
      // Identifiers, calls, and member expressions commonly render dynamic labels.
      // Treat them as visible unless their syntax proves they only select elements.
      return true;
  }
}

function lengthInPixels(raw: string, unitlessIsPixels = false): number | null {
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(px|rem)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (match[2] === "rem") return value * 16;
  if (match[2] === "px" || unitlessIsPixels) return value;
  return null;
}

function tailwindDimension(openingSource: string, axis: "w" | "h"): number | null {
  const arbitrary = openingSource.match(new RegExp(`(?:^|[\\s\"'\\\`])${axis}-\\[([^\\]]+)\\]`));
  if (arbitrary) return lengthInPixels(arbitrary[1]);
  const scaled = openingSource.match(new RegExp(`(?:^|[\\s\"'\\\`])${axis}-(\\d+(?:\\.\\d+)?)(?=[\\s\"'\\\`}])`));
  return scaled ? Number(scaled[1]) * 4 : null;
}

function inlineStyleDimension(openingSource: string, property: "width" | "height"): number | null {
  const match = openingSource.match(
    new RegExp(`\\b${property}\\s*:\\s*(?:\"([^\"]+)\"|'([^']+)'|(\\d+(?:\\.\\d+)?))`)
  );
  if (!match) return null;
  return lengthInPixels(match[1] ?? match[2] ?? match[3], Boolean(match[3]));
}

function hasApprovedTarget(openingSource: string): boolean {
  if (CURRENT_ACTION_TARGET.test(openingSource)) return true;

  const arbitrarySize = openingSource.match(/(?:^|[\s"'`])size-\[([^\]]+)\]/);
  const scaledSize = openingSource.match(/(?:^|[\s"'`])size-(\d+(?:\.\d+)?)(?=[\s"'`}])/);
  const size = arbitrarySize
    ? lengthInPixels(arbitrarySize[1])
    : scaledSize
      ? Number(scaledSize[1]) * 4
      : null;
  if (size !== null && size >= 28) return true;

  const classWidth = tailwindDimension(openingSource, "w");
  const classHeight = tailwindDimension(openingSource, "h");
  if (classWidth !== null && classHeight !== null && classWidth >= 28 && classHeight >= 28) return true;

  const styleWidth = inlineStyleDimension(openingSource, "width");
  const styleHeight = inlineStyleDimension(openingSource, "height");
  return styleWidth !== null && styleHeight !== null && styleWidth >= 28 && styleHeight >= 28;
}

function expressionProvidesAccessibleName(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const node = value as AstNode;
  switch (node.type) {
    case "StringLiteral":
      return typeof node.value === "string" && node.value.trim().length > 0;
    case "NumericLiteral":
    case "BigIntLiteral":
      return true;
    case "NullLiteral":
    case "BooleanLiteral":
    case "JSXEmptyExpression":
      return false;
    case "Identifier":
      return node.name !== "undefined";
    case "ConditionalExpression":
      return expressionProvidesAccessibleName(node.consequent) && expressionProvidesAccessibleName(node.alternate);
    case "LogicalExpression":
      return node.operator === "??"
        && expressionProvidesAccessibleName(node.left)
        && expressionProvidesAccessibleName(node.right);
    case "TemplateLiteral": {
      const quasis = (node.quasis as AstNode[] | undefined) ?? [];
      const staticText = quasis.map((quasi) => {
        const cooked = (quasi.value as { cooked?: unknown } | undefined)?.cooked;
        return typeof cooked === "string" ? cooked : "";
      }).join("");
      if (staticText.trim().length > 0) return true;
      const expressions = (node.expressions as AstNode[] | undefined) ?? [];
      return expressions.length > 0 && expressions.every(expressionProvidesAccessibleName);
    }
    case "TSAsExpression":
    case "TSTypeAssertion":
    case "TSNonNullExpression":
    case "ParenthesizedExpression":
      return expressionProvidesAccessibleName(node.expression);
    default:
      // Calls and member expressions are dynamic names whose emptiness cannot be
      // established statically. Known-empty syntax is rejected above.
      return true;
  }
}

function attributeProvidesAccessibleName(attribute: AstNode): boolean {
  if (attribute.type !== "JSXAttribute") return false;
  const name = attribute.name as AstNode | undefined;
  if (name?.name !== "aria-label" && name?.name !== "aria-labelledby") return false;
  const value = attribute.value as AstNode | null | undefined;
  if (!value) return false;
  if (value.type === "StringLiteral") {
    return typeof value.value === "string" && value.value.trim().length > 0;
  }
  if (value.type !== "JSXExpressionContainer") return false;
  return expressionProvidesAccessibleName(value.expression);
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
    const isNamed = attributes.some(attributeProvidesAccessibleName);
    const openingSource = source.slice(opening.start ?? 0, opening.end ?? 0);
    if (isNamed && hasApprovedTarget(openingSource)) return;
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

  it.each([
    ["conditional SVG with an approved target", `<button aria-label="Play" className="current-icon-button">{ready ? <svg /> : null}</button>`, true],
    ["conditional SVG without a name", `<button className="current-icon-button">{ready ? <svg /> : null}</button>`, false],
    ["fragment-wrapped conditional SVG without a name", `<button className="current-icon-button">{ready && <><svg /></>}</button>`, false],
    ["literal visible text", `<button><svg /> Save</button>`, true],
    ["expression-provided visible text", `<button><svg />{label}</button>`, true],
    ["conditional visible text", `<button><svg />{ready ? "Save" : null}</button>`, true],
    ["conditional text element", `<button><svg />{ready ? <span>Save</span> : null}</button>`, true],
    ["size-6", `<button aria-label="Play" className="size-6"><svg /></button>`, false],
    ["size-7", `<button aria-label="Play" className="size-7"><svg /></button>`, true],
    ["size-8", `<button aria-label="Play" className="size-8"><svg /></button>`, true],
    ["paired w-7 and h-7", `<button aria-label="Play" className="w-7 h-7"><svg /></button>`, true],
    ["paired w-8 and h-8", `<button aria-label="Play" className="w-8 h-8"><svg /></button>`, true],
    ["only one known dimension", `<button aria-label="Play" className="w-8"><svg /></button>`, false],
    ["arbitrary small size", `<button aria-label="Play" className="size-[24px]"><svg /></button>`, false],
    ["arbitrary large size", `<button aria-label="Play" className="size-[28px]"><svg /></button>`, true],
    ["arbitrary large dimensions", `<button aria-label="Play" className="w-[2rem] h-[2rem]"><svg /></button>`, true],
    ["small inline dimensions", `<button aria-label="Play" style={{ width: 24, height: 24 }}><svg /></button>`, false],
    ["large inline dimensions", `<button aria-label="Play" style={{ width: 32, height: 32 }}><svg /></button>`, true],
    ["padding only", `<button aria-label="Play" className="p-2"><svg /></button>`, false],
    ["shared Current action class", `<button aria-label="Play" className={active ? "current-media-action" : "current-icon-button"}><svg /></button>`, true],
  ])("classifies %s", (_name, source, valid) => {
    expect(findIconControlViolations(source)).toEqual(valid ? [] : ["fixture.tsx:1"]);
  });

  it.each([
    ["empty aria-label", `<button aria-label="" className="current-icon-button"><svg /></button>`, false],
    ["whitespace aria-label", `<button aria-label="   " className="current-icon-button"><svg /></button>`, false],
    ["undefined aria-label", `<button aria-label={undefined} className="current-icon-button"><svg /></button>`, false],
    ["null aria-label", `<button aria-label={null} className="current-icon-button"><svg /></button>`, false],
    ["false aria-label", `<button aria-label={false} className="current-icon-button"><svg /></button>`, false],
    ["non-empty aria-label", `<button aria-label="Play" className="current-icon-button"><svg /></button>`, true],
    ["dynamic aria-label", `<button aria-label={label} className="current-icon-button"><svg /></button>`, true],
    ["non-empty aria-labelledby", `<button aria-labelledby="play-label" className="current-icon-button"><svg /></button>`, true],
  ])("validates %s", (_name, source, valid) => {
    expect(findIconControlViolations(source)).toEqual(valid ? [] : ["fixture.tsx:1"]);
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
