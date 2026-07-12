import { useRef, type ReactNode } from "react";
import { CloseIcon } from "./CurrentIcons";
import { CurrentIconButton } from "./CurrentIconButton";

export type CurrentPanelSide = "left" | "right";

export interface CurrentPanelProps {
  side: CurrentPanelSide;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

export function CurrentPanel({ side, title, onClose, children, actions }: CurrentPanelProps) {
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  );
  const handleClose = () => {
    const opener = openerRef.current;
    onClose();
    queueMicrotask(() => opener?.isConnected && opener.focus());
  };
  return (
    <aside className="current-panel" aria-label={title} data-side={side}>
      <header className="current-panel__header">
        <h2>{title}</h2>
        <CurrentIconButton label={`Close ${title}`} onClick={handleClose}>
          <CloseIcon />
        </CurrentIconButton>
      </header>
      <div className="current-panel__content">{children}</div>
      {actions && <footer className="current-panel__actions">{actions}</footer>}
    </aside>
  );
}
