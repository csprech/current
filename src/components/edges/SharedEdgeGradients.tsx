"use client";

import { getHandlePresentation } from "@/components/nodes/nodePresentation";

// Shared SVG gradient definitions for all edge types.
// Rendered once inside the React Flow SVG layer to avoid duplicating
// <defs>/<linearGradient> in every edge component.

function typedGradient(type: Parameters<typeof getHandlePresentation>[0]): readonly [string, string] {
  const presentation = getHandlePresentation(type);
  return [presentation.color, presentation.endColor ?? presentation.color];
}

const EDGE_COLORS: Record<string, readonly [string, string]> = {
  image: typedGradient("image"),
  text: typedGradient("text"),
  video: typedGradient("video"),
  audio: typedGradient("audio"),
  "3d": typedGradient("3d"),
  easeCurve: typedGradient("easeCurve"),
  generic: typedGradient("generic"),
  pause: ["var(--current-warning)", "var(--current-warning)"],
  loop: typedGradient("video"),
};

const SELECTION_STATES = ["active", "dimmed"] as const;

function gradientStops(startColor: string, endColor: string, active: boolean) {
  return (
    <>
      <stop offset="0%" stopColor={startColor} stopOpacity={active ? 1 : 0.4} />
      <stop offset="50%" stopColor={endColor} stopOpacity={active ? 0.7 : 0.26} />
      <stop offset="100%" stopColor={endColor} stopOpacity={active ? 1 : 0.4} />
    </>
  );
}

export function getSharedGradientId(colorKey: string, selectionKey: "active" | "dimmed") {
  return `edge-grad-${colorKey}-${selectionKey}`;
}

export function SharedEdgeGradients() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        {Object.entries(EDGE_COLORS).flatMap(([colorKey, [startColor, endColor]]) =>
          SELECTION_STATES.map((sel) => (
            <linearGradient
              key={`${colorKey}-${sel}`}
              id={getSharedGradientId(colorKey, sel)}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              {gradientStops(startColor, endColor, sel === "active")}
            </linearGradient>
          ))
        )}
      </defs>
    </svg>
  );
}
