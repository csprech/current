export const surfaceFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isSurfaceElementVisible(element: HTMLElement, boundary?: HTMLElement) {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (
      current.hidden
      || current.hasAttribute("inert")
      || current.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }

    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
      return false;
    }

    if (current === boundary) break;
  }

  return true;
}

export function isValidSurfaceFocusTarget(
  target: HTMLElement | null,
  boundary?: HTMLElement,
): target is HTMLElement {
  return Boolean(
    target?.isConnected
    && (!boundary || boundary.contains(target))
    && target.matches(surfaceFocusableSelector)
    && isSurfaceElementVisible(target, boundary),
  );
}

export function getSurfaceFocusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(surfaceFocusableSelector))
    .filter((element) => isValidSurfaceFocusTarget(element, root));
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
