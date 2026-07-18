"use client";

/**
 * ComfyUIParameters
 *
 * Inline settings for image nodes running a local ComfyUI checkpoint:
 * sampler controls (negative prompt / steps / CFG / seed) plus ControlNet
 * conditioning — model picked from the daemon's installed ControlNets, a
 * strength slider, and a preprocessor (None for ready-made hint maps such as
 * the Image Action node's Canny output; Canny/Depth run inside the daemon).
 * All values live in nodeData.parameters and ride the existing plumbing.
 */

import { useComfyUIControlNets } from "@/hooks/useComfyUIControlNets";

const fieldClass =
  "nodrag nopan flex-1 min-w-0 text-[11px] py-1 px-2 bg-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-600 text-white";

interface ComfyUIParametersProps {
  parameters: Record<string, unknown>;
  onParametersChange: (parameters: Record<string, unknown>) => void;
  /** Whether a control image is connected — used to hint the ControlNet setup. */
  hasControlImage?: boolean;
}

export function ComfyUIParameters({ parameters, onParametersChange, hasControlImage }: ComfyUIParametersProps) {
  const { controlnets, depthPreprocessor, error, loading } = useComfyUIControlNets(true);

  const set = (key: string, value: unknown) => {
    const next = { ...parameters };
    if (value === "" || value === undefined || value === null) delete next[key];
    else next[key] = value;
    onParametersChange(next);
  };

  const numberField = (key: string, value: unknown, fallback: string) => (
    <input
      type="number"
      className={fieldClass}
      value={typeof value === "number" ? value : ""}
      placeholder={fallback}
      onChange={(e) => set(key, e.target.value === "" ? "" : Number(e.target.value))}
    />
  );

  const controlNetModel = typeof parameters.controlNetModel === "string" ? parameters.controlNetModel : "";
  const preprocessor = typeof parameters.controlPreprocessor === "string" ? parameters.controlPreprocessor : "none";
  const strength = typeof parameters.controlNetStrength === "number" ? parameters.controlNetStrength : 1;

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-neutral-400 shrink-0">Negative</label>
        <input
          type="text"
          className={fieldClass}
          value={typeof parameters.negativePrompt === "string" ? parameters.negativePrompt : ""}
          placeholder="What to avoid…"
          onChange={(e) => set("negativePrompt", e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-neutral-400 shrink-0">Steps</label>
        {numberField("steps", parameters.steps, "20")}
        <label className="text-[11px] text-neutral-400 shrink-0">CFG</label>
        {numberField("cfg", parameters.cfg, "7")}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-neutral-400 shrink-0">Seed</label>
        {numberField("seed", parameters.seed, "random")}
      </div>

      {/* ControlNet conditioning */}
      <div className="pt-1 border-t border-neutral-700/60">
        <span className="text-[11px] font-medium text-neutral-300">ControlNet</span>
        {loading && <p className="text-[10px] text-neutral-500">Checking the daemon…</p>}
        {!loading && error && <p className="text-[10px] text-neutral-500">{error}</p>}
        {!loading && !error && controlnets.length === 0 && (
          <p className="text-[10px] text-neutral-500">
            No ControlNet models installed — add some to ComfyUI&apos;s models/controlnet folder.
          </p>
        )}
        {!loading && controlnets.length > 0 && (
          <div className="mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-neutral-400 shrink-0">Model</label>
              <select
                aria-label="ControlNet model"
                className={fieldClass}
                value={controlNetModel}
                onChange={(e) => set("controlNetModel", e.target.value)}
              >
                <option value="">None</option>
                {controlnets.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            {controlNetModel && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-neutral-400 shrink-0">Preprocess</label>
                  <select
                    aria-label="Control image preprocessor"
                    className={fieldClass}
                    value={preprocessor}
                    onChange={(e) => set("controlPreprocessor", e.target.value)}
                  >
                    <option value="none">None (image is already a hint map)</option>
                    <option value="canny">Canny edges</option>
                    <option value="depth" disabled={!depthPreprocessor}>
                      {depthPreprocessor ? "Depth map" : "Depth map (install comfyui_controlnet_aux)"}
                    </option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-neutral-400 shrink-0">
                    Strength: {strength.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    aria-label="ControlNet strength"
                    className="nodrag nopan flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-400"
                    min={0}
                    max={2}
                    step={0.05}
                    value={strength}
                    onChange={(e) => set("controlNetStrength", Number(e.target.value))}
                  />
                </div>
                {!hasControlImage && (
                  <p className="text-[10px] text-neutral-500">
                    Connect an image to the Control handle — e.g. an Image Action node&apos;s Canny output.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
