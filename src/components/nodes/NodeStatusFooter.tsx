"use client";

import type { CurrentNodeState } from "./nodePresentation";

interface NodeStatusAction {
  label: string;
  onClick: () => void;
}

interface NodeStatusFooterProps {
  state: CurrentNodeState;
  label: string;
  detail?: string;
  action?: NodeStatusAction;
}

export function NodeStatusFooter({ state, label, detail, action }: NodeStatusFooterProps) {
  return (
    <div
      className="current-node-status nodrag nopan"
      data-state={state}
    >
      <span className="current-node-status__indicator" aria-hidden="true" />
      <span className="current-node-status__copy">
        <strong role="status" aria-live="polite" aria-atomic="true" data-state={state}>{label}</strong>
        {detail && <span>{detail}</span>}
      </span>
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
