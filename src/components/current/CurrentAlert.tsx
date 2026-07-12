"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { CurrentButton, type CurrentButtonVariant } from "./CurrentButton";
import { CurrentSheetSurface } from "./CurrentSheet";

export interface CurrentAlertProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  danger?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  alternateAction?: {
    label: string;
    onClick: () => void;
    variant?: CurrentButtonVariant;
  };
}

export function CurrentAlert({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  danger = false,
  returnFocusRef,
  alternateAction,
}: CurrentAlertProps) {
  const descriptionId = `current-alert-description-${useId().replace(/:/g, "")}`;

  return (
    <CurrentSheetSurface
      open={open}
      title={title}
      onClose={onCancel}
      width="compact"
      role="alertdialog"
      describedBy={descriptionId}
      className={`current-alert${danger ? " current-alert--danger" : ""}`}
      hideClose
      returnFocusRef={returnFocusRef}
    >
      <div id={descriptionId} className="current-alert__description">{description}</div>
      <div className="current-alert__actions">
        <CurrentButton variant="secondary" onClick={onCancel}>{cancelLabel}</CurrentButton>
        <CurrentButton variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</CurrentButton>
        {alternateAction && (
          <CurrentButton variant={alternateAction.variant ?? "primary"} onClick={alternateAction.onClick}>
            {alternateAction.label}
          </CurrentButton>
        )}
      </div>
    </CurrentSheetSurface>
  );
}
