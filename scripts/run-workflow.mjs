#!/usr/bin/env node
/**
 * Headless workflow runner CLI.
 *
 *   npm run workflow -- ./my-workflow.json \
 *     --input "Product Photo=@./shot.png" \
 *     --input "Prompt=a watercolor fox" \
 *     --out ./outputs
 *
 * Posts the workflow to a running Current server's /api/run endpoint
 * (start one with `npm run dev` or `npm run start`), then writes every
 * resolved output to disk. Inputs are matched by node id or node title:
 * `name=@file` loads a media file, `name=text` sets prompt text.
 *
 * Zero dependencies — Node 20+ only.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
};

const EXT_BY_MIME = Object.fromEntries(
  Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext])
);

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(`Usage: run-workflow <workflow.json> [options]

Options:
  --input name=value     Set a prompt node's text (name = node id or title)
  --input name=@file     Load a file into an image/video/audio input node
  --server <url>         Current server to run against (default http://localhost:3000)
  --out <dir>            Directory for output files (default ./outputs)
  --json                 Print the raw run result as JSON
`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { inputs: {}, server: "http://localhost:3000", out: "./outputs", json: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") {
      const pair = argv[++i];
      if (!pair || !pair.includes("=")) usage(`--input expects name=value, got "${pair}"`);
      const eq = pair.indexOf("=");
      args.inputs[pair.slice(0, eq)] = pair.slice(eq + 1);
    } else if (arg === "--server") {
      args.server = argv[++i] || usage("--server expects a URL");
    } else if (arg === "--out") {
      args.out = argv[++i] || usage("--out expects a directory");
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) usage("Provide exactly one workflow JSON file");
  args.workflowPath = positional[0];
  return args;
}

function fileToDataUrl(path) {
  const mime = MIME_BY_EXT[extname(path).toLowerCase()];
  if (!mime) usage(`Unsupported file type for input: ${path}`);
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

function buildInputs(rawInputs, nodes) {
  const inputs = {};
  const byKey = new Map();
  for (const node of nodes) {
    byKey.set(node.id, node);
    if (node.data?.customTitle) byKey.set(node.data.customTitle, node);
  }

  for (const [name, value] of Object.entries(rawInputs)) {
    const node = byKey.get(name);
    if (!node) usage(`Input "${name}" matches no node id or title in the workflow`);
    if (value.startsWith("@")) {
      const dataUrl = fileToDataUrl(resolve(value.slice(1)));
      if (node.type === "videoInput") inputs[name] = { video: dataUrl };
      else if (node.type === "audioInput") inputs[name] = { audio: dataUrl };
      else inputs[name] = { image: dataUrl };
    } else {
      inputs[name] = { text: value };
    }
  }
  return inputs;
}

function saveOutput(outDir, output, index) {
  if (output.type === "text") {
    const path = join(outDir, `${index}-${output.title}.txt`.replace(/[^\w.\-]+/g, "_"));
    writeFileSync(path, output.data);
    return path;
  }
  const match = /^data:([^;,]+)/.exec(output.data);
  const mime = match ? match[1] : "application/octet-stream";
  const ext = EXT_BY_MIME[mime] || ".bin";
  const path = join(outDir, `${index}-${output.title}${ext}`.replace(/[^\w.\-]+/g, "_"));
  const base64 = output.data.slice(output.data.indexOf(",") + 1);
  writeFileSync(path, Buffer.from(base64, "base64"));
  return path;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let workflowFile;
  try {
    workflowFile = JSON.parse(readFileSync(args.workflowPath, "utf8"));
  } catch (error) {
    usage(`Could not read workflow file: ${error.message}`);
  }

  // Accept shareable exports {nodes, edges}, saved files {workflow: {...}}
  const workflow = workflowFile.workflow ?? workflowFile;
  if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
    usage("Workflow file has no nodes/edges arrays");
  }

  const inputs = buildInputs(args.inputs, workflow.nodes);

  console.log(`Running ${args.workflowPath} (${workflow.nodes.length} nodes) against ${args.server} ...`);
  const started = Date.now();

  let response;
  try {
    response = await fetch(`${args.server}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow: { nodes: workflow.nodes, edges: workflow.edges }, inputs }),
    });
  } catch (error) {
    console.error(`Could not reach ${args.server} — is the Current server running? (${error.message})`);
    process.exit(1);
  }

  const result = await response.json().catch(() => null);
  if (!result) {
    console.error(`Server returned a non-JSON response (HTTP ${response.status})`);
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  for (const nodeResult of result.nodeResults ?? []) {
    const mark = nodeResult.status === "complete" ? "✓" : nodeResult.status === "error" ? "✗" : "–";
    const err = nodeResult.error ? ` — ${nodeResult.error}` : "";
    console.log(`  ${mark} ${nodeResult.nodeId} (${nodeResult.type}) ${nodeResult.durationMs}ms${err}`);
  }

  if (!result.success) {
    console.error(`\nRun failed: ${result.error}`);
    process.exit(1);
  }

  mkdirSync(args.out, { recursive: true });
  const saved = (result.outputs ?? []).map((output, i) => saveOutput(args.out, output, i + 1));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\nDone in ${seconds}s — ${saved.length} output${saved.length === 1 ? "" : "s"}:`);
  for (const path of saved) console.log(`  ${path}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
