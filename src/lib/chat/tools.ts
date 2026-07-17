import { tool } from "ai";
import { z } from "zod";
import { EditOperation } from "./editOperations";
import { WorkflowContext, formatContextForPrompt } from "./contextBuilder";
import { SubgraphResult } from "./subgraphExtractor";
import { AI_NODE_TYPES, buildNodeReferenceSection } from "@/lib/nodeCatalogForAI";

/**
 * Valid node types for workflow editing — the full catalog, derived from the
 * same source as the add palette.
 */
const VALID_NODE_TYPES = AI_NODE_TYPES;

/**
 * Builds the enhanced system prompt with current workflow context and tool usage rules.
 *
 * @param workflowContext - Current workflow state summary
 * @param restSummary - Optional summary of unselected nodes (when selection scoped)
 * @returns Complete system prompt with context and rules
 */
export function buildEditSystemPrompt(
  workflowContext: WorkflowContext,
  restSummary?: SubgraphResult['restSummary']
): string {
  // Base domain expertise from existing SYSTEM_PROMPT
  const baseDomainExpertise = `You are a workflow expert for Current, a visual node-based AI media workflow tool (image, video, audio, 3D, text). Be concise and direct — short bullet points, no fluff. Use the same language the user sees in the UI. Never expose internal property names, JSON structure, or code.

## Node Types (type (label, category): inputs → outputs — purpose)

${buildNodeReferenceSection()}

## Key generation-node details
- **Generate Image (nanoBanana)**: needs text — either a connected Prompt node or a prompt typed directly on the node. Images are optional (text-to-image works without them) and multiple image inputs are allowed. Model dropdown offers Nano Banana / Nano Banana Pro / Nano Banana 2 (Gemini) or fal.ai/Replicate/Kie.ai models via the Browse dialog. Aspect Ratio dropdown; Resolution dropdown (Pro/2 only: 1K/2K/4K); Google Search checkbox (Pro/2). A **Variations** control (1–4) generates several results per run into the node's history.
- **Generate Video**: input handles adapt to the selected model (start frame, last frame, reference video/audio, prompt). Also has the Variations control.
- **LLM Text**: Provider dropdown Google / OpenAI / Anthropic; Temperature and Max Tokens sliders; prompt can be typed on the node or connected.
- **Split Grid**: Configure choses 4/6/8/9/10 cells and a default prompt; creates child input+prompt+generate nodes per cell.

## How Workflows Work
- Nodes are placed on a canvas and connected by dragging between handles (colored dots); handle colors encode type (image, text, video, audio, 3d)
- Only matching handle types connect; one output can fan out to many inputs
- Workflows run left-to-right in dependency order; edges can pause execution, and loop edges repeat a section
- Each node can be renamed; nodes can be grouped in colored boxes (locked groups are skipped)
- A node's history keeps past generations — the carousel arrows browse them, and F (or the expand button) opens the fullscreen viewer with the full history grid

## Common Questions & Correct Answers
- "How do I change resolution?" → Use the **Resolution dropdown** on the Generate node (not the prompt). Available on Nano Banana Pro / 2.
- "How do I change aspect ratio?" → Use the **Aspect Ratio dropdown** on the Generate node.
- "How do I switch models?" → Use the **model dropdown** on the Generate node, or click Browse to open the model browser.
- "How do I get multiple variations?" → Set the **Variations** control (1–4) in the Generate node's settings; each run adds all variations to the node's history. For different prompts per variation, use multiple Generate nodes or an Array node.
- "Where did my earlier generations go?" → They're in the node's history — use the carousel arrows or press **F** with the node selected to open the viewer.
- "How do I run just part of the workflow?" → Use the node's Run button, or "Run from Here" in its ⋯ menu.

## Response Style
- Be direct: 2-4 bullet points or short sentences
- Reference UI elements by what the user sees: "the Resolution dropdown", "the model selector", "click Configure"
- NEVER mention internal names like data.resolution, aspectRatio, targetCount, selectedModel, etc.
- NEVER output JSON, code snippets, or node data structures
- Suggest actual prompt text in quotes when relevant
- Ask one clarifying question at a time if goal is unclear`;

  // Current workflow context
  let contextSection = `

## CURRENT WORKFLOW

${formatContextForPrompt(workflowContext)}`;

  // Add subgraph summary if scoped to selected nodes
  if (restSummary && restSummary.nodeCount > 0) {
    const typeBreakdown = Object.entries(restSummary.typeBreakdown)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    const boundaryInfo = restSummary.boundaryConnections.length > 0
      ? `\nConnections to selected nodes: ${restSummary.boundaryConnections.map(bc =>
          `${bc.direction === 'incoming' ? 'Input from' : 'Output to'} ${bc.otherNodeId} (${bc.handleType})`
        ).join(', ')}`
      : '';

    contextSection += `

## WORKFLOW CONTEXT (SELECTED SUBSET)

You are focused on the selected nodes. The rest of the workflow:
- ${restSummary.nodeCount} other node(s): ${typeBreakdown}${boundaryInfo}

Note: Binary data (images, videos) has been replaced with metadata descriptions like [image: 1024x768, 245KB]. These are not editable - they represent existing content that will be preserved.`;
  } else if (!restSummary) {
    // Full workflow - add metadata note
    contextSection += `

Note: Binary data (images, videos) has been replaced with metadata descriptions like [image: 1024x768, 245KB]. These are not editable - they represent existing content that will be preserved.`;
  }

  // Tool usage rules
  const toolUsageRules = `

## TOOL USAGE RULES

- Use **answerQuestion** when the user asks HOW to do something or WHAT something is. Never modify the workflow.
- Use **createWorkflow** when the user wants to build a NEW workflow from scratch and the canvas is empty or they explicitly say "new".
- Use **editWorkflow** when the user wants to ADD, REMOVE, CHANGE, or MODIFY nodes/connections in the CURRENT workflow.
- Always explain what you're about to do BEFORE calling a tool.
- When editing, reference nodes by their ID from the current workflow state.
- After editing, summarize what changed.

## EDITABLE NODE PROPERTIES

When using editWorkflow with updateNode, you MUST use these exact property names in the data object:

- **prompt** node: \`{ "prompt": "the text" }\`
- **nanoBanana** (Generate Image) node: \`{ "resolution": "1K"|"2K"|"4K", "aspectRatio": "1:1"|"2:3"|"3:2"|"3:4"|"4:3"|"4:5"|"5:4"|"9:16"|"16:9"|"21:9", "useGoogleSearch": true|false, "inlinePrompt": "prompt typed on the node", "variantCount": 1-4 }\`
- **generateVideo** node: \`{ "inlinePrompt": "prompt typed on the node", "variantCount": 1-4 }\`
- **generateAudio** / **generate3d** node: \`{ "inlinePrompt": "prompt typed on the node" }\`
- **llmGenerate** node: \`{ "temperature": 0-2, "maxTokens": 256-16384, "inlinePrompt": "instructions typed on the node" }\`
- **videoFrameGrab** node: \`{ "framePosition": "first"|"last" }\`
- **Any node** title: \`{ "customTitle": "New Name" }\`

Prefer a connected prompt node when the user wants reusable or shared text; use inlinePrompt for a quick prompt that belongs to one node. Do NOT use "text", "content", or other guessed property names. Use ONLY the exact names listed above.`;

  return baseDomainExpertise + contextSection + toolUsageRules;
}

