"use client";

import { ModelSearchDialog } from "@/components/modals/ModelSearchDialog";
import { useWorkflowStore } from "@/store/workflowStore";

export function WorkspaceModelSearchDialog() {
  const isOpen = useWorkflowStore((state) => state.modelSearchOpen);
  const initialProvider = useWorkflowStore((state) => state.modelSearchProvider);
  const setModelSearchOpen = useWorkflowStore((state) => state.setModelSearchOpen);

  return (
    <ModelSearchDialog
      isOpen={isOpen}
      initialProvider={initialProvider}
      onClose={() => setModelSearchOpen(false)}
    />
  );
}
