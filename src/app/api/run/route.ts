/**
 * POST /api/run — headless workflow execution.
 *
 * Accepts a workflow JSON (shareable-export or {nodes, edges} shape) plus
 * optional typed input overrides, runs it server-side via the headless
 * engine, and returns the resolved outputs. Provider keys come from the
 * server environment or the same X-*-Key headers the editor uses.
 */

import { NextRequest, NextResponse } from "next/server";
import { runWorkflowHeadless, type HeadlessRunRequest } from "@/lib/headless/runWorkflow";
import type { WorkflowEdge, WorkflowNode } from "@/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const FORWARDED_KEY_HEADERS = [
  "x-gemini-api-key",
  "x-replicate-key",
  "x-fal-key",
  "x-kie-key",
  "x-wavespeed-key",
  "x-openai-key",
  "x-anthropic-key",
];

interface RunRequestBody {
  workflow?: { nodes?: unknown; edges?: unknown };
  nodes?: unknown;
  edges?: unknown;
  inputs?: HeadlessRunRequest["inputs"];
}

export async function POST(request: NextRequest) {
  let body: RunRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body must be JSON" }, { status: 400 });
  }

  // Accept both {workflow: {nodes, edges}} and a bare shareable export {nodes, edges}
  const nodes = (body.workflow?.nodes ?? body.nodes) as WorkflowNode[] | undefined;
  const edges = (body.workflow?.edges ?? body.edges) as WorkflowEdge[] | undefined;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json(
      { success: false, error: "Workflow must include nodes and edges arrays" },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {};
  for (const name of FORWARDED_KEY_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  const result = await runWorkflowHeadless(
    { workflow: { nodes, edges }, inputs: body.inputs },
    { origin: request.nextUrl.origin, headers }
  );

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