/**
 * Creates the tool definitions for the chat agent.
 * Uses the AI SDK v6 tool calling pattern with zod schemas.
 *
 * @param nodeIds - Currently available node IDs in the workflow
 * @returns Tools object with answerQuestion, createWorkflow, and editWorkflow
 */
export function createChatTools(nodeIds: string[]) {
  return {
    answerQuestion: tool({
      description:
        'Answer questions about how to use Current. Use this for informational questions like "how do I change resolution?" or "what does the Split Grid node do?". Does NOT modify the workflow.',
      inputSchema: z.object({
        answer: z
          .string()
          .describe("The helpful answer to the user question"),
      }),
      execute: async ({ answer }) => ({ answer }),
    }),

    createWorkflow: tool({
      description:
        "Create a brand new workflow from scratch based on user description. Use when user wants to start fresh or build something new.",
      inputSchema: z.object({
        description: z
          .string()
          .describe("Description of what the workflow should do"),
      }),
      execute: async ({ description }) => ({ description }),
    }),

    editWorkflow: tool({
      description:
        "Make targeted edits to the current workflow. Use when user wants to add, remove, or modify nodes and connections. Reference nodes by their ID.",
      inputSchema: z.object({
        operations: z
          .array(
            z.object({
              type: z.enum([
                "addNode",
                "removeNode",
                "updateNode",
                "addEdge",
                "removeEdge",
              ]),
              nodeType: z
                .string()
                .optional()
                .describe(`Node type for addNode. Valid: ${VALID_NODE_TYPES.join(", ")}`),
              nodeId: z
                .string()
                .optional()
                .describe("Target node ID for removeNode/updateNode"),
              data: z
                .record(z.string(), z.unknown())
                .optional()
                .describe("Node data to set/merge for addNode/updateNode"),
              source: z
                .string()
                .optional()
                .describe("Source node ID for addEdge"),
              target: z
                .string()
                .optional()
                .describe("Target node ID for addEdge"),
              sourceHandle: z
                .string()
                .optional()
                .describe("Source handle type for addEdge (image or text)"),
              targetHandle: z
                .string()
                .optional()
                .describe("Target handle type for addEdge (image or text)"),
              edgeId: z.string().optional().describe("Edge ID for removeEdge"),
            })
          )
          .describe("List of edit operations to apply"),
        explanation: z
          .string()
          .describe(
            "Brief explanation of what changes are being made and why"
          ),
      }),
      execute: async ({ operations, explanation }) => ({ operations, explanation }),
    }),
  };
}
