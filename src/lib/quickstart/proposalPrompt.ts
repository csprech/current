/**
 * Build a prompt for Gemini to generate a WorkflowProposal
 *
 * Unlike buildQuickstartPrompt which generates full workflow JSON,
 * this generates a reviewable proposal structure focused on purpose
 * and connections rather than internal node state.
 */
import { buildNodeReferenceSection } from "@/lib/nodeCatalogForAI";

export function buildProposalPrompt(description: string): string {
  return `You are a workflow designer for Current, a visual node-based AI image generation tool. Your task is to create a workflow PROPOSAL that can be reviewed before building the actual workflow.

## CRITICAL: OUTPUT FORMAT
You MUST output ONLY valid JSON. No explanations, no markdown, no code blocks. Just the raw JSON object starting with { and ending with }.

## Available Node Types (type (label, category): inputs → outputs — purpose)

${buildNodeReferenceSection()}

## Connection Rules
1. **Type matching**: Connections must use matching typed handles: "image", "text", "audio", "video", "3d", "easeCurve", or "reference"
2. **Generation nodes need prompts**: give nanoBanana / generateVideo / generateAudio / llmGenerate an explicit prompt node connection (preferred in proposals so the user can see and edit the text)
3. **Multiple images**: nanoBanana can accept multiple image inputs for multi-reference generation
4. **Models for nanoBanana**: "nano-banana" (fast), "nano-banana-pro" (high quality), "nano-banana-2" (extended ratios and search)
5. **Prefer simple graphs**: only reach for routing (switch/conditionalSwitch), array batching, or video-processing nodes when the request clearly calls for them

## WorkflowProposal Schema

Output a JSON object matching this structure:

{
  "name": "Workflow Name",
  "description": "One paragraph explaining what this workflow does and how to use it",
  "nodes": [
    {
      "id": "node-1",
      "type": "imageInput",
      "purpose": "Human-readable description of this node's role",
      "suggestedTitle": "Node title shown in UI",
      "suggestedPrompt": "For prompt nodes only: the suggested prompt text",
      "suggestedModel": "For nanoBanana: 'nano-banana', 'nano-banana-pro', or 'nano-banana-2'",
      "suggestedSettings": { "aspectRatio": "1:1" }
    }
  ],
  "connections": [
    {
      "from": "node-1",
      "to": "node-2",
      "type": "image",
      "description": "Character image feeds into generation"
    }
  ],
  "groups": [
    {
      "name": "Input Images",
      "color": "blue",
      "nodeIds": ["node-1", "node-2"],
      "purpose": "All source images for the workflow"
    }
  ],
  "estimatedComplexity": "simple|moderate|complex",
  "warnings": ["Optional array of caveats or limitations"]
}

## Field Guidelines

**nodes[].purpose**: Explain what this node does in the workflow context
- Good: "Provides the main character photo that will be composited into new scenes"
- Bad: "Image input"

**nodes[].suggestedTitle**: Short, descriptive title for the UI
- Good: "Character Photo", "Style Reference", "Background Scene"
- Bad: "Input 1", "Node", "Image"

**nodes[].suggestedPrompt**: For prompt nodes, write helpful starter text
- For minimal workflows: Brief placeholder like "Describe the scene transformation..."
- For detailed workflows: Complete example prompt

**nodes[].suggestedModel**: For nanoBanana nodes
- Use "nano-banana-pro" for high-quality final outputs
- Use "nano-banana" for intermediate processing or speed
- Use "nano-banana-2" when extreme aspect ratios or image search are required

**nodes[].suggestedSettings**: Optional settings for generation nodes
- nano-banana: base aspect ratios only; no resolution or search settings
- nano-banana-pro: base aspect ratios; resolution "1K", "2K", or "4K"; useGoogleSearch supported
- nano-banana-2: extended aspect ratios including "1:4", "1:8", "4:1", and "8:1"; resolution "512", "1K", "2K", or "4K"; both search settings supported
- Base aspect ratios: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
- splitGrid targetCount: 4, 6, 8, 9, or 10; layout is derived automatically

**connections[].description**: Explain the data flow
- Good: "Character photo provides the subject to maintain across generations"
- Bad: "Image connection"

**groups**: Only include if workflow has 4+ nodes, helps organize complex workflows
- colors: "neutral", "blue", "green", "purple", "orange"

**estimatedComplexity**:
- "simple": 2-4 nodes, straightforward linear flow
- "moderate": 5-8 nodes, some branching or multiple outputs
- "complex": 9+ nodes, parallel processing, multi-stage pipelines

**warnings**: Include if:
- User's request might have limitations
- Certain features aren't supported
- Results may vary based on input quality

## Example Proposal

For request "Create product photos with different backgrounds":

{
  "name": "Product Background Swap",
  "description": "Takes a product photo and places it in various background scenes. Upload your product image, then add different scene descriptions for each variation you want.",
  "nodes": [
    {
      "id": "node-1",
      "type": "imageInput",
      "purpose": "The main product photo that will be extracted and placed into new scenes",
      "suggestedTitle": "Product Photo"
    },
    {
      "id": "node-2",
      "type": "prompt",
      "purpose": "Describes the first background scene and how to integrate the product",
      "suggestedTitle": "Scene 1 Description",
      "suggestedPrompt": "Place the product on a modern white marble countertop with soft natural lighting from the left. Maintain product proportions and add subtle shadows."
    },
    {
      "id": "node-3",
      "type": "nanoBanana",
      "purpose": "Generates the product composited into the first scene",
      "suggestedTitle": "Generate Scene 1",
      "suggestedModel": "nano-banana-pro",
      "suggestedSettings": { "aspectRatio": "1:1" }
    }
  ],
  "connections": [
    {
      "from": "node-1",
      "to": "node-3",
      "type": "image",
      "description": "Product photo provides the subject to maintain across all scene variations"
    },
    {
      "from": "node-2",
      "to": "node-3",
      "type": "text",
      "description": "Scene description tells the AI how to composite the product"
    }
  ],
  "estimatedComplexity": "simple",
  "warnings": ["Best results with products on neutral backgrounds that can be easily separated"]
}

## User's Request
"${description}"

Generate a workflow proposal that best addresses this request. Focus on clear purposes and descriptions that help the user understand each step.

OUTPUT ONLY THE JSON:`;
}
