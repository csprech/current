export const surfaceFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getSurfaceFocusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(surfaceFocusableSelector))
    .filter((element) => element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("inert"));
}

export interface SurfaceIsolationSnapshot {
  inert: boolean;
  ariaHidden: string | null;
}

export function captureSurfaceIsolation(element: HTMLElement): SurfaceIsolationSnapshot {
  return {
    inert: element.hasAttribute("inert"),
    ariaHidden: element.getAttribute("aria-hidden"),
  };
}

export function restoreSurfaceIsolation(element: HTMLElement, snapshot: SurfaceIsolationSnapshot) {
  if (snapshot.inert) element.setAttribute("inert", "");
  else element.removeAttribute("inert");
  if (snapshot.ariaHidden === null) element.removeAttribute("aria-hidden");
  else element.setAttribute("aria-hidden", snapshot.ariaHidden);
}
