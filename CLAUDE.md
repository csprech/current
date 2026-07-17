# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Current is

Current is an open-source, desktop-first visual workspace for AI media workflows. Users arrange typed nodes on an infinite React Flow canvas, connect them, and run the graph in dependency order — in the browser, from the CLI, over `POST /api/run`, or from an MCP client. Bring-your-own-keys; no hosted lock-in.

## Build & Development Commands

```bash
npm run dev       # Start Next.js dev server at http://localhost:3000
npm run build     # Build for production
npm run start     # Start production server
npm run test      # Vitest in watch mode
npm run test:run  # Run all tests once (CI mode)
npm run workflow  # Headless runner CLI (needs a running server)
npm run mcp       # MCP server over stdio (needs a running server)
```

There is no working `npm run lint` (Next 16 removed `next lint` and no eslint config exists). The regression check used instead:

```bash
npx tsc --noEmit | grep -E "^src/" | grep -Ev "test\.|__tests__"   # must be empty
```

(~250 pre-existing type errors live in test files only; never let new errors into non-test sources.)

## Environment Setup

Create `.env.local` in the root directory (all optional — keys can also be added in-app via Project Settings):

```
GEMINI_API_KEY=...      # Gemini image/LLM generation
OPENAI_API_KEY=...      # OpenAI LLM provider
ANTHROPIC_API_KEY=...   # Anthropic LLM provider
REPLICATE_API_KEY=...   # Replicate models
FAL_API_KEY=...         # fal.ai models
KIE_API_KEY=...         # Kie.ai models (Sora, Veo, Kling, ...)
WAVESPEED_API_KEY=...   # WaveSpeed models
```

## Architecture Overview

### Core Stack
- **Next.js 16** (App Router, Turbopack) with TypeScript, React 19
- **@xyflow/react** (React Flow) for the node editor canvas
- **Konva.js / react-konva** for canvas annotation drawing
- **mediabunny** (WebCodecs) for on-device video decode/encode
- **Zustand** for state management (single store pattern)
- **Vitest** (jsdom) for tests

### Key Files

| Purpose | Location |
|---------|----------|
| Central workflow state & execution logic | `src/store/workflowStore.ts` |
| Per-node executors + dispatch | `src/store/execution/` |
| All TypeScript type definitions | `src/types/` (`nodes.ts` for node data) |
| Main canvas, connection validation, shortcuts | `src/components/WorkflowCanvas.tsx` |
| Base node chassis (shared by all nodes) | `src/components/nodes/BaseNode.tsx` |
| Node roles, minimap colors, handle accents | `src/components/nodes/nodePresentation.ts` |
| Node catalog for the add palette | `src/components/workspace/nodeCatalog.ts` |
| Node catalog for AI surfaces (assistant, quickstart, MCP) | `src/lib/nodeCatalogForAI.ts` |
| Headless execution engine | `src/lib/headless/runWorkflow.ts` |
| Headless CLI / MCP server | `scripts/run-workflow.mjs`, `scripts/mcp-server.mjs` |
| Image generation API route | `src/app/api/generate/route.ts` |
| LLM text generation API route | `src/app/api/llm/route.ts` |
| Headless run API route | `src/app/api/run/route.ts` |
| Machine-readable node catalog API | `src/app/api/node-types/route.ts` |
| Cost calculations | `src/utils/costCalculator.ts` |
| Local image ops (Image Action node) | `src/utils/imageOps.ts` |
| Local video ops (Video Action node) | `src/utils/videoOps.ts` |
| localStorage keys + legacy migration | `src/store/utils/localStorage.ts` |
| Design tokens & component chrome | `src/app/globals.css` |
| Design system source of truth | `docs/design-system.md` |

### State Management

All application state lives in `workflowStore.ts` using Zustand:
- `useWorkflowStore()` provides nodes, edges, and all actions
- `executeWorkflow(startFromNodeId?)` runs the pipeline via topological sort
- `regenerateNode(nodeId)` runs a single node ("Run this node")
- `getConnectedInputs(nodeId)` retrieves upstream data for a node (pure version in `src/store/utils/connectedInputs.ts` is shared with the headless engine)
- `updateNodeData(nodeId, partialData)` updates node state
- Auto-save runs every 90 seconds when enabled

### Execution Flow

