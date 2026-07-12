"use client";

import { Handle, type HandleProps } from "@xyflow/react";
import { getHandlePresentation, normalizeHandleType } from "./nodePresentation";

export function CurrentHandle(props: HandleProps) {
  const handleType = (props as HandleProps & { "data-handletype"?: string })["data-handletype"];
  const presentation = getHandlePresentation(normalizeHandleType(handleType));
  const accessibleName = props["aria-label"] ?? `${presentation.label} connection port`;

  return <Handle {...props} aria-label={accessibleName} />;
}
