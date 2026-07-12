"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { CurrentButton } from "@/components/current";
import {
  captureSurfaceIsolation,
  getSurfaceFocusableElements,
  restoreSurfaceIsolation,
  surfaceFocusableSelector,
  type SurfaceIsolationSnapshot,
} from "@/components/current/surfaceFocus";

interface FocusWorkspaceProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

function isolateWorkspace(root: HTMLElement) {
  const snapshots = new Map<HTMLElement, SurfaceIsolationSnapshot>();
  let branch: HTMLElement = root;

  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
      snapshots.set(sibling, captureSurfaceIsolation(sibling));
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }
    branch = parent;
    if (parent === document.body) break;
  }

  return () => {
    for (const [element, snapshot] of snapshots) restoreSurfaceIsolation(element, snapshot);
  };
}

function hasActiveSheet() {
  return Array.from(document.querySelectorAll<HTMLElement>(".current-sheet-backdrop"))
    .some((backdrop) => !backdrop.hasAttribute("inert"));
}

export function FocusWorkspace({
  title,
  onBack,
  children,
  primaryAction,
  secondaryActions,
  toolbar,
  footer,
  className = "",
  onEscape = onBack,
  initialFocusRef,
}: FocusWorkspaceProps) {
  const titleId = `current-focus-title-${useId().replace(/:/g, "")}`;
  const workspaceRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const workspace = workspaceRef.current;
      if (!workspace || event.defaultPrevented || hasActiveSheet()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;
      const controls = getSurfaceFocusableElements(workspace);
      if (controls.length === 0) {
        event.preventDefault();
        workspace.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      const outside = !workspace.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const restoreIsolation = isolateWorkspace(workspace);
    const requested = initialFocusRef?.current;
    const contentAutoFocus = workspace.querySelector<HTMLElement>("[autofocus], [data-current-initial-focus]");
    const content = workspace.querySelector<HTMLElement>(".current-focus-workspace__content");
    const firstContentControl = content?.querySelector<HTMLElement>(surfaceFocusableSelector) ?? null;
    (requested ?? contentAutoFocus ?? firstContentControl ?? workspace).focus();

    return () => {
      restoreIsolation();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [initialFocusRef]);

  return (
    <main
      ref={workspaceRef}
      aria-labelledby={titleId}
      data-surface="focus"
      tabIndex={-1}
      className={`current-focus-workspace ${className}`.trim()}
    >
      <header className="current-focus-workspace__bar">
        <div className="current-focus-workspace__leading">
          <CurrentButton variant="quiet" onClick={onBack} aria-label="Back to canvas">
            <span aria-hidden>‹</span>
            <span>Canvas</span>
          </CurrentButton>
          <span className="current-focus-workspace__divider" aria-hidden />
          <h1 id={titleId}>{title}</h1>
        </div>
        {toolbar && <div className="current-focus-workspace__toolbar">{toolbar}</div>}
        <div className="current-focus-workspace__actions">
          {secondaryActions}
          {primaryAction}
        </div>
      </header>
      <div className="current-focus-workspace__content">{children}</div>
      {footer && <footer className="current-focus-workspace__footer">{footer}</footer>}
    </main>
  );
}
