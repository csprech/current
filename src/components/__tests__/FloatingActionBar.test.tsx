import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import { ReactFlowProvider } from "@xyflow/react";

// Mock the workflow store
const mockAddNode = vi.fn();
const mockSetEdgeStyle = vi.fn();
const mockSetModelSearchOpen = vi.fn();
const mockUseWorkflowStore = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector?: (state: unknown) => unknown) => {
    if (selector) {
      return mockUseWorkflowStore(selector);
    }
    return mockUseWorkflowStore((s: unknown) => s);
  },
}));

// Mock useReactFlow
const mockScreenToFlowPosition = vi.fn((pos) => pos);
const mockGetNodes = vi.fn(() => []);

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      screenToFlowPosition: mockScreenToFlowPosition,
      getNodes: mockGetNodes,
    }),
  };
});

// Mock ModelSearchDialog
vi.mock("@/components/modals/ModelSearchDialog", () => ({
  ModelSearchDialog: ({ isOpen, onClose, initialProvider }: { isOpen: boolean; onClose: () => void; initialProvider?: string }) => (
    isOpen ? (
      <div data-testid="model-search-dialog" data-provider={initialProvider}>
        Model Search Dialog
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

// Wrapper component for React Flow context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

// Default store state factory
const createDefaultState = (overrides = {}) => ({
  edgeStyle: "angular" as const,
  setEdgeStyle: mockSetEdgeStyle,
  setModelSearchOpen: mockSetModelSearchOpen,
  modelSearchOpen: false,
  modelSearchProvider: null,
  addNode: mockAddNode,
  ...overrides,
});

describe("FloatingActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseWorkflowStore.mockImplementation((selector) => {
      return selector(createDefaultState());
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render node type buttons", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Image")).toBeInTheDocument();
        expect(screen.getByText("Prompt")).toBeInTheDocument();
        expect(screen.getByText("Output")).toBeInTheDocument();
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });
    });

    it("should render Generate combo button", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });
    });

    it("should leave workflow execution to the Current command bar", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: "Run" })).not.toBeInTheDocument();
      expect(document.querySelector('[data-tutorial="floating-run-button"]')).not.toBeInTheDocument();
    });

    it("should render edge style toggle button", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle("Switch to curved connectors")).toBeInTheDocument();
      });
    });
  });

  describe("Node Button Click", () => {
    it("should call addNode when Image button is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Image")).toBeInTheDocument();
      });

      const imageButton = screen.getByText("Image");
      fireEvent.click(imageButton);

      expect(mockAddNode).toHaveBeenCalledWith("imageInput", expect.any(Object));
    });

    it("should call addNode when Prompt button is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Prompt")).toBeInTheDocument();
      });

      const promptButton = screen.getByText("Prompt");
      fireEvent.click(promptButton);

      expect(mockAddNode).toHaveBeenCalledWith("prompt", expect.any(Object));
    });

    it("should call addNode when Output button is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Output")).toBeInTheDocument();
      });

      const outputButton = screen.getByText("Output");
      fireEvent.click(outputButton);

      expect(mockAddNode).toHaveBeenCalledWith("output", expect.any(Object));
    });
  });

  describe("Node Button Drag", () => {
    it("should set dataTransfer with node type on drag start", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Image")).toBeInTheDocument();
      });

      const imageButton = screen.getByText("Image");

      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(imageButton, {
        dataTransfer: mockDataTransfer,
      });

      expect(mockDataTransfer.setData).toHaveBeenCalledWith("application/node-type", "imageInput");
      expect(mockDataTransfer.effectAllowed).toBe("copy");
    });

    it("should set dataTransfer with prompt type on drag", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Prompt")).toBeInTheDocument();
      });

      const promptButton = screen.getByText("Prompt");

      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      fireEvent.dragStart(promptButton, {
        dataTransfer: mockDataTransfer,
      });

      expect(mockDataTransfer.setData).toHaveBeenCalledWith("application/node-type", "prompt");
    });
  });

  describe("Generate Combo Button", () => {
    it("should open dropdown menu when Generate button is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      const generateButton = screen.getByText("Generate");
      fireEvent.click(generateButton);

      // Dropdown menu items should appear
      expect(screen.getByText("Image", { selector: "button.w-full" })).toBeInTheDocument();
      expect(screen.getByText("Video", { selector: "button.w-full" })).toBeInTheDocument();
      expect(screen.getByText("Text (LLM)")).toBeInTheDocument();
    });

    it("should add nanoBanana node when Image option is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      // Open dropdown
      fireEvent.click(screen.getByText("Generate"));

      // Click Image option in dropdown
      const imageOption = screen.getByText("Image", { selector: "button.w-full" });
      fireEvent.click(imageOption);

      expect(mockAddNode).toHaveBeenCalledWith("nanoBanana", expect.any(Object));
    });

    it("should add generateVideo node when Video option is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Generate"));
      fireEvent.click(screen.getByText("Video", { selector: "button.w-full" }));

      expect(mockAddNode).toHaveBeenCalledWith("generateVideo", expect.any(Object));
    });

    it("should add llmGenerate node when Text (LLM) option is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Generate"));
      fireEvent.click(screen.getByText("Text (LLM)"));

      expect(mockAddNode).toHaveBeenCalledWith("llmGenerate", expect.any(Object));
    });

    it("should close dropdown after selecting an option", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Generate"));

      // Verify dropdown is open
      expect(screen.getByText("Video", { selector: "button.w-full" })).toBeInTheDocument();

      // Click an option
      fireEvent.click(screen.getByText("Video", { selector: "button.w-full" }));

      // Dropdown should close
      expect(screen.queryByText("Video", { selector: "button.w-full" })).not.toBeInTheDocument();
    });
  });

  describe("Browse Models Button", () => {
    it("should render All models button with Browse models title", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle("Browse models")).toBeInTheDocument();
        expect(screen.getByText("All models")).toBeInTheDocument();
      });
    });

    it("should open ModelSearchDialog when All models button is clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All models")).toBeInTheDocument();
      });

      const browseButton = screen.getByText("All models");
      fireEvent.click(browseButton);

      expect(mockSetModelSearchOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("All Nodes Menu", () => {
    it("should render All nodes button", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });
    });

    it("should open All nodes dropdown when clicked", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("All nodes"));

      // Check representative items from different categories
      expect(screen.getByText("Image Input")).toBeInTheDocument();
      expect(screen.getByText("Generate Image")).toBeInTheDocument();
      expect(screen.getByText("Router")).toBeInTheDocument();
      expect(screen.getByText("Output Gallery")).toBeInTheDocument();
      expect(screen.getByText("Annotate")).toBeInTheDocument();
    });

    it("should call addNode when a node is selected from All nodes menu", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("All nodes"));
      fireEvent.click(screen.getByText("Annotate"));

      expect(mockAddNode).toHaveBeenCalledWith("annotation", expect.any(Object));
    });

    it("should close All nodes dropdown after selection", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("All nodes")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("All nodes"));

      // Verify dropdown is open
      expect(screen.getByText("Image Input")).toBeInTheDocument();

      // Click an item
      fireEvent.click(screen.getByText("Image Input"));

      // Dropdown should close - "Image Input" should no longer be visible
      expect(screen.queryByText("Image Input")).not.toBeInTheDocument();
    });
  });

  describe("Edge Style Toggle", () => {
    it("should call setEdgeStyle with curved when currently angular", async () => {
      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle("Switch to curved connectors")).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle("Switch to curved connectors");
      fireEvent.click(toggleButton);

      expect(mockSetEdgeStyle).toHaveBeenCalledWith("curved");
    });

    it("should call setEdgeStyle with angular when currently curved", async () => {
      mockUseWorkflowStore.mockImplementation((selector) => {
        return selector(createDefaultState({
          edgeStyle: "curved",
        }));
      });

      render(
        <TestWrapper>
          <FloatingActionBar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTitle("Switch to angular connectors")).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle("Switch to angular connectors");
      fireEvent.click(toggleButton);

      expect(mockSetEdgeStyle).toHaveBeenCalledWith("angular");
    });
  });

});
