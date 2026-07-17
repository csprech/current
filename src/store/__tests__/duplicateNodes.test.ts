/**
 * Tests for duplicateNodes: cloning nodes (and the edges between them)
 * with fresh IDs, offset positions, and exclusive selection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkflowStore } from "../workflowStore";
import type { WorkflowNode, WorkflowEdge } from "@/types";

// Mock the Toast hook
vi.mock("@/components/Toast", () => ({
  useToast: {
    getState: () => ({
      show: vi.fn(),
    }),
  },
}));

// Mock the logger
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    startSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
    getCurrentSession: vi.fn().mockReturnValue(null),
  },
}));

// Mock localStorage for provider settings
const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  }),
});

function createTestNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
  position = { x: 0, y: 0 }
): WorkflowNode {
  return {
    id,
    type: type as WorkflowNode["type"],
    position,
    data: data as WorkflowNode["data"],
  } as WorkflowNode;
}

function createTestEdge(source: string, target: string): WorkflowEdge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    sourceHandle: "image",
    targetHandle: "image",
  } as WorkflowEdge;
}

describe("duplicateNodes", () => {
  beforeEach(() => {
    useWorkflowStore.getState().clearWorkflow();
  });

  it("clones a node with a new id, offset position, and deep-copied data", () => {
    const original = createTestNode(
      "imageInput-src",
      "imageInput",
      { image: "data:image/png;base64,abc", label: "Source" },
      { x: 100, y: 200 }
    );
    useWorkflowStore.setState({ nodes: [original], edges: [] });

    useWorkflowStore.getState().duplicateNodes(["imageInput-src"]);

    const { nodes } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(2);

    const clone = nodes.find((n) => n.id !== "imageInput-src")!;
    expect(clone.id).toMatch(/^imageInput-\d+$/);
    expect(clone.position).toEqual({ x: 140, y: 240 });
    expect((clone.data as Record<string, unknown>).image).toBe("data:image/png;base64,abc");
    expect(clone.data).not.toBe(original.data);

    // Clone is selected; the original is deselected
    expect(clone.selected).toBe(true);
    expect(nodes.find((n) => n.id === "imageInput-src")?.selected).toBe(false);
  });

  it("clones edges between duplicated nodes but not edges to outside nodes", () => {
    const a = createTestNode("imageInput-src", "imageInput", {});
    const b = createTestNode("nanoBanana-src", "nanoBanana", {});
    const outside = createTestNode("output-src", "output", {});
    useWorkflowStore.setState({
      nodes: [a, b, outside],
      edges: [
        createTestEdge("imageInput-src", "nanoBanana-src"),
        createTestEdge("nanoBanana-src", "output-src"),
      ],
    });

    useWorkflowStore.getState().duplicateNodes(["imageInput-src", "nanoBanana-src"]);

    const { nodes, edges } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(3);

    const cloneIds = new Set(
      nodes.filter((n) => !["imageInput-src", "nanoBanana-src", "output-src"].includes(n.id)).map((n) => n.id)
    );
    expect(cloneIds.size).toBe(2);

    const clonedEdge = edges.find((e) => cloneIds.has(e.source) && cloneIds.has(e.target));
    expect(clonedEdge).toBeDefined();
    expect(clonedEdge!.sourceHandle).toBe("image");

    // No cloned edge points at the node outside the duplicated set
    expect(edges.filter((e) => e.target === "output-src")).toHaveLength(1);
  });

  it("is a no-op for unknown node ids", () => {
    const original = createTestNode("imageInput-src", "imageInput", {});
    useWorkflowStore.setState({ nodes: [original], edges: [] });

    useWorkflowStore.getState().duplicateNodes(["missing-src"]);

    const { nodes, edges } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("marks the workflow as having unsaved changes", () => {
    useWorkflowStore.setState({
      nodes: [createTestNode("imageInput-src", "imageInput", {})],
      edges: [],
      hasUnsavedChanges: false,
    });

    useWorkflowStore.getState().duplicateNodes(["imageInput-src"]);

    expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(true);
  });
});
