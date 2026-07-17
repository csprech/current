# Competing with ElevenLabs Flows & FLORA: Teardown, Gaps, and the Open-Source Play

**Date:** 2026-07-17 · **Scope:** Node-UX teardown of ElevenCreative Flows (elevenlabs.io/flows) and FLORA (flora.ai), an inventory of Current's shipping capabilities, a gap analysis, and a prioritized roadmap for making Current the go-to open-source option for people who want this functionality on their own terms.

**Sources:** Official docs and blogs of both products, tutorial walkthroughs, FLORA's public SDK docs, and FLORA's live models API (queried 2026-07-17). Codebase claims cite `file:line`.

---

## 0. Executive summary

- **The category converged on one interaction model.** Both competitors treat the *node as a mini-app*: inline prompt, in-node model picker, in-node output preview with a generation-history carousel, a per-node Run button with the price shown before you click, and per-node re-run as the primary loop (full-graph runs are secondary or absent). Both added an in-canvas agent that builds and edits workflows conversationally, with spend-approval modes. Both monetize via metered credits/usage on their model pool.
- **Current is closer than our own docs admit.** We already ship 25 node types, per-node Run, drag-from-port node suggestions, in-node history carousels, an AI workflow assistant, loops/branches/batching/parallelism, model fallback (neither competitor has it), 7 BYO providers, local-first projects, and portable workflow JSON. CLAUDE.md documents less than half of this.
- **The visible gaps are concentrated in the node card itself:** no inline prompt, no visible price at the point of action, a ⋯ menu containing only "Delete," no variant count, no in-place inpaint/outpaint/crop, and an assistant that only knows 10 of our 25 node types.
- **Both competitors leave the "own terms" flank wide open:** FLORA has no self-hosting, no BYO keys, no local models, and no user-facing workflow export; Flows has no API at all (waitlist), no portable graph format, and a US-gated model catalog. Neither can run a single node offline or for free.
- **Strategy in one line:** close the in-node UX gap (P0), ship the free/local action-node pack and in-place editing (P1), then win on what closed platforms structurally can't do — headless CLI/API runs, an MCP server, local models via ComfyUI/Ollama, and at-cost BYO-key economics (P2).

---

## 1. ElevenLabs Flows (ElevenCreative Flows)

Node-based canvas inside the ElevenCreative platform for chaining image, video, voice, music, and SFX models. Launched March 11, 2026, still explicitly **Alpha**. Real-time collaboration added May 1, 2026; "Flows Agent" (prompt-to-workflow) added June 4, 2026. Positioned at performance-marketing and creative teams: "Create once and generate unlimited campaign variations instantly."

### 1.1 Node catalog

- **Generation:** Text to Speech (Eleven v3, voice library/cloning), Image Generation ("50+ models"), Video Generation, Music, Sound Effects.
- **Processing/utility:** Text (prompt input), Upload Media, Composition (layered A/V preview node), Lipsync (speech + video/image), Upscale (Topaz, 1x–4x + fps conversion), Edit Image (image + reference inputs).
- **Models:** Sora 2/Pro, Veo 3.1 (+Fast), Kling 2.5–3.0/O1/O3 (+Edit, Motion Control), Seedance 1–2, Wan 2.5/2.6, GPT Image, Nano Banana / Pro, Flux Kontext Pro, Krea, Seedream 4–5, Runway Gen-4 Image, OmniHuman 1.5, HeyGen Avatar IV, Sync Lipsync-2 Pro, Veed LipSync.
- Caveats they carry: the Chinese-model catalog (Kling, Seedance, Seedream, Wan, OmniHuman) is **not available in the US**, and enterprise workspaces have all image/video models disabled until admins approve them.

### 1.2 What you can do inside a single node

| Capability | Detail |
|---|---|
| Inline model picker | Dropdown in the node's settings area (bottom of card); swap models without rewiring |
| Inline prompt + params | Prompt field, aspect ratio, resolution, duration; params adapt to the model; up to **4 variations per run**; negative prompt; audio on/off |
| Output preview in node | Media renders inside the card; Composition node acts as a larger layered preview |
| Per-node Run | Each node has its own Run button — per-node execution is the *primary* model |
| **Cost preview on hover** | Hovering Run shows the credit cost before committing |
| **Per-node generation history** | Cycle through a node's past generations in place |
| **Run from here** | Re-runs everything downstream; untouched branches keep outputs |
| @-referencing | In Edit Image, `@` in the prompt tags a specific connected reference image |
| Comments | Attach to nodes, connections, or outputs; resolved in place |

