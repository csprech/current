"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CurrentButton } from "@/components/current";

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
}: FocusWorkspaceProps) {
  const titleId = `current-focus-title-${useId().replace(/:/g, "")}`;
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => () => {
    if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onEscape();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);

  return (
    <main
      aria-labelledby={titleId}
      data-surface="focus"
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
