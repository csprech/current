"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/shallow";
import { NodeType } from "@/types";
import { useReactFlow } from "@xyflow/react";
import { ModelSearchDialog } from "./modals/ModelSearchDialog";

// All nodes menu categories
const ALL_NODES_CATEGORIES: { label: string; nodes: { type: NodeType; label: string }[] }[] = [
  {
    label: "Input",
    nodes: [
      { type: "imageInput", label: "Image Input" },
      { type: "audioInput", label: "Audio Input" },
      { type: "videoInput", label: "Video Input" },
      { type: "glbViewer", label: "3D Viewer" },
    ],
  },
  {
    label: "Text",
    nodes: [
      { type: "prompt", label: "Prompt" },
      { type: "promptConstructor", label: "Prompt Constructor" },
      { type: "array", label: "Array" },
    ],
  },
  {
    label: "Generate",
    nodes: [
      { type: "nanoBanana", label: "Generate Image" },
      { type: "generateVideo", label: "Generate Video" },
      { type: "generate3d", label: "Generate 3D" },
      { type: "generateAudio", label: "Generate Audio" },
      { type: "llmGenerate", label: "LLM Generate" },
    ],
  },
  {
    label: "Process",
    nodes: [
      { type: "annotation", label: "Annotate" },
      { type: "splitGrid", label: "Split Grid" },
      { type: "videoStitch", label: "Video Stitch" },
      { type: "videoTrim", label: "Video Trim" },
      { type: "easeCurve", label: "Ease Curve" },
      { type: "videoFrameGrab", label: "Frame Grab" },
      { type: "removeBackground", label: "Remove Background" },
      { type: "imageCompare", label: "Image Compare" },
    ],
  },
  {
    label: "Route",
    nodes: [
      { type: "router", label: "Router" },
      { type: "switch", label: "Switch" },
      { type: "conditionalSwitch", label: "Conditional Switch" },
    ],
  },
  {
    label: "Output",
    nodes: [
      { type: "output", label: "Output" },
      { type: "outputGallery", label: "Output Gallery" },
    ],
  },
];

// Get the center of the React Flow pane in screen coordinates
function getPaneCenter() {
  const pane = document.querySelector('.react-flow');
  if (pane) {
    const rect = pane.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

interface NodeButtonProps {
  type: NodeType;
  label: string;
  dataTutorial?: string;
}

function NodeButton({ type, label, dataTutorial }: NodeButtonProps) {
  const addNode = useWorkflowStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const handleClick = () => {
    const center = getPaneCenter();
    const position = screenToFlowPosition({
      x: center.x,
      y: center.y,
    });

    // Nodes are created empty - tutorial will populate after connection
    addNode(type, position);
  };

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/node-type", type);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <button
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      data-tutorial={dataTutorial}
      className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-100 hover:bg-black/5 rounded-lg transition-colors cursor-grab active:cursor-grabbing"
    >
      {label}
    </button>
  );
}

function GenerateComboButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const addNode = useWorkflowStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAddNode = (type: NodeType) => {
    const center = getPaneCenter();
    const position = screenToFlowPosition({
      x: center.x + Math.random() * 100 - 50,
      y: center.y + Math.random() * 100 - 50,
    });

    addNode(type, position);
    setIsOpen(false);
  };

  const handleDragStart = (event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData("application/node-type", type);
    event.dataTransfer.effectAllowed = "copy";
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-100 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-1"
      >
        Generate
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 iris-glass rounded-lg shadow-xl overflow-hidden min-w-[140px]">
          <button
            onClick={() => handleAddNode("nanoBanana")}
            draggable
            onDragStart={(e) => handleDragStart(e, "nanoBanana")}
            className="w-full px-3 py-2 text-left text-[11px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Image
          </button>
          <button
            onClick={() => handleAddNode("generateVideo")}
            draggable
            onDragStart={(e) => handleDragStart(e, "generateVideo")}
            className="w-full px-3 py-2 text-left text-[11px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Video
          </button>
          <button
            onClick={() => handleAddNode("generate3d")}
            draggable
            onDragStart={(e) => handleDragStart(e, "generate3d")}
            className="w-full px-3 py-2 text-left text-[11px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            3D
          </button>
          <button
            onClick={() => handleAddNode("llmGenerate")}
            draggable
            onDragStart={(e) => handleDragStart(e, "llmGenerate")}
            className="w-full px-3 py-2 text-left text-[11px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Text (LLM)
          </button>
        </div>
      )}
    </div>
  );
}


function AllNodesMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const addNode = useWorkflowStore((state) => state.addNode);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const openFromCurrentCommandBar = () => setIsOpen(true);
    window.addEventListener("current:add-node", openFromCurrentCommandBar);
    return () => window.removeEventListener("current:add-node", openFromCurrentCommandBar);
  }, []);

  const handleAddNode = useCallback((type: NodeType) => {
    const center = getPaneCenter();
    const position = screenToFlowPosition({
      x: center.x + Math.random() * 100 - 50,
      y: center.y + Math.random() * 100 - 50,
    });

    addNode(type, position);
    setIsOpen(false);
  }, [addNode, screenToFlowPosition]);

  const handleDragStart = useCallback((event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData("application/node-type", type);
    event.dataTransfer.effectAllowed = "copy";
    setIsOpen(false);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-100 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-1"
      >
        All nodes
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 iris-glass rounded-lg shadow-xl overflow-hidden min-w-[180px] max-h-[400px] overflow-y-auto"
          role="menu"
          aria-label="All nodes"
        >
          {ALL_NODES_CATEGORIES.map((category, catIndex) => (
            <div key={category.label}>
              <div className={`px-3 py-1 text-[10px] text-neutral-500 uppercase tracking-wide${catIndex > 0 ? " border-t border-neutral-700" : ""}`}>
                {category.label}
              </div>
              {category.nodes.map((node) => (
                <button
                  key={node.type}
                  role="menuitem"
                  onClick={() => handleAddNode(node.type)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.type)}
                  className="w-full px-3 py-2 text-left text-[11px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
                >
                  {node.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FloatingActionBar() {
  const {
    edgeStyle,
    setEdgeStyle,
    setModelSearchOpen,
    modelSearchOpen,
    modelSearchProvider,
  } = useWorkflowStore(useShallow((state) => ({
    edgeStyle: state.edgeStyle,
    setEdgeStyle: state.setEdgeStyle,
    setModelSearchOpen: state.setModelSearchOpen,
    modelSearchOpen: state.modelSearchOpen,
    modelSearchProvider: state.modelSearchProvider,
  })));

  const toggleEdgeStyle = () => {
    setEdgeStyle(edgeStyle === "angular" ? "curved" : "angular");
  };


  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-0.5 iris-glass rounded-2xl px-2 py-1.5">
        <NodeButton type="imageInput" label="Image" dataTutorial="image-button" />
        <NodeButton type="videoInput" label="Video" />
        <NodeButton type="prompt" label="Prompt" dataTutorial="prompt-button" />
        <GenerateComboButton />
        <NodeButton type="output" label="Output" dataTutorial="output-button" />
        <AllNodesMenu />

        {/* All models button */}
        <div className="w-px h-5 bg-black/10 mx-1.5" />
        <button
          onClick={() => setModelSearchOpen(true)}
          title="Browse models"
          className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-100 hover:bg-black/5 rounded-lg transition-colors"
        >
          All models
        </button>

        <div className="w-px h-5 bg-black/10 mx-1.5" />

        <button
          onClick={toggleEdgeStyle}
          title={`Switch to ${edgeStyle === "angular" ? "curved" : "angular"} connectors`}
          className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-black/5 rounded-lg transition-colors"
        >
          {edgeStyle === "angular" ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h4l4-8 4 8h4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12c0 0 4-8 8-8s8 8 8 8" />
            </svg>
          )}
        </button>

      </div>

      {/* Model search dialog */}
      <ModelSearchDialog
        isOpen={modelSearchOpen}
        onClose={() => setModelSearchOpen(false)}
        initialProvider={modelSearchProvider}
      />
    </div>
  );
}