Failure handling: a failed node affects only itself and **is not charged**.

### 1.3 Connection & canvas UX

- Drag output port → input port; ports typed (image → video start-frame, speech → lipsync, video → composition).
- **Drag-from-port suggestions:** releasing a connection on empty canvas opens a menu of *compatible* next nodes (e.g. video output → "Mix with audio" spawns a Composition). Their primary graph-building gesture.
- Node insertion: right-click canvas, bottom toolbar, port-drag menu, or the Agent. New flows start blank or from center-canvas preset templates ("Perfume Ad", "E-commerce Store").
- Flows keep executing after the tab closes (server-side execution).

### 1.4 Flows Agent (prompt-to-workflow)

Chat side panel: describe a goal, the agent asks clarifying questions, picks models, places and wires nodes, and can run them — including editing *existing* flows conversationally. Three permission modes: **Approve each**, **Auto-run**, **Auto under threshold** (confirm only when a single action exceeds a user-set credit amount). Agent chat billed by tokens; generations at standard rates. Collaborators watch the agent build in real time.

### 1.5 Templates & collaboration

- **Templates:** any flow → "Create Template"; author marks typed input nodes (image/video/audio/text) and output nodes; consumers run it as a form *without seeing the graph*, including from the mobile app. Visibility: Just me / Workspace / Link only / Explore (reviewed community gallery).
- **Multiplayer (May 2026):** live cursors, shared execution results, Follow mode, inline comments, Basic Seats for reviewers, public flows with anonymous viewers.

### 1.6 Pricing & execution economics

Credits at the same rate as their standalone tools: Free $0/10k credits → Starter $6/30k → Creator $22/121k → Pro $99/600k → Scale $299/1.8M → Business $990/6M. Video generation requires a paid plan. Third-party estimates: Sora 2 Pro ≈ 12k credits/run, Veo 3.1 ≈ 8k credits per 4–8s clip; full pipelines 2k–25k credits per run. Re-runs charge again; credits expire on downgrade.

### 1.7 Exploitable gaps

1. **No API** — programmatic execution is a waitlist item; no CMS/batch integration today.
2. **No portable graph format** — no documented workflow import/export; flows are locked in.
3. **US model gating** removes a large share of the "50+ models" for US users.
4. **Credit lock-in**; no local or open models; every experiment is metered.
5. Alpha instability; timeline finishing requires a handoff to their Studio product.

---

## 2. FLORA ("The AI-powered canvas for designers, brand teams, and agencies")

