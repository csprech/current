"use client";

/**
 * AppWorkspace — run the current workflow as a form, no canvas required.
 *
 * Input-family nodes become typed fields (text area / media pickers) in
 * canvas reading order; Run executes the same store pipeline as Cmd+Enter;
 * output nodes render their results underneath. Fields can be hidden from
 * the form (isTemplateInput: false), which is also what the shareable
 * export's template interface reflects — so what you see here is exactly
 * what API/CLI callers get as typed inputs.
 */

import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkflowStore } from "@/store/workflowStore";
import { describeTemplateInterface, type TemplateInputDef } from "@/lib/workflow/templateInterface";
import { CurrentButton } from "@/components/current/CurrentButton";

const FIELD_DATA_KEY: Record<string, string> = {
  prompt: "prompt",
  imageInput: "image",
  videoInput: "video",
  audioInput: "audioFile",
};

const FILE_ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function MediaField({ def, value, onChange }: {
  def: TemplateInputDef;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    onChange(await readFileAsDataUrl(file));
  };

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className="flex items-start gap-3">
          {def.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={def.name} className="h-24 w-24 object-cover rounded-md border border-neutral-700" />
          )}
          {def.type === "video" && (
            <video src={value} controls className="h-24 rounded-md border border-neutral-700" />
          )}
          {def.type === "audio" && <audio src={value} controls className="h-10" />}
          <div className="flex flex-col gap-1">
            <CurrentButton variant="secondary" className="px-3 py-1 text-xs" onClick={() => fileRef.current?.click()}>
              Replace
            </CurrentButton>
            <CurrentButton variant="quiet" className="px-3 py-1 text-xs" onClick={() => onChange(null)}>
              Clear
            </CurrentButton>
          </div>
        </div>
      ) : (
        <CurrentButton variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => fileRef.current?.click()}>
          Choose {def.type}…
        </CurrentButton>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={FILE_ACCEPT[def.type]}
        className="hidden"
        aria-label={`${def.name} file`}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}

