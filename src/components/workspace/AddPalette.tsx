"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { NodeType } from "@/types";
import {
  NODE_CATALOG,
  NODE_CATALOG_BY_TYPE,
  matchesNodeCatalogItem,
  type NodeCatalogCategory,
  type NodeCatalogItem,
} from "./nodeCatalog";

const CATEGORIES = ["All", "Input", "Generate", "Process", "Route", "Output"] as const;
const RECENTS_KEY = "current:add-palette-recents";
const RECENTS_LIMIT = 5;

function readRecents(): NodeType[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((type): type is NodeType => NODE_CATALOG_BY_TYPE.has(type)) : [];
  } catch {
    return [];
  }
}

function saveRecent(type: NodeType) {
  const next = [type, ...readRecents().filter((recent) => recent !== type)].slice(0, RECENTS_LIMIT);
  sessionStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

function paneCenter() {
  const rect = document.querySelector(".react-flow")?.getBoundingClientRect();
  return rect
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export interface AddPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function AddPalette({ open, onClose }: AddPaletteProps) {
  const addNode = useWorkflowStore((state) => state.addNode);
  const edgeStyle = useWorkflowStore((state) => state.edgeStyle);
  const setEdgeStyle = useWorkflowStore((state) => state.setEdgeStyle);
  const setModelSearchOpen = useWorkflowStore((state) => state.setModelSearchOpen);
  const { screenToFlowPosition } = useReactFlow();
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<NodeType[]>([]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setCategory("All");
    setActiveIndex(0);
    setRecents(readRecents());
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const close = useCallback(() => {
    onClose();
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close, open]);

  const results = useMemo(() => NODE_CATALOG.filter((item) =>
    (category === "All" || item.category === category) && matchesNodeCatalogItem(item, query)
  ), [category, query]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  const createNode = useCallback((type: NodeType) => {
    addNode(type, screenToFlowPosition(paneCenter()));
    saveRecent(type);
    close();
  }, [addNode, close, screenToFlowPosition]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(results.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      createNode(results[activeIndex].type);
    }
  };

  if (!open || typeof document === "undefined") return null;

  const recentItems = recents.map((type) => NODE_CATALOG_BY_TYPE.get(type)).filter(Boolean) as NodeCatalogItem[];
  const grouped = CATEGORIES.slice(1).map((name) => ({
    name: name as NodeCatalogCategory,
    items: results.filter((item) => item.category === name),
  })).filter((group) => group.items.length > 0);

  return createPortal(
    <div className="current-add-palette__backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="current-add-palette" role="dialog" aria-modal="true" aria-label="Add node">
        <header className="current-add-palette__header">
          <div>
            <span className="current-add-palette__eyebrow">Workspace</span>
            <h2>Add node</h2>
          </div>
          <kbd>⌘K</kbd>
        </header>
        <label className="current-add-palette__search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            role="searchbox"
            aria-label="Search nodes"
            aria-controls="current-add-palette-results"
            aria-activedescendant={results[activeIndex] ? `add-node-${results[activeIndex].type}` : undefined}
            placeholder="Search nodes"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleSearchKeyDown}
          />
        </label>
        <nav className="current-add-palette__categories" aria-label="Node categories">
          {CATEGORIES.map((name) => (
            <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setActiveIndex(0); }}>
              {name}
            </button>
          ))}
        </nav>
        <div id="current-add-palette-results" className="current-add-palette__results" role="list" aria-label="Nodes">
          {!query && category === "All" && recentItems.length > 0 && (
            <div className="current-add-palette__group" role="group" aria-label="Recent">
              <h3>Recent</h3>
              {recentItems.map((item) => <PaletteResult key={`recent-${item.type}`} item={item} onCreate={createNode} />)}
            </div>
          )}
          {grouped.map((group) => (
            <div className="current-add-palette__group" role="group" aria-label={group.name} key={group.name}>
              <h3>{group.name}</h3>
              {group.items.map((item) => (
                <PaletteResult
                  key={item.type}
                  item={item}
                  active={results[activeIndex]?.type === item.type}
                  onCreate={createNode}
                  onHover={() => setActiveIndex(results.indexOf(item))}
                />
              ))}
            </div>
          ))}
          {results.length === 0 && <div className="current-add-palette__empty">No nodes found</div>}
        </div>
        <footer className="current-add-palette__footer">
          <button type="button" onClick={() => { setModelSearchOpen(true); close(); }}>Browse models</button>
          <button type="button" aria-label={`Connector style: ${edgeStyle === "curved" ? "Curved" : "Angular"}`} onClick={() => setEdgeStyle(edgeStyle === "curved" ? "angular" : "curved")}>
            Connectors · {edgeStyle === "curved" ? "Curved" : "Angular"}
          </button>
          <span>↑↓ navigate · ↵ add · esc close</span>
        </footer>
      </section>
    </div>,
    document.body
  );
}

function PaletteResult({ item, active, onCreate, onHover }: {
  item: NodeCatalogItem;
  active?: boolean;
  onCreate: (type: NodeType) => void;
  onHover?: () => void;
}) {
  return <div role="listitem">
    <button
      id={active === undefined ? undefined : `add-node-${item.type}`}
      type="button"
      role="button"
      aria-label={item.label}
      draggable
      className={`current-add-palette__result${active ? " is-active" : ""}`}
      onClick={() => onCreate(item.type)}
      onMouseEnter={onHover}
      onDragStart={(event) => {
        event.dataTransfer.setData("application/node-type", item.type);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span>{item.label}</span>
      <small>{item.category}</small>
    </button>
  </div>;
}
