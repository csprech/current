# Current

Current is a desktop-first visual workspace for building AI media workflows. Arrange nodes on an infinite canvas, connect typed inputs and outputs, then run the flow in dependency order.

It is designed for creative work that benefits from seeing the entire process: reference images, prompts, generations, edits, audio, video, and final outputs all stay in one place.

## What you can build

- Image generation and editing workflows
- Prompt and LLM-assisted text chains
- Video, audio, and 3D generation pipelines
- Reusable workflow templates and local project files
- Multi-step creative processes with typed image, text, and audio connections

## Highlights

| Capability | Details |
| --- | --- |
| Visual canvas | Drag, connect, group, pan, zoom, and inspect workflows on a desktop canvas. |
| Typed connections | Image, text, and audio handles prevent incompatible connections. |
| AI generation | Run supported Gemini, OpenAI, and Kie.ai models from a single workflow. |
| Creative tools | Annotate images, split grids, compare results, trim video, and preview GLB files. |
| Local projects | Save workflow files and media to a local project directory. |
| Outputs workspace | Review generated work, reopen it on the canvas, and manage assets from one place. |
| Bring your own keys | Add provider API keys in Project Settings or with environment variables. |

## Quick start

### Requirements

- Node.js 20.9 or later
- npm
- A provider API key for the models you plan to run

### Install and run

```bash
git clone https://github.com/csprech/current.git
cd current
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you do not create `.env.local`, you can add API keys from the key button in the command bar once the app is running.

## Configuration

Create `.env.local` in the repository root when you prefer local environment configuration:

```env
# Required for Gemini image generation and Gemini-backed workflow features
GEMINI_API_KEY=your_gemini_api_key

# Optional providers
OPENAI_API_KEY=your_openai_api_key
KIE_API_KEY=your_kie_api_key
```

Keep `.env.local` private. It should never be committed.

## Core workflow

1. Create a canvas or open a project.
2. Add input, prompt, generation, and output nodes from the canvas tools.
3. Connect matching handles. Image connects to image, text to text, and audio to audio.
4. Select a node to adjust its model and parameters in the inspector.
5. Run with the command bar or `Cmd/Ctrl + Enter`.
6. Review results in Outputs, then reuse an asset or continue refining the workflow.

## Included node families

| Family | Examples |
| --- | --- |
| Inputs | Image Input, Audio Input, Prompt |
| Generation | Image, LLM, Audio, Video, and 3D generation |
| Transform | Annotation, Split Grid, Video Trim, Video Frame Grab, Image Compare |
| Control | Array, Router, Switch, Conditional Switch, Ease Curve |
| Output | Output and Output Gallery |

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + Enter` | Run the workflow |
| `Shift + P` | Add a prompt node |
| `Shift + I` | Add an image input node |
| `Shift + G` | Add an image generation node |
| `Shift + L` | Add an LLM node |
| `Shift + A` | Add an annotation node |
| `?` | Show all shortcuts |

## Development

```bash
npm run dev       # Start the local Next.js server
npm run test:run  # Run the Vitest suite once
npm run lint      # Run linting
npm run build     # Create a production build
npm run start     # Serve a production build
```

### Architecture

- **Next.js App Router** for the desktop web application
- **React Flow** for the node editor and typed connections
- **Zustand** for workflow state, execution, and persistence
- **Konva** for image annotation

The main workflow engine lives in [`src/store/workflowStore.ts`](src/store/workflowStore.ts). The canvas and connection rules are in [`src/components/WorkflowCanvas.tsx`](src/components/WorkflowCanvas.tsx).

## License

MIT. See [LICENSE](LICENSE).
