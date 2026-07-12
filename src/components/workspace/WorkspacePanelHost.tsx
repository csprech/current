"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { LibraryPanel } from "./LibraryPanel";
import { ActivityPanel } from "./ActivityPanel";
import { ChatPanel, type ChatPanelProps } from "@/components/ChatPanel";
import { ControlPanel } from "@/components/nodes/ControlPanel";

export function WorkspacePanelHost({ assistantProps }: { assistantProps: ChatPanelProps }) {
  const activeLeftPanel = useWorkflowStore((state) => state.activeLeftPanel);
  const activeRightPanel = useWorkflowStore((state) => state.activeRightPanel);
  const setActiveLeftPanel = useWorkflowStore((state) => state.setActiveLeftPanel);
  const setActiveRightPanel = useWorkflowStore((state) => state.setActiveRightPanel);

  return <>
    {activeLeftPanel === "library" && <LibraryPanel onClose={() => setActiveLeftPanel(null)} />}
    {activeRightPanel === "assistant" ? (
      <ChatPanel {...assistantProps} isOpen onClose={() => setActiveRightPanel(null)} />
    ) : activeRightPanel === "activity" ? (
      <ActivityPanel onClose={() => setActiveRightPanel(null)} />
    ) : <ControlPanel />}
  </>;
}
