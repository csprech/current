import { describe, it, expect, beforeEach } from "vitest";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowNode } from "@/types";

describe("subject library store actions", () => {
  beforeEach(() => {
    useWorkflowStore.setState({ subjects: [], nodes: [], edges: [] });
  });

  it("adds, updates, and deletes subjects", () => {
    const store = useWorkflowStore.getState();
    const created = store.addSubject({ name: "Maya", images: ["data:ref-1"] });

    expect(useWorkflowStore.getState().subjects).toHaveLength(1);
    expect(created.id).toBeTruthy();

    store.updateSubject(created.id, { description: "red-haired explorer" });
    expect(useWorkflowStore.getState().subjects[0].description).toBe("red-haired explorer");

    store.deleteSubject(created.id);
    expect(useWorkflowStore.getState().subjects).toHaveLength(0);
  });

  it("detaches deleted subjects from nodes that referenced them", () => {
    const store = useWorkflowStore.getState();
    const created = store.addSubject({ name: "Maya", images: ["data:ref-1"] });
    useWorkflowStore.setState({
      nodes: [
        {
          id: "gen-1",
          type: "nanoBanana",
          position: { x: 0, y: 0 },
          data: { subjectId: created.id },
        } as unknown as WorkflowNode,
        {
          id: "gen-2",
          type: "nanoBanana",
          position: { x: 0, y: 0 },
          data: { subjectId: "another" },
        } as unknown as WorkflowNode,
      ],
    });

    store.deleteSubject(created.id);

    const nodes = useWorkflowStore.getState().nodes;
    expect((nodes[0].data as { subjectId?: string | null }).subjectId).toBeNull();
    expect((nodes[1].data as { subjectId?: string | null }).subjectId).toBe("another");
  });

  it("marks the workflow unsaved when the library changes", () => {
    useWorkflowStore.setState({ hasUnsavedChanges: false });
    useWorkflowStore.getState().addSubject({ name: "Maya", images: [] });
    expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);
  });
});
