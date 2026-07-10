"use client";

import { useCallback, useEffect, useId, type MouseEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./CurrentIcons";
import { CurrentIconButton } from "./CurrentIconButton";

export interface CurrentSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: "compact" | "standard" | "wide";
  returnFocusRef?: RefObject<HTMLElement | null>;
}

interface CurrentSheetSurfaceProps extends CurrentSheetProps {
  role: "dialog" | "alertdialog";
  describedBy?: string;
  className?: string;
  hideClose?: boolean;
}

export function CurrentSheetSurface({
  open,
  title,
  onClose,
  children,
  width = "standard",
  returnFocusRef,
  role,
  describedBy,
  className = "",
  hideClose = false,
}: CurrentSheetSurfaceProps) {
  const titleId = `current-sheet-title-${useId().replace(/:/g, "")}`;
  const close = useCallback(() => {
    onClose();
    returnFocusRef?.current?.focus();
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  if (!open) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close();
  };

  return createPortal(
    <div className="current-sheet-backdrop" onClick={handleBackdropClick}>
      <section
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-width={width}
        className={`current-sheet ${className}`.trim()}
      >
        <header className="current-sheet__header">
          <h2 id={titleId}>{title}</h2>
          {!hideClose && (
            <CurrentIconButton label={`Close ${title}`} onClick={close}>
              <CloseIcon />
            </CurrentIconButton>
          )}
        </header>
        <div className="current-sheet__content">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

export function CurrentSheet(props: CurrentSheetProps) {
  return <CurrentSheetSurface {...props} role="dialog" />;
}
