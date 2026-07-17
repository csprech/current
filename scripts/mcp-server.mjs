#!/usr/bin/env node
/**
 * Current MCP server.
 *
 * Lets MCP clients (Claude Code, Claude Desktop, Cursor, ...) drive a local
 * Current instance: validate and run workflows headlessly, and discover the
 * node and model catalogs. Speaks MCP over stdio (newline-delimited JSON-RPC)
 * with zero dependencies, and talks to a running Current server over HTTP.
 *
 * Wire it up (with `npm run dev` or `npm run start` running):
 *   claude mcp add current -- node scripts/mcp-server.mjs
 * or in a client config:
 *   { "command": "node", "args": ["scripts/mcp-server.mjs"], "env": { "CURRENT_SERVER": "http://localhost:3000" } }
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { extname, join, resolve } from "node:path";

const SERVER = process.env.CURRENT_SERVER || "http://localhost:3000";
const VERSION = "0.1.0";

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
};
const EXT_BY_MIME = Object.fromEntries(Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext]));

const log = (...args) => console.error("[current-mcp]", ...args);

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

function loadWorkflow(args) {
  if (args.workflow && typeof args.workflow === "object") return args.workflow;
  if (typeof args.workflowPath === "string") {
    const file = JSON.parse(readFileSync(resolve(args.workflowPath), "utf8"));
    return file.workflow ?? file;
  }
  throw new Error("Provide either workflowPath (a JSON file) or workflow (an object with nodes and edges)");
}

function buildInputs(rawInputs) {
  if (!rawInputs || typeof rawInputs !== "object") return undefined;
  const inputs = {};
  for (const [name, value] of Object.entries(rawInputs)) {
    if (typeof value === "string") {
      inputs[name] = { text: value };
      continue;
    }
    const entry = {};
    if (typeof value.text === "string") entry.text = value.text;
    for (const [key, field] of [["imagePath", "image"], ["videoPath", "video"], ["audioPath", "audio"]]) {
      if (typeof value[key] === "string") {
        const path = resolve(value[key]);
        const mime = MIME_BY_EXT[extname(path).toLowerCase()];
        if (!mime) throw new Error(`Unsupported file type for input "${name}": ${path}`);
        entry[field] = `data:${mime};base64,${readFileSync(path).toString("base64")}`;
      }
    }
    if (Object.keys(entry).length === 0) {
      throw new Error(`Input "${name}" needs text, imagePath, videoPath, or audioPath`);
    }
    inputs[name] = entry;
  }
  return inputs;
}

async function postRun(body) {
  let response;
  try {
    response = await fetch(`${SERVER}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Could not reach the Current server at ${SERVER} — start it with \`npm run dev\`. (${error.message})`);
  }
  return response.json();
}

function saveOutputs(outputs, outDir) {
  mkdirSync(outDir, { recursive: true });
  const saved = [];
  outputs.forEach((output, i) => {
    if (output.type === "text") {
      const path = join(outDir, `${i + 1}-${output.title}.txt`.replace(/[^\w.\-]+/g, "_"));
      writeFileSync(path, output.data);
      saved.push({ type: "text", path, preview: output.data.slice(0, 400) });
      return;
    }
    const mime = /^data:([^;,]+)/.exec(output.data)?.[1] ?? "application/octet-stream";
    const ext = EXT_BY_MIME[mime] || ".bin";
    const path = join(outDir, `${i + 1}-${output.title}${ext}`.replace(/[^\w.\-]+/g, "_"));
    writeFileSync(path, Buffer.from(output.data.slice(output.data.indexOf(",") + 1), "base64"));
    saved.push({ type: output.type, path });
  });
  return saved;
}

function describeNodeResults(nodeResults) {
  return (nodeResults ?? [])
    .map((r) => `${r.status === "complete" ? "✓" : "✗"} ${r.nodeId} (${r.type}) ${r.durationMs}ms${r.error ? ` — ${r.error}` : ""}`)
    .join("\n");
}

const TOOLS = {
  run_workflow: {
    description:
      "Run a Current workflow headlessly and save its outputs to disk. Accepts a workflow file path or an inline workflow object. Inputs are matched by node id or node title: pass a plain string to set prompt text, or {imagePath|videoPath|audioPath} to load media into input nodes. Returns per-node progress and the saved output file paths. Provider API keys come from the Current server's environment.",
    inputSchema: {
      type: "object",
      properties: {
        workflowPath: { type: "string", description: "Path to a workflow JSON file (saved project or shareable export)" },
        workflow: { type: "object", description: "Inline workflow object with nodes and edges arrays" },
        inputs: {
          type: "object",
          description: 'Input overrides keyed by node id or title, e.g. {"Prompt": "a red fox", "Photo": {"imagePath": "./shot.png"}}',
        },
        outDir: { type: "string", description: "Directory for output files (default ./outputs)" },
      },
    },
    async run(args) {
      const workflow = loadWorkflow(args);
      const inputs = buildInputs(args.inputs);
      const result = await postRun({ workflow: { nodes: workflow.nodes, edges: workflow.edges }, inputs });
      const progress = describeNodeResults(result.nodeResults);

      if (!result.success) {
        return { isError: true, text: `Run failed: ${result.error}\n\n${progress}` };
      }

      const saved = saveOutputs(result.outputs ?? [], resolve(args.outDir || "./outputs"));
      const lines = saved.map((s) => (s.type === "text" ? `${s.path}\n  text: ${s.preview}` : `${s.path} (${s.type})`));
      return {
        text: `Run succeeded — ${saved.length} output${saved.length === 1 ? "" : "s"}.\n\n${progress}\n\nOutputs:\n${lines.join("\n") || "(none)"}`,
      };
    },
  },

  validate_workflow: {
    description:
      "Validate a Current workflow without running it: checks node types the headless runner supports, loop/pause edges, input overrides, and required connections. Use before run_workflow when building a workflow programmatically.",
    inputSchema: {
      type: "object",
      properties: {
        workflowPath: { type: "string", description: "Path to a workflow JSON file" },
        workflow: { type: "object", description: "Inline workflow object with nodes and edges arrays" },
        inputs: { type: "object", description: "Input overrides to validate against the workflow" },
      },
    },
    async run(args) {
      const workflow = loadWorkflow(args);
      const inputs = buildInputs(args.inputs);
      const result = await postRun({
        workflow: { nodes: workflow.nodes, edges: workflow.edges },
        inputs,
        validateOnly: true,
      });
      if (!result.success) {
        return { isError: true, text: `Invalid: ${result.error}` };
      }
      return { text: `Valid — ${workflow.nodes.length} nodes, ${workflow.edges.length} edges, ready for run_workflow.` };
    },
  },

  list_node_types: {
    description:
      "List every Current node type with its label, category, handle signature (inputs → outputs), purpose, and whether the headless runner supports it.",
    inputSchema: { type: "object", properties: {} },
    async run() {
      const response = await fetch(`${SERVER}/api/node-types`);
      const { nodeTypes } = await response.json();
      const lines = nodeTypes.map(
        (n) => `${n.type} (${n.label}, ${n.category})${n.headless ? "" : " [canvas-only]"}: ${n.io} — ${n.purpose}`
      );
      return { text: lines.join("\n") };
    },
  },

  list_models: {
    description:
      "List AI models available to generation nodes. Filter by provider (gemini, fal, replicate, kie, wavespeed) and capabilities (e.g. text-to-image, image-to-video, text-to-audio). Availability depends on which provider keys the Current server has configured.",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Provider id: gemini, fal, replicate, kie, or wavespeed" },
        capabilities: { type: "string", description: "Comma-separated capability filter, e.g. text-to-image,image-to-image" },
        search: { type: "string", description: "Substring filter on model name/id" },
      },
    },
    async run(args) {
      const params = new URLSearchParams();
      if (args.provider) params.set("provider", args.provider);
      if (args.capabilities) params.set("capabilities", args.capabilities);
      if (args.search) params.set("search", args.search);
      const response = await fetch(`${SERVER}/api/models?${params}`);
      const json = await response.json();
      const models = json.models ?? [];
      const lines = models
        .slice(0, 100)
        .map((m) => `${m.id} — ${m.name}${m.provider ? ` [${m.provider}]` : ""}${m.pricing ? ` $${m.pricing.amount}/${m.pricing.type === "per-second" ? "s" : "run"}` : ""}`);
      const suffix = models.length > 100 ? `\n… and ${models.length - 100} more (narrow with search/capabilities)` : "";
      return { text: `${models.length} model${models.length === 1 ? "" : "s"}:\n${lines.join("\n")}${suffix}` };
    },
  },
};

// ---------------------------------------------------------------------------
// MCP stdio transport (newline-delimited JSON-RPC 2.0)
// ---------------------------------------------------------------------------

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    reply(id, {
      protocolVersion: params?.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "current", version: VERSION },
    });
    return;
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return; // notifications need no response
  }

  if (method === "ping") {
    reply(id, {});
    return;
  }

  if (method === "tools/list") {
    reply(id, {
      tools: Object.entries(TOOLS).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
    return;
  }

  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) {
      replyError(id, -32602, `Unknown tool: ${params?.name}`);
      return;
    }
    try {
      const result = await tool.run(params.arguments ?? {});
      reply(id, {
        content: [{ type: "text", text: result.text }],
        isError: result.isError === true,
      });
    } catch (error) {
      reply(id, {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      });
    }
    return;
  }

  if (id !== undefined) {
    replyError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    log("Ignoring non-JSON input line");
    return;
  }
  handle(message).catch((error) => {
    log("Handler error:", error);
    if (message.id !== undefined) replyError(message.id, -32603, "Internal error");
  });
});

rl.on("close", () => process.exit(0));
log(`ready — proxying ${SERVER}`);
