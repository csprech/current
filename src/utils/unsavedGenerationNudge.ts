import { useToast } from "@/components/Toast";

let nudged = false;

/**
 * One-time heads-up when media is generated on a canvas with no generations
 * folder: the bytes live only in the session cache until the project is
 * saved (which flushes them to disk). Fires once per session — every
 * variant of every run would otherwise repeat it.
 */
export function nudgeUnsavedGeneration(): void {
  if (nudged) return;
  nudged = true;
  useToast.getState().show(
    "Generations live only in this session — save your project to keep them on disk.",
    "info"
  );
}

/** Test hook: allow the nudge to fire again. */
export function resetUnsavedGenerationNudge(): void {
  nudged = false;
}
