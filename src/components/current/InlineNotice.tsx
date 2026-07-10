import type { ReactNode } from "react";
import { CloseIcon } from "./CurrentIcons";
import { CurrentIconButton } from "./CurrentIconButton";

export type NoticeTone = "error" | "warning" | "success" | "info";

export interface InlineNoticeProps {
  children: ReactNode;
  tone: NoticeTone;
  onDismiss?: () => void;
  className?: string;
}

export function InlineNotice({ children, tone, onDismiss, className = "" }: InlineNoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-tone={tone}
      className={`current-inline-notice current-inline-notice--${tone} ${className}`.trim()}
    >
      <div className="current-inline-notice__content">{children}</div>
      {onDismiss && (
        <CurrentIconButton label="Dismiss notice" onClick={onDismiss}>
          <CloseIcon />
        </CurrentIconButton>
      )}
    </div>
  );
}