export function AppWorkspace() {
  const { nodes, workflowName, isRunning } = useWorkflowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      workflowName: state.workflowName,
      isRunning: state.isRunning,
    }))
  );
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const getConnectedInputs = useWorkflowStore((state) => state.getConnectedInputs);
  const setWorkspaceView = useWorkflowStore((state) => state.setWorkspaceView);
  const [hasRun, setHasRun] = useState(false);

  const templateInterface = useMemo(() => describeTemplateInterface(nodes), [nodes]);
  const hiddenInputs = useMemo(
    () =>
      nodes.filter(
        (node) =>
          ["prompt", "imageInput", "videoInput", "audioInput"].includes(node.type as string) &&
          (node.data as { isTemplateInput?: boolean }).isTemplateInput === false
      ),
    [nodes]
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const fieldValue = (def: TemplateInputDef): string | null => {
    const node = nodeById.get(def.nodeId);
    const raw = node ? (node.data as Record<string, unknown>)[FIELD_DATA_KEY[def.nodeType]] : null;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  };

  const setFieldValue = (def: TemplateInputDef, value: string | null) => {
    updateNodeData(def.nodeId, { [FIELD_DATA_KEY[def.nodeType]]: value ?? (def.type === "text" ? "" : null) });
  };

  const errors = nodes
    .filter((node) => (node.data as { status?: string }).status === "error")
    .map((node) => ({
      name: (node.data as { customTitle?: string }).customTitle || node.type,
      message: (node.data as { error?: string }).error || "Failed",
    }));

  const run = () => {
    setHasRun(true);
    void executeWorkflow();
  };

  return (
    <main
      className="current-outputs nowheel absolute inset-0 h-full min-h-0 overflow-y-auto overscroll-contain"
      aria-label="Run workflow as an app"
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <header className="current-outputs__header">
        <div>
          <span className="current-eyebrow">Run</span>
          <h1>{workflowName || "Workflow"}</h1>
        </div>
        <CurrentButton variant="secondary" onClick={() => setWorkspaceView("canvas")}>
          Back to Canvas
        </CurrentButton>
      </header>

      <section aria-labelledby="app-inputs-heading" className="max-w-2xl">
        <h2 id="app-inputs-heading" className="text-sm font-semibold text-neutral-200 mb-3">Inputs</h2>

        {templateInterface.inputs.length === 0 && (
          <p className="text-sm text-neutral-400">
            This workflow has no input nodes yet. Add Prompt or media input nodes on the canvas and they
            appear here as form fields.
          </p>
        )}

        <div className="space-y-4">
          {templateInterface.inputs.map((def) => (
            <div key={def.nodeId} className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-neutral-200 font-medium" htmlFor={`app-field-${def.nodeId}`}>
                  {def.name}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-neutral-500">{def.type}</span>
                </label>
                <button
                  type="button"
                  className="text-[11px] text-neutral-500 hover:text-neutral-300"
                  onClick={() => updateNodeData(def.nodeId, { isTemplateInput: false })}
                  title="Hide this field from the form (the node keeps its current value)"
                >
                  Hide
                </button>
              </div>
              {def.type === "text" ? (
                <textarea
                  id={`app-field-${def.nodeId}`}
                  className="w-full min-h-[72px] px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-neutral-100 text-sm focus:outline-none focus:border-neutral-500 resize-y"
                  placeholder="Type here…"
                  value={fieldValue(def) ?? ""}
                  onChange={(e) => setFieldValue(def, e.target.value)}
                />
              ) : (
                <MediaField def={def} value={fieldValue(def)} onChange={(v) => setFieldValue(def, v)} />
              )}
            </div>
          ))}
        </div>

        {hiddenInputs.length > 0 && (
          <div className="mt-3 text-[11px] text-neutral-500">
            Hidden fields:{" "}
            {hiddenInputs.map((node, i) => (
              <span key={node.id}>
                {i > 0 && " · "}
                {(node.data as { customTitle?: string }).customTitle || node.type}{" "}
                <button
                  type="button"
                  className="underline hover:text-neutral-300"
                  onClick={() => updateNodeData(node.id, { isTemplateInput: true })}
                >
                  Show
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <CurrentButton variant="primary" onClick={run} disabled={isRunning} className="px-5 py-2">
            {isRunning ? "Running…" : "Run"}
          </CurrentButton>
          {isRunning && <span className="text-xs text-neutral-400">Executing the workflow…</span>}
        </div>

        {!isRunning && errors.length > 0 && (
          <div className="mt-3 space-y-1" role="alert">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-red-400">{err.name}: {err.message}</p>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="app-outputs-heading" className="mt-8">
        <h2 id="app-outputs-heading" className="text-sm font-semibold text-neutral-200 mb-3">Results</h2>
        {templateInterface.outputs.length === 0 && (
          <p className="text-sm text-neutral-400">Add an Output node on the canvas to collect results here.</p>
        )}
        <div className="flex flex-wrap gap-4">
          {templateInterface.outputs.map((def) => {
            const inputs = getConnectedInputs(def.nodeId);
            const node = nodeById.get(def.nodeId);
            const own = node?.data as { image?: string | null; video?: string | null; audio?: string | null } | undefined;
            const images = inputs.images.length > 0 ? inputs.images : own?.image ? [own.image] : [];
            const videos = inputs.videos.length > 0 ? inputs.videos : own?.video ? [own.video] : [];
            const audio = inputs.audio.length > 0 ? inputs.audio : own?.audio ? [own.audio] : [];
            const empty = images.length === 0 && videos.length === 0 && audio.length === 0 && !inputs.text;
            return (
              <div key={def.nodeId} className="p-3 bg-neutral-900 rounded-lg border border-neutral-700 min-w-[220px] max-w-md">
                <div className="text-xs text-neutral-400 mb-2">{def.name}</div>
                {empty && (
                  <p className="text-xs text-neutral-500">{hasRun ? "No result yet." : "Run the workflow to see results."}</p>
                )}
                <div className="space-y-2">
                  {images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`img-${i}`} src={src} alt={`${def.name} result ${i + 1}`} className="max-w-full rounded-md border border-neutral-700" />
                  ))}
                  {videos.map((src, i) => (
                    <video key={`vid-${i}`} src={src} controls className="max-w-full rounded-md border border-neutral-700" />
                  ))}
                  {audio.map((src, i) => (
                    <audio key={`aud-${i}`} src={src} controls className="w-full" />
                  ))}
                  {inputs.text && (
                    <p className="text-sm text-neutral-200 whitespace-pre-wrap">{inputs.text}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
