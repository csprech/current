"use client";

/**
 * ElevenLabsParameters
 *
 * Inline settings for audio nodes running ElevenLabs models. TTS models get
 * a voice picker (the account's voices, discovered once per page load) and a
 * stability slider; Sound Effects and Music get a duration field. Values live
 * in nodeData.parameters and ride the existing generation plumbing.
 */

import { useElevenLabsVoices } from "@/hooks/useElevenLabsVoices";

const fieldClass =
  "nodrag nopan flex-1 min-w-0 text-[11px] py-1 px-2 bg-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-600 text-white";

interface ElevenLabsParametersProps {
  modelId: string;
  parameters: Record<string, unknown>;
  onParametersChange: (parameters: Record<string, unknown>) => void;
}

export function ElevenLabsParameters({ modelId, parameters, onParametersChange }: ElevenLabsParametersProps) {
  const isTts = modelId.startsWith("tts/");
  const { voices, error, loading } = useElevenLabsVoices(isTts);

  const set = (key: string, value: unknown) => {
    const next = { ...parameters };
    if (value === "" || value === undefined || value === null) delete next[key];
    else next[key] = value;
    onParametersChange(next);
  };

  if (isTts) {
    const stability = typeof parameters.stability === "number" ? parameters.stability : 0.5;
    return (
      <>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-neutral-400 shrink-0">Voice</label>
          <select
            aria-label="ElevenLabs voice"
            className={fieldClass}
            value={typeof parameters.voiceId === "string" ? parameters.voiceId : ""}
            onChange={(e) => set("voiceId", e.target.value)}
          >
            <option value="">Rachel (default)</option>
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}{voice.category === "cloned" ? " (cloned)" : ""}
              </option>
            ))}
          </select>
        </div>
        {loading && <p className="text-[10px] text-neutral-500">Loading your voices…</p>}
        {!loading && error && <p className="text-[10px] text-neutral-500">{error}</p>}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-neutral-400 shrink-0">Stability: {stability.toFixed(2)}</label>
          <input
            type="range"
            aria-label="Voice stability"
            className="nodrag nopan flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-400"
            min={0}
            max={1}
            step={0.05}
            value={stability}
            onChange={(e) => set("stability", Number(e.target.value))}
          />
        </div>
      </>
    );
  }

  const isMusic = modelId === "music";
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-neutral-400 shrink-0">Duration (s)</label>
      <input
        type="number"
        aria-label="Duration in seconds"
        className={fieldClass}
        min={isMusic ? 10 : 0.5}
        max={isMusic ? 300 : 22}
        step={isMusic ? 5 : 0.5}
        placeholder={isMusic ? "auto" : "auto"}
        value={typeof parameters.durationSeconds === "number" ? parameters.durationSeconds : ""}
        onChange={(e) => set("durationSeconds", e.target.value === "" ? "" : Number(e.target.value))}
      />
    </div>
  );
}