The category leader. Launched March 2025 (#1 Product Hunt), **$42M Series A led by Redpoint (Jan 27, 2026; $52M total)**; customers include Pentagram, Lionsgate, Nike, Brex. Ships product updates **weekly** (~70 changelog entries). Founder thesis: "the model does not matter... It's about the interface" — FLORA is an orchestration/interface layer over ~366 model endpoints.

### 2.1 Node taxonomy

One generation node per modality — the node's *mode* changes based on what you wire into it:

- **Text** (t2t / i2t / v2t / a2t; reasoning-depth selector + web-search toggle), **Image** (t2i / i2i / multi-reference), **Video** (t2v / i2v with first/last/both frames, a2v), **Audio** (TTS/music/SFX with waveform, voice selector, and *automatic model routing* by intent), **Document** (PDF → text/images).
- **Utility nodes:** **Action** (37 deterministic non-AI ops: color-grade/tint/blur/rotate/flip/AR-change/composite/add-text/QR for images; stitch/split/reverse/boomerang/speed/greenscreen/resize/extract-frames/frame-grid/Ken-Burns/long-exposure for video; split/merge A↔V; split/replace/concat for text), **Batch** ("for each" over ≤100 items, CSV import, parallel downstream runs), **Router** (many-in/one-out pass-through hub), **Export** (download in every format incl. SVG vectorization and ProRes, or push to Google Drive/Dropbox), **Technique** (a packaged workflow as a single node), **Element** (reusable subject/character reference, @-mentionable in prompts), **Layer Editor** (Figma-like compositor node: layers, transforms, typography, masking → flattened image), **Timeline Editor** (10-track NLE in a node — see 2.6).
- No 3D modality anywhere. Groups/containers + comments + color tags for organization.

### 2.2 Model catalog: ~366 endpoints (counted live via their API, 2026-07-17)

| Type | Count | Notable |
|---|---|---|
| Image | 142 | Nano Banana 1/2/Pro, Flux 2 family (7 variants), GPT Image 1/1.5/2, Grok Imagine, Ideogram 3/4 + Character, Imagen 3/4, Krea 2, Qwen Image 2 + Edit (incl. camera-angle variants), Recraft V3–V4.1 (+vector), Seedream 3–5, SD 3.5, Z-Image; BiRefNet bg-removal ($0.002); Magnific + Topaz upscalers; inpainting/outpainting endpoints |
| Video | 167 | Kling 2.x–3.0/O1/O3 (+Edit/References/Motion Control/Avatar), Veo 2–3.1 (+Fast/Lite/Frames), Sora 2 Pro, Runway Gen-4.5, Seedance 1–2, Hailuo, Luma Ray 2, LTX-2, Pika, WAN 2.2–2.7 (+Animate), Marey motion/pose transfer; lipsync (Sync 3, Lipsync 2 Pro, VEED); MMaudio video→audio; VEED subtitles/bg-removal; Magnific/Topaz/Bria video upscalers; frame morphing |
| Audio | **4** | ElevenLabs Multilingual v2 TTS, ElevenLabs Music, ElevenLabs SFX, Gemini 3.1 Flash TTS |
| Text | 53 | Claude Opus 4.5–4.8 / Sonnet 4.5–5, GPT-4o-mini–GPT-5.5, Gemini 2.5–3.1, o3 Deep Research, ElevenLabs Scribe v2 transcription; i2t/v2t vision variants |

**Two architectural lessons:**
1. **Models are data, not code.** Model IDs are capability-prefixed (`t2i-`, `i2i-`, `is2i-`, `f2v-`, `av2v-`, …) and every model self-describes its parameter UI via a schema (label, type, enum options, min/max, defaults, required — even `seed` is a first-class type). The node renders whatever the registry says. Nobody hand-wires 366 endpoints; they aggregate brokers (fal, Runware, Vertex, …). Our `/api/models` + `ModelParameters` is the same pattern — it needs to become the *only* pattern (`src/app/api/models/route.ts`, `ModelParameters.tsx`).
2. **Cost is a first-class runtime value.** Every run returns `charged_cost` and `estimated_seconds`; the UI shows the exact price on the Run button *before* generation.

### 2.3 Inside a single block (their core UX)

| Capability | Detail |
|---|---|
| Prompt overlay on the node | Prompt box floats on the card; **H** hides/shows prompt overlays for a clean view |
| In-node model menu | Searchable, **pinnable favorites**, grouped by provider, keyboard-navigable, plus **"Auto Mode"** where FLORA picks the model |
| In-node params | Aspect ratio/resolution/duration/seed etc., rendered from the model's schema; resolution + cost shown by default |
| **Price on the Run button** | Exact cost pre-generation; "show costs in dollars" toggle (default is a % "flower meter") |
| Prompt improver | Button in the prompt box: writes a prompt if empty, improves it if filled |
| Hover toolbar above node | Color tag, Download (format dropdown; number keys pick format), Download-all ZIP, open in Layer/Timeline editor, share link, duplicate |
| **In-node history (≤100)** | Carousel of past generations; keyboard/trackpad navigation; duplicate/export any past result; setting for whether new variations land **in-node or on-canvas** |
| Fullscreen viewer | **F** or double-click → viewer with file size/resolution/cost metadata + a grid of that node's history; magnifier; 150MP previews |
| **Edit in place** | **Inpaint** (5–100px brush, mask, per-stroke undo; result spawns a *new node*, original preserved; @-mention canvas nodes inside inpaint prompts), **Outpaint** (drag handles on edges), **Crop**, **Split Into Layers** (2–5 layers) |
| Replace Block | Right-click any image/video block → swap content without rebuilding the graph |
| **Bulk Parameters Panel** | Select 2+ same-type blocks → right sidebar edits shared params across all ("Mixed" indicator on divergent values; bulk model switch) |
| Batch grids | Grid generation with **single-cell rerun** (regenerate one cell without re-running the batch) |
| Upscale/enhance | Not buttons — upscalers are just models in the same node (Topaz/Magnific/Enhancor) |

### 2.4 Connections & canvas

- Drag the **+ handle** to connect; drag onto empty canvas → quick-add picker. Multi-input with **drag-to-reorder** of connected inputs. You can wire **in-progress nodes** — readiness is validated at generation time, not connection time. Auto-pan while dragging.
- Double-click canvas to spawn a node; left toolbar: add-node menu, Assets, Generation History, **Flows** (starter workflows with hover previews + node counts), Split Into Layers, Comment.
- Shortcuts: Enter = run selected, **Cmd+F canvas search by node title**, H prompt overlays, R router, Shift+T technique picker, F fullscreen, Cmd+\ toggle toolbars.
- **Execution is per-node/pull-based — there is no "run all" button.** Chains run via Techniques (packaged graph, one click), Batch fan-out, FAUNA, or manually. Cancel mid-run; **failed generations auto-refund**; queue with prioritization.
- **Multiplayer** (Liveblocks + Convex under the hood), comment bubbles, share links (view-only works on mobile), **Publish to Community** (public remixable-project gallery), node-level share links. Canvas scales to 1200+ nodes on a WebGL renderer.
- Not found anywhere: project version history, user-facing workflow JSON export, offline/local anything.

### 2.5 FAUNA — the in-canvas agent ("It's not a chatbot. It has hands")

Cmd+/ sidebar; reads the canvas, adds/connects/configures nodes, picks models, runs up to 50 nodes, arranges and groups, operates the Layer Editor. **Assist mode** shows the planned nodes + estimated cost and requires approval (Cmd+Enter); **Auto mode** just goes. Context: selected nodes (≤15), @-mentions, image attachments, PDFs; streaming with a visible thinking timeline; per-project persistent sessions. **Free on all plans** (it drives paid generations). Internally FAUNA reads/writes the canvas as a **Mermaid flowchart** — the same serializer their public API exposes (`projects.canvas.retrieve/update` with a `node_params` side-table). Mermaid is their agent-interop IR.

### 2.6 Techniques, mega-nodes, and the API

- **Techniques = workflows as products:** packaged graphs with typed inputs/outputs (`text | imageUrl | videoUrl | audioUrl | documentUrl`), declared run cost + estimated time, creator attribution, categories, review queue for community publishing, favorites — runnable **as an app without the canvas**, as a single node inside another canvas, or **headlessly via API/CLI** (async/stream, callback URLs, idempotency keys, run history with per-run charged cost). Their blog claims DTC brands run techniques 20,000+ times/month via API.
- **Timeline Editor (GA Jul 3, 2026):** a 10-track NLE inside a node — clips stay **live-linked to source nodes** ("always uses each node's latest generation"; right-click clip → Go to Node), trim/split/snap, captions, Google Fonts, server-side MP4 render lands back on canvas, **EDL/XML/FCPXML export** for pro NLEs. No keyframes yet. Paid plans only.
- **Layer Editor:** Figma-style compositor node (layers, transforms, typography, shapes, stencil masks → flattened image output).
- **API + MCP + CLI (May 19, 2026, Starter+):** npm SDK `@flora-ai/flora`, `flora` CLI, MCP server with OAuth into Claude/ChatGPT/Cursor. Resources: models (self-describing schemas), generations, runs, techniques, assets, and **canvas retrieve/update via Mermaid patches** — programmatic workflow building along the same path FAUNA uses.

### 2.7 Pricing (3 pivots in 14 months — instructive)

Now: per-seat dollar budgets — Free (≈17 lifetime generations, text+image only, no API) / Starter $18 / **Pro $50** / Max $200 per seat/mo, usage pooled across the team, 20% off annual, opt-in capped overage at **no markup**, per-generation dollar amounts visible everywhere, FAUNA free. History: classic credits (2025) → pooled credits with unlimited members (Jan 2026) → per-seat dollar budgets (May 2026). Reviewer verdict on the credit era: "credits made every generation a small financial decision, and creative work doesn't survive that." They converged on **maximum price transparency** as the fix — worth copying, since our BYO-key model is even more transparent.

### 2.8 Exploitable gaps

1. **No self-host, no BYO keys, no local models** — all inference through their broker pool; no LoRA/ControlNet/custom-node story (ComfyUI keeps that crown).
2. **No user-facing workflow export** and no project version history — canvases live and die in their cloud.
3. **Audio is thin** (4 endpoints) and **3D is absent**.
4. **Deterministic ops are metered** — even a flip or blur bills platform usage; output URLs are "long-lived but not permanent."
5. No parametric pixel tools (no Levels/Curves); repairs are generative only.
6. API requires a paid seat; poll-only (no webhooks); reviewers note single-API-key limits.

---

## 3. Current today

Current (`package.json` name `current`, v1.6.0, MIT) is further along than our own docs admit — CLAUDE.md documents 10 node types; the app ships **25**.

### 3.1 Node catalog (25 types)

- **Inputs:** imageInput, videoInput, audioInput, prompt, array (split text → items, batch mode), promptConstructor (`@variable` templates), glbViewer.
- **Generators:** nanoBanana/GenerateImage, generateVideo, generateAudio, generate3d, llmGenerate.
- **Processing:** annotation (Konva draw), splitGrid, removeBackground (client-side @imgly — zero API cost), imageCompare (before/after slider), videoStitch, videoTrim, videoFrameGrab, easeCurve (speed curves).
- **Routing:** router, switch (toggled named outputs), conditionalSwitch (text rules).
- **Outputs:** output (lightbox, auto-run on connect), outputGallery (grid + lightbox + "Extract" back to input nodes).
- Handle types: `image | text | audio | video | 3d | easeCurve` with per-type colors (`src/types/nodes.ts:554`, `src/components/nodes/nodePresentation.ts:42-55`).

### 3.2 What our nodes already do inside the card

- **Floating header** (portal above node): role glyph, provider badge, rename, per-node comment + comment navigation, expand-editor (prompt/annotation/splitGrid), **per-node Run** for all six runnable types, ⋯ menu (`src/components/nodes/FloatingNodeHeader.tsx`).
- **In-node model pickers:** provider dropdown (Gemini / fal — works keyless rate-limited / Replicate / Kie / WaveSpeed), Gemini inline controls (model, AR, resolution, search grounding), schema-driven `ModelParameters` for external providers with a 48h schema cache, "Browse" opens the full `ModelSearchDialog` with capability filters (`GenerateImageNode.tsx:534-641`).
- **Output in the node:** media preview with Download/Clear overlays and a **history carousel** (`n / N`) over past generations (`GenerateImageNode.tsx:773-826`); waveform + transport for audio; autoplaying video preview.
- **Dynamic typed handles from model schemas** — Generate Video grows image/video/audio/text inputs to match the selected model (up to 9 reference images, last-frame, reference video/audio for Seedance 2) (`GenerateVideoNode.tsx:447-693`).
- **Model fallback:** per-node Primary/Fallback tabs; on failure the fallback runs once and the output is stamped "Fallback used" — **neither competitor has this** (`src/store/execution/runWithFallback.ts`).
- **Status footer** on every node: state dot, provider·model, progress %, "Run again to retry" (`NodeStatusFooter.tsx`).

### 3.3 Canvas & workflow UX

- **Drag-from-port menu** (type- and direction-aware compatible-node list + instant actions like "Split Grid Now") — parity with Flows' signature gesture, shipped (`src/components/ConnectionDropMenu.tsx`).
- **AddPalette** searchable node catalog with recents; multi-select toolbar (stack H/V, grid, group, ZIP download); **EdgeToolbar** with pause toggle, loop count (1–100), image-sequence numbering.
- **Workflow Assistant (Beta):** streaming chat with `answerQuestion` / `createWorkflow` / `editWorkflow` tools, can scope to selected nodes; plus launchpad "describe a workflow" (`src/lib/chat/tools.ts`, `src/app/api/quickstart/propose/route.ts`).
- Asset library (drag to canvas), global image history, **filesystem version history with restore** (FLORA has nothing comparable), undo/redo, light/dark, groups with lock + colors, guided tutorial + API-key onboarding.

### 3.4 Execution engine

Topological levels with **parallel execution** (configurable concurrency 1–10), four run scopes (entire / from node / selected node / selection), **pause edges**, **loop edges** (1–100 iterations), conditional branch dimming with preserved outputs, optional-input skip propagation, locked-group skipping, **array batch mode** across generators, abortable runs, client-side polling for long tasks (`src/store/workflowStore.ts:1479-1643`). No result caching yet — every run re-executes.

### 3.5 Providers & the "own terms" story (already real)

- **7 BYO providers** — Gemini, OpenAI, Anthropic, Replicate, fal.ai, Kie.ai, WaveSpeed — configurable via `.env` **and** in-app Project Settings (browser-stored keys override env; per-request key headers) (`ProjectSetupModal.tsx:539-880`).
- **Dynamic model discovery** for fal/Replicate/WaveSpeed merged with curated Gemini/Kie registries behind one `/api/models` endpoint with capability filters (`src/app/api/models/route.ts:1206-1465`).
- **Local-first:** projects are plain OS directories (workflow JSON + `inputs/` + `generations/`), auto-save every 90s, media externalized to disk; **portable shareable JSON export/import** — something neither Flows nor FLORA offers (`src/utils/shareableWorkflow.ts`).
- MIT license; runs with `npm install && npm run dev`.

### 3.6 Honest weaknesses (self-audit)

1. **No inline prompt in generation nodes** — prompts require a wired Prompt node; both competitors let you type in the node.
2. **No per-node variant count** (Flows: up to 4 per run; FLORA: batch grids with single-cell rerun) — batching requires an upstream Array node.
3. **No cost at the point of action** — the cost indicator is Gemini-accurate only and hides itself when other providers are present (`utils/costCalculator.ts:259-278`).
4. **Node ⋯ menu contains only Delete** — no duplicate, run-from-here, bypass, or lock at node level (`FloatingNodeHeader.tsx:644-665`).
5. **Assistant coverage lags the product:** chat editing knows 10 of 25 node types, quickstart 8 (`src/lib/chat/tools.ts:12-23`).
6. **Templates are read-only** from a hardcoded remote (`nodebananapro.com`); no publish path, no typed-input "run as form" consumption (`src/app/api/community-workflows/route.ts`).
7. **No headless execution** — no CLI, no run-workflow API, no MCP server.
8. **Audio story thin:** no ElevenLabs/OpenAI-TTS wiring, no voice UI; audio only via fal/Kie/WaveSpeed catalogs.
9. **No local model providers** (Ollama / ComfyUI / local SD) despite the local-first pitch; only bg-removal runs on device.
10. **No in-place editing** (inpaint/outpaint/crop) — annotation draws on images but there's no masked regeneration loop.
11. **No multiplayer**; comments are single-user sticky notes. Docs drift: CLAUDE.md names the old product and stale models.

---

## 4. Node UX gap analysis

### 4.1 Inside-the-node comparison

| Capability | Flows | FLORA | Current |
|---|---|---|---|
| Inline prompt in node | ✅ field in card | ✅ overlay, H to hide | ❌ requires Prompt node |
| In-node model picker | ✅ dropdown | ✅ searchable + favorites + Auto Mode | ✅ provider + model + Browse dialog |
| Params from model schema | ✅ | ✅ self-describing registry | ✅ (`ModelParameters`) |
| Output preview in node | ✅ | ✅ | ✅ |
| Per-node Run | ✅ primary model | ✅ primary model (no run-all!) | ✅ (+ run-all, run-from-node, run-selection) |
| **Price at point of action** | ✅ hover on Run | ✅ printed on Run button | ⚠️ partial, hides for non-Gemini |
| In-node generation history | ✅ cycle | ✅ ≤100 + fullscreen grid | ✅ carousel (no grid/fullscreen) |
| Variants per run | ✅ up to 4 | ✅ batch grids + single-cell rerun | ❌ (Array node workaround) |
| Run from here (downstream) | ✅ | n/a (pull-based) | ✅ engine supports; buried in toolbar menu |
| In-place inpaint/outpaint/crop | ❌ (Edit Image node only) | ✅ result = new node | ❌ (annotation only) |
| @-mention references in prompts | ✅ Edit Image | ✅ Elements + inpaint prompts | ⚠️ `@variables` in promptConstructor only |
| Duplicate / replace media | ? / ❌ | ✅ hover toolbar / right-click | ❌ (⋯ menu has only Delete) |
| Bulk-edit params across nodes | ❌ | ✅ right-panel on multi-select | ❌ |
| Fullscreen viewer w/ metadata | ⚠️ Composition node | ✅ F / double-click | ⚠️ Output-node lightbox only |
| Model fallback on failure | ❌ (refund only) | ❌ (refund only) | ✅ **unique** |
| Failure economics | not charged | auto-refund | free retry (your keys, your call) |

### 4.2 Button-placement conventions (what users now expect)

Both competitors converged on the same anatomy; ours matches it in most places:

- **Above the card (hover-reveal):** identity + management — title, color/tag, duplicate, download, share, open-in-editor. *Ours: FloatingNodeHeader — matches; needs more actions in ⋯.*
- **On the media (hover-reveal, top-right):** Download / Clear / fullscreen. *Ours: matches.*
- **Bottom of card (persistent):** model + settings + Run — the "commit" zone. Cost lives here (on or beside Run). *Ours: settings collapse below the card, Run lives in the floating header — the one placement we deviate on; cost is absent.*
- **Overlay on media:** prompt (FLORA) with a global hide toggle. *Ours: absent.*
- **Right side panel:** only for multi-select bulk editing (FLORA) or agent chat. *Ours: assistant panel exists; no bulk edit.*
- **History:** in-card carousel arrows + counter; fullscreen grid for depth. *Ours: carousel yes, grid no.*

### 4.3 Where we're already ahead

Flow control (loops, pause edges, conditional routing, parallelism with a concurrency dial), model fallback, four run scopes, portable JSON, filesystem version history, BYO keys with 7 providers, keyless fal tier, client-side background removal, 3D generation + GLB viewing, video utility nodes, and MIT-licensed self-hosting. **These are exactly the "power user / own terms" features the closed platforms don't ship** — the roadmap should protect and amplify them, not trade them away.

---

## 5. Roadmap

Ordered by (user-visible impact ÷ effort), node UX first per our focus. Effort: S ≤2 days, M ≤1 week, L multi-week.

### P0 — Close the in-node gap (the first-five-minutes experience)

1. **Inline prompt on generation nodes** (M). Textarea in the card (persist to `data.prompt`); connected text still takes precedence, shown as a "linked" chip that can be detached. Add FLORA's `H` shortcut to hide prompt overlays globally. Files: `GenerateImageNode/Video/Audio/3D`, `getConnectedInputs` precedence in `workflowStore.ts`, `KeyboardShortcutsDialog`.
2. **Cost on the Run button** (M). Estimated cost as a label on per-node Run and the global RunControl, tooltip with the breakdown; "Show costs in dollars" preference. Extend `costCalculator.ts` to read pricing from the model registry (Kie entries already carry pricing; fal/Replicate show "~" or "—" rather than hiding the whole indicator). Both competitors treat visible price as the trust feature; for us it doubles as the BYO "at-cost" pitch.
3. **Fill the ⋯ node menu** (S–M). Duplicate, Run from here (engine already supports `executeWorkflow(nodeId)`), Bypass/mute node, Replace media (right-click swap à la FLORA), Copy output, Open fullscreen. Files: `FloatingNodeHeader.tsx:644-665`, small store actions.
4. **Variants per run** (M). `variantCount` 1–4 on generation nodes → N parallel calls landing in the existing history carousel, with a "new variants: in-node / on-canvas" preference later. Reuses `batchExecution` machinery.
5. **Fullscreen viewer + history grid** (M). Generalize the Output-node lightbox: F / double-click any media node → viewer with metadata (model, params, cost, resolution) + grid of that node's history; "promote history item to new node."
6. **Docs refresh** (S). Rewrite CLAUDE.md (25 nodes, real providers, Current branding) — it's the contributor onboarding surface and it's 60% stale.

### P1 — Editing-in-place & the free action pack

7. **Inpaint / outpaint / crop in place** (L). We already own a Konva annotation surface — extend it into a mask brush; masked edits call i2i models that support it; result spawns a **new node wired from the original** (FLORA's non-destructive convention). Files: `AnnotationModal`, new executor, `ConnectionDropMenu` entry.
8. **Action-node pack: match FLORA's 37 deterministic ops, free and local** (L, parallelizable). We have ~8 (annotation, splitGrid, removeBackground, stitch/trim/frameGrab/easeCurve, compare). Ship the delta — rotate/flip/AR-change/blur/tint/color-grade/composite/add-text/QR; video reverse/speed/greenscreen/frame-grid/Ken-Burns; audio split/merge — via ffmpeg.wasm + canvas, zero API cost. **Marketing line writes itself: FLORA meters a blur; Current runs it on your machine for free.**
9. **Teach the assistant the whole product** (M). Chat `editWorkflow` knows 10/25 types, quickstart 8/25 — generate both whitelists from `nodeCatalog.ts`, add cost estimates to proposals, and adopt Flows' three permission modes (approve each / auto / auto-under-$X). Files: `src/lib/chat/tools.ts:12-23`, `quickstart/propose/route.ts:43-52`.
10. **Bulk parameters panel** (M). Multi-select same-type nodes → side panel editing shared params with "Mixed" indicators; pairs with existing MultiSelectToolbar.

### P2 — The open-source moat (what they structurally can't ship)

11. **Headless runner: CLI + local API** (L). `current run workflow.json --input image=./a.png --output ./out/` and `POST /api/run` with typed inputs — the exact thing FLORA charges seats for and Flows has on a waitlist, self-hosted and free. The execution engine is already isolated in the store; extract to a shared module.
12. **Typed-input templates + open publishing** (M–L). Mark nodes as template inputs/outputs (groups already have an `isNbpInput` flag — generalize it), run any workflow "as a form" without seeing the graph, and publish templates via a **GitHub-based community repo** (PR = review queue) instead of the hardcoded `nodebananapro.com` fetch. Both competitors gate this behind their cloud; ours becomes a genuinely open marketplace.
13. **MCP server** (M). Expose build/edit/run/list-models over MCP so Claude/Cursor/ChatGPT drive a *local* Current — FLORA's May-2026 launch validated demand; ours needs no OAuth, no seat, no cloud. Adopt **Mermaid import/export** as the agent IR (the same convention FLORA standardized) — it also becomes our workflow-sharing shorthand.
14. **Local model providers** (L). ComfyUI adapter (image/video via its HTTP API) + Ollama for LLM nodes → workflows that run **fully offline, at zero marginal cost, private by construction**. No commercial canvas can follow. This completes the "own terms" story our README already promises.
15. **ElevenLabs BYO-key audio provider** (M). Their models (TTS/Music/SFX) through the user's own key at API cost — attacks Flows' moat with their own catalog and fixes our thinnest modality. FLORA resells exactly these 4 endpoints.

### P3 — Later, deliberately

- **Caching / skip-unchanged execution** (memoize node outputs on input-hash; makes big graphs cheap to iterate).
- **Elements-style reusable subject references** with @-mentions in prompts.
- **Timeline-lite**: we have stitch/trim/ease/frame-grab; a simple multi-track sequencer node with live node links can wait until the P2 items land — FLORA needed 16 months to get there.
- **Multiplayer**: highest-cost, lowest-differentiation item for a local-first tool; revisit only with a clear collaboration story (e.g. CRDT on top of project files). Meanwhile, portable JSON + git-friendly projects are our version of collaboration.

### Positioning one-liner

> **Current — the open-source AI canvas. Same nodes, same models, your keys, your disk, your rules.**
> Every generation at provider cost (no credit markup). Every workflow a portable JSON file you can run headless, version in git, and share without a seat license. Every deterministic edit free and local. And when you want models with no API at all — run them on your own GPU.

---

## Appendix: source index

- Flows: elevenlabs.io/flows · docs (eleven-creative/products/flows, /templates, playground/image-video) · blogs: introducing-flows-in-elevencreative, flows-collaboration, introducing-flows-agent · pricing · Product Hunt · tutorial transcripts (gotranscript, feisworld, elevenlabsmagazine).
- FLORA: flora.ai (+ /pricing, /updates ~70 entries, /techniques, /blog: manifesto, introducing-fauna, introducing-timeline-editor, introducing-the-flora-mcp-api-cli, a-new-pricing-model) · docs.flora.ai (nodes/*, editor/*, plans-and-billing/*) · developer.flora.ai · live model catalog + SDK docs via FLORA's public MCP (2026-07-17) · TechCrunch (Mar 2025 launch; Jan 2026 Series A) · third-party reviews (brandgene, pollo.ai, digitalizelife, basedlabs, chasejarvis Weavy-vs-Flora).
- Current: repository at `src/` as of branch point `be5770e` (v1.6.0); claims cite file:line above.
