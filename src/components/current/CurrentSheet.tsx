"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
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
  initialFocusRef?: RefObject<HTMLElement | null>;
}

interface CurrentSheetSurfaceProps extends CurrentSheetProps {
  role: "dialog" | "alertdialog";
  describedBy?: string;
  className?: string;
  hideClose?: boolean;
}

interface ModalEntry {
  id: symbol;
  dialog: HTMLElement | null;
  backdrop: HTMLElement | null;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
  initialFocus: () => HTMLElement | null;
}

const modalStack: ModalEntry[] = [];
const inertSnapshots = new Map<HTMLElement, boolean>();

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("inert"));
}

function focusModal(entry: ModalEntry) {
  if (!entry.dialog) return;
  const requestedControl = entry.initialFocus();
  const firstControl = getFocusableElements(entry.dialog)[0];
  (requestedControl ?? firstControl ?? entry.dialog).focus();
}

function restoreInert(element: HTMLElement, wasInert: boolean) {
  if (wasInert) element.setAttribute("inert", "");
  else element.removeAttribute("inert");
}

function syncBackgroundIsolation() {
  const topBackdrop = modalStack.at(-1)?.backdrop;

  for (const child of Array.from(document.body.children)) {
    const element = child as HTMLElement;
    const shouldBeInert = Boolean(topBackdrop && element !== topBackdrop);

    if (shouldBeInert) {
      if (!inertSnapshots.has(element)) inertSnapshots.set(element, element.hasAttribute("inert"));
      element.setAttribute("inert", "");
    } else if (inertSnapshots.has(element)) {
      restoreInert(element, inertSnapshots.get(element)!);
      inertSnapshots.delete(element);
    }
  }

  for (const [element, wasInert] of inertSnapshots) {
    if (!element.isConnected) {
      restoreInert(element, wasInert);
      inertSnapshots.delete(element);
    }
  }

  if (!topBackdrop) {
    for (const [element, wasInert] of inertSnapshots) restoreInert(element, wasInert);
    inertSnapshots.clear();
  }
}

function handleModalKeyDown(event: KeyboardEvent) {
  const topModal = modalStack.at(-1);
  if (!topModal) return;

  if (event.key === "Escape") {
    event.preventDefault();
    topModal.onClose();
    return;
  }

  if (event.key !== "Tab" || !topModal.dialog) return;
  const controls = getFocusableElements(topModal.dialog);
  if (controls.length === 0) {
    event.preventDefault();
    topModal.dialog.focus();
    return;
  }

  const first = controls[0];
  const last = controls[controls.length - 1];
  const activeElement = document.activeElement;
  const focusIsOutside = !topModal.dialog.contains(activeElement);

  if (event.shiftKey && (activeElement === first || focusIsOutside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (activeElement === last || focusIsOutside)) {
    event.preventDefault();
    first.focus();
  }
}

function registerModal(entry: ModalEntry) {
  modalStack.push(entry);
  if (modalStack.length === 1) document.addEventListener("keydown", handleModalKeyDown);
  syncBackgroundIsolation();
  focusModal(entry);

  return () => {
    const index = modalStack.findIndex((candidate) => candidate.id === entry.id);
    if (index < 0) return;
    const wasTopmost = index === modalStack.length - 1;
    modalStack.splice(index, 1);
    syncBackgroundIsolation();
    if (modalStack.length === 0) document.removeEventListener("keydown", handleModalKeyDown);

    if (wasTopmost) {
      const returnTarget = entry.returnFocus();
      if (returnTarget) returnTarget.focus();
      else if (modalStack.length > 0) focusModal(modalStack[modalStack.length - 1]);
    }
  };
}

export function CurrentSheetSurface({
  open,
  title,
  onClose,
  children,
  width = "standard",
  returnFocusRef,
  initialFocusRef,
  role,
  describedBy,
  className = "",
  hideClose = false,
}: CurrentSheetSurfaceProps) {
  const titleId = `current-sheet-title-${useId().replace(/:/g, "")}`;
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<ModalEntry | null>(null);

  if (!entryRef.current) {
    entryRef.current = {
      id: Symbol("current-sheet"),
      dialog: null,
      backdrop: null,
      onClose,
      returnFocus: () => returnFocusRef?.current ?? null,
      initialFocus: () => initialFocusRef?.current ?? null,
    };
  }
  entryRef.current.onClose = onClose;
  entryRef.current.returnFocus = () => returnFocusRef?.current ?? null;
  entryRef.current.initialFocus = () => initialFocusRef?.current ?? null;

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open || !portalTarget) return;
    const entry = entryRef.current!;
    entry.dialog = dialogRef.current;
    entry.backdrop = backdropRef.current;
    return registerModal(entry);
  }, [open, portalTarget]);

  if (!open || !portalTarget) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div ref={backdropRef} className="current-sheet-backdrop" onClick={handleBackdropClick}>
      <section
        ref={dialogRef}
        role={role}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-surface="sheet"
        data-width={width}
        className={`current-sheet ${className}`.trim()}
      >
        <header className="current-sheet__header">
          <h2 id={titleId}>{title}</h2>
          {!hideClose && (
            <CurrentIconButton label={`Close ${title}`} onClick={onClose}>
              <CloseIcon />
            </CurrentIconButton>
          )}
        </header>
        <div className="current-sheet__content">{children}</div>
      </section>
    </div>,
    portalTarget,
  );
}

export function CurrentSheet(props: CurrentSheetProps) {
  return <CurrentSheetSurface {...props} role="dialog" />;
}
