"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { LibraryPanel } from "./LibraryPanel";
import { ActivityPanel } from "./ActivityPanel";
import { ChatPanel, type ChatPanelProps } from "@/components/ChatPanel";
import { ControlPanel } from "@/components/nodes/ControlPanel";
import { isInspectorConfigurableNodeType } from "@/components/nodes/inspectorConfig";

export function WorkspacePanelHost({ assistantProps }: { assistantProps: ChatPanelProps }) {
  const activeLeftPanel = useWorkflowStore((state) => state.activeLeftPanel);
  const activeRightPanel = useWorkflowStore((state) => state.activeRightPanel);
  const setActiveLeftPanel = useWorkflowStore((state) => state.setActiveLeftPanel);
  const setActiveRightPanel = useWorkflowStore((state) => state.setActiveRightPanel);
  const selectedInspectorNodeId = useWorkflowStore((state) => {
    const selected = state.nodes.filter((node) => node.selected && isInspectorConfigurableNodeType(node.type));
    return selected.length === 1 ? selected[0].id : null;
  });
  const [inspectorDismissed, setInspectorDismissed] = useState(false);
  const inspectorHostRef = useRef<HTMLDivElement>(null);
  const rightOpenerRef = useRef<HTMLElement | null>(null);
  const previousSelectedInspectorNodeId = useRef(selectedInspectorNodeId);

  useEffect(() => {
    if (previousSelectedInspectorNodeId.current === selectedInspectorNodeId) return;
    previousSelectedInspectorNodeId.current = selectedInspectorNodeId;
    if (selectedInspectorNodeId) setInspectorDismissed(false);
  }, [selectedInspectorNodeId]);

  useEffect(() => {
    if (!activeRightPanel) return;
    setInspectorDismissed(false);
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (focused && !inspectorHostRef.current?.contains(focused)) rightOpenerRef.current = focused;
    else focused?.blur();
  }, [activeRightPanel]);

  const inspectorHidden = Boolean(activeRightPanel) || inspectorDismissed;
  const closeInspector = () => {
    setInspectorDismissed(true);
    setActiveRightPanel(null);
  };
  const closeRightPanel = () => {
    const opener = rightOpenerRef.current;
    setActiveRightPanel(null);
    queueMicrotask(() => opener?.isConnected && opener.focus());
  };

  return <>
    {activeLeftPanel === "library" && <LibraryPanel onClose={() => setActiveLeftPanel(null)} />}
    {activeRightPanel === "assistant" && (
      <ChatPanel {...assistantProps} isOpen onClose={closeRightPanel} />
    )}
    {activeRightPanel === "activity" && (
      <ActivityPanel onClose={closeRightPanel} />
    )}
    <div ref={inspectorHostRef} className={inspectorHidden ? "hidden" : "contents"} hidden={inspectorHidden} inert={inspectorHidden ? true : undefined} aria-hidden={inspectorHidden || undefined}>
      <ControlPanel onClose={closeInspector} />
    </div>
  </>;
}