1. User clicks Run or presses `Cmd/Ctrl+Enter` (or hits `/api/run` headlessly)
2. `executeWorkflow()` performs a topological sort on the node graph
3. Nodes execute in dependency order via executors in `src/store/execution/`
4. `getConnectedInputs()` provides upstream media/text to each node
5. Locked groups are skipped; pause edges halt execution; variants-per-run loops generators up to 4×

## AI Models

Image generation (Gemini) — display names map to Google's API model ids:
- `gemini-2.5-flash-image` → API model id `nano-banana`
- `gemini-3-pro-image-preview` → API model id `nano-banana-pro` (display name "Nano Banana Pro")

These `nano-banana*` strings are **Google's model identifiers** sent to their API — they are functional, not product branding, and must not be renamed. The same applies to the internal `nanoBanana` node type, which is serialized into every saved workflow file.

LLM models:
- Google: `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3-pro-preview`
- OpenAI: `gpt-4.1-mini`, `gpt-4.1-nano`
- Anthropic via provider settings

Additional providers (Replicate, fal.ai, Kie.ai, WaveSpeed) expose their catalogs through `/api/models`; the model browser and MCP `list_models` tool read from it.

## Node Types (27)

| Family | Types |
|--------|-------|
| Input | `imageInput`, `audioInput`, `videoInput`, `prompt`, `array`, `promptConstructor`, `glbViewer` |
| Generate | `nanoBanana` (image), `generateVideo`, `generateAudio`, `generate3d`, `llmGenerate` |
| Process | `annotation`, `splitGrid`, `imageCompare`, `videoStitch`, `easeCurve`, `videoTrim`, `videoFrameGrab`, `removeBackground`, `imageAction`, `videoAction` |
| Route | `router`, `switch`, `conditionalSwitch` |
| Output | `output`, `outputGallery` |

`imageAction` and `videoAction` run free, deterministic, on-device operations (canvas 2D / WebCodecs) — always $0 in cost estimation.

## Node Connection System

### Handle Types

| Handle | Data format | Accent (see docs/design-system.md) |
|--------|-------------|------------------------------------|
| `image` | Base64 data URL | teal |
| `text` | String | info blue |
| `video` | Data URL or blob URL | purple |
| `audio` | Base64 data URL | pink |
| `3d` | URL | cyan |
| `easeCurve` | Curve params object | info deep |

### Connection Rules

1. Handles connect only to matching types; labels always accompany handle colors.
2. Connections flow source (output) → target (input).
3. Image inputs accept multiple connections; text inputs accept one.
4. **Video connections are gated by an explicit allowlist of target node types in `isValidConnection()` (`WorkflowCanvas.tsx`)** — a new video-consuming node must be added there or its connections silently fail.
5. **Inpainting**: the annotation node's Mask tool paints a white-on-black `outputMask` exposed on a `mask` source handle; the image generator's `mask` target handle routes it into `ConnectedInputs.mask` → the executor's `maskImage` → `/api/generate`, which appends it as the final image with `MASK_INSTRUCTION`. `mask` handles are image-typed (`getHandleType`). Outpainting recipe: Image Action "Change aspect ratio → Pad" → mask the padded borders → generate.

## Adding a New Node Type — the real checklist

The `Record<NodeType, …>` maps are exhaustive on purpose: after adding the type to the union, `npx tsc --noEmit` lists most remaining touchpoints as errors. Work through all of these:

