/**
 * GET /api/node-types — machine-readable node catalog.
 *
 * Returns every node type with its label, category, handle signature, and
 * purpose, plus which types the headless runner (/api/run) supports today.
 * Consumed by the MCP server and other integrations.
 */

import { NextResponse } from "next/server";
import { getAINodeCatalog } from "@/lib/nodeCatalogForAI";
import { SUPPORTED_NODE_TYPES } from "@/lib/headless/runWorkflow";

export const dynamic = "force-static";

export async function GET() {
  const catalog = getAINodeCatalog();
  return NextResponse.json({
    nodeTypes: catalog.map((entry) => ({
      ...entry,
      headless: SUPPORTED_NODE_TYPES.has(entry.type),
    })),
  });
}