1. `src/types/nodes.ts` — data interface, `NodeType` union, `WorkflowNodeData` union
2. `src/store/utils/nodeDefaults.ts` — `defaultDimensions` + `createDefaultNodeData()`
3. `src/lib/workflow/nodeCapabilities.ts` — inputs/outputs
4. `src/store/utils/connectedInputs.ts` — `getSourceOutput` if the node produces consumable output
5. `src/components/nodes/nodePresentation.ts` — role, minimap color, processor metadata, `hasOutput`
6. `src/components/workspace/nodeCatalog.ts` — add-palette entry (keywords!)
7. `src/lib/nodeCatalogForAI.ts` — `AI_NODE_DOCS` entry (io + purpose)
8. `src/components/ConnectionDropMenu.tsx` — source and target option lists for its handle types
9. `src/components/WorkflowCanvas.tsx` — `nodeTypes` map, title map, dimensions map, the **local capability switch**, the **video allowlist** in `isValidConnection()` (if video), and the drop-menu handle-resolution branch
10. Component in `src/components/nodes/` + export from `src/components/nodes/index.ts`
11. Executor in `src/store/execution/` + export from `execution/index.ts` + case in `executeNode.ts`
12. `src/store/workflowStore.ts` — **three** dispatch sites: `executeWorkflow` switch, `regenerateNode` if-chain, `executeSelectedNodes` switch
13. `src/components/nodes/FloatingNodeHeader.tsx` — `RUNNABLE_TYPES` if per-node run applies
14. `src/utils/costCalculator.ts` — `estimateNodeRunCost` ($0 branch for local ops)
15. `src/utils/mediaStorage.ts` — two switch sites (clear-output + persistence)
16. `src/lib/quickstart/validation.ts` — valid types list, dimensions, `createDefaultNodeData`
17. `src/utils/clipboardMedia.ts` — if the node outputs a copyable image
18. `src/lib/headless/runWorkflow.ts` — add to `SUPPORTED_NODE_TYPES` or leave canvas-only (unsupported types get a clear error)
19. Tests: unit tests for the op + executor; update the `AddPalette` catalog-count test and the `nodePresentation`/chat-tools catalog assertions

## Headless runner & MCP

- `POST /api/run` executes `{workflow: {nodes, edges}, inputs?, validateOnly?}`; provider keys come from the server env or forwarded `X-*-Key` headers.
- `npm run workflow -- ./flow.json --input "Photo=@./shot.png" --out ./outputs` drives it from the CLI.
- `scripts/mcp-server.mjs` (zero-dep stdio MCP) exposes `run_workflow`, `validate_workflow`, `list_node_types`, `list_models` — register with `claude mcp add current -- node scripts/mcp-server.mjs`.
- Headless-supported today: inputs, prompt, image/video/audio generation, LLM, outputs. Canvas-coupled nodes (annotation, imageAction, videoAction, removeBackground, video processing, routing, splitGrid, loops/pause edges) report a clear unsupported error.

## Design system

`docs/design-system.md` is canonical: monochrome ink/canvas/soft-cloud chrome, pill controls + flat zero-radius containers, hairline depth (no shadows/gradients/blur), Helvetica Now stacks, category accents only as data-type signals. Both appearances are token-driven from `globals.css` (`:root` and `:root[data-appearance="dark"]`); Tailwind's `neutral`/`blue` ramps are remapped per appearance, so utility-classed markup adapts automatically. Contract tests (`appearance-contract.test.ts`, `globals.test.ts`, `nodeBrandContract.test.ts`, `AdaptiveAppearanceAudit.test.ts`) enforce roles and contrast — never hardcode hexes in components.

## Keyboard Shortcuts

- `Cmd/Ctrl + Enter` — run workflow; `Cmd/Ctrl + C/V` — copy/paste nodes
- `Shift + P/I/Y/G/V/L/A/T/R` — add prompt / image input / video input / generate image / generate video / LLM / annotation / audio / router node
- `H` / `V` / `G` — stack selection horizontally / vertically / in a grid
- `F` — open the fullscreen media viewer on a selected generation node
- `?` — show all shortcuts

## localStorage Keys

All keys use the `current-` prefix (see `src/store/utils/localStorage.ts` for the full list): `current-workflow-configs`, `current-workflow-costs`, `current-generate-image-defaults`, `current-provider-settings`, `current-node-defaults`, `current-appearance`, `current-ftux-completed`, `current-inline-parameters`, and friends. `migrateLegacyLocalStorage()` transparently migrates any pre-rename keys on boot — never reintroduce the retired legacy prefix for new keys.

## Git Workflow

- The primary development branch is `develop`, NOT `main` or `master`
- Always checkout `develop` before creating feature branches: `git checkout develop`
- Create feature branches from `develop` using: `feature/<short-description>` or `fix/<short-description>`
- All PRs MUST target `develop`: use `gh pr create --base develop`
- Never push directly to `main`, `master`, or `develop`

## Commits

- Commit after each logical task or unit of work is complete. When implementing a multi-task plan, commit after finishing each task — do NOT batch all tasks into a single commit at the end.
- Each commit should be atomic and self-contained: one task = one commit.
- The .planning directory is untracked; do not attempt to commit any changes to the files in this directory.
