"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { defaultNodeDimensions } from "@/store/utils/nodeDefaults";
import type { NodeType } from "@/types";
import {
  NODE_CATALOG,
  NODE_CATALOG_BY_TYPE,
  matchesNodeCatalogItem,
  readRecentNodes,
  recordRecentNode,
  type NodeCatalogCategory,
  type NodeCatalogItem,
} from "./nodeCatalog";

const CATEGORIES = ["All", "Input", "Generate", "Process", "Route", "Output"] as const;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function paneCenter() {
  const rect = document.querySelector(".react-flow")?.getBoundingClientRect();
  return rect
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export interface AddPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Flow-space point to center the created node on (canvas double-click); pane center when absent. */
  insertAt?: { x: number; y: number } | null;
}

export function AddPalette({ open, onClose, insertAt }: AddPaletteProps) {
  const addNode = useWorkflowStore((state) => state.addNode);
  const edgeStyle = useWorkflowStore((state) => state.edgeStyle);
  const setEdgeStyle = useWorkflowStore((state) => state.setEdgeStyle);
  const setModelSearchOpen = useWorkflowStore((state) => state.setModelSearchOpen);
  const { screenToFlowPosition } = useReactFlow();
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<NodeType[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setCategory("All");
    setActiveIndex(0);
    setRecents(readRecentNodes());
    setIsDragging(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const close = useCallback(() => {
    onClose();
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsDragging(false);
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true");
      if (controls.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const focusIsOutside = !dialogRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => document.removeEventListener("keydown", handleDialogKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || isDragging || !backdropRef.current) return;
    const backdrop = backdropRef.current;
    const snapshots = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({
        element,
        inert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }));
    for (const { element } of snapshots) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
    return () => {
      for (const { element, inert, ariaHidden } of snapshots) {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
    };
  }, [isDragging, open]);

  const results = useMemo(() => NODE_CATALOG.filter((item) =>
    (category === "All" || item.category === category) && matchesNodeCatalogItem(item, query)
  ), [category, query]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  const createNode = useCallback((type: NodeType) => {
    const dims = defaultNodeDimensions[type];
    const position = insertAt
      ? { x: insertAt.x - dims.width / 2, y: insertAt.y - dims.height / 2 }
      : screenToFlowPosition(paneCenter());
    addNode(type, position);
    recordRecentNode(type);
    close();
  }, [addNode, close, insertAt, screenToFlowPosition]);

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
    <div ref={backdropRef} className={`current-add-palette__backdrop${isDragging ? " is-dragging" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} className="current-add-palette" role="dialog" aria-modal="true" aria-label="Add node" tabIndex={-1}>
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
            name="node-search"
            autoComplete="off"
            aria-label="Search nodes"
            aria-controls="current-add-palette-results"
            aria-activedescendant={results[activeIndex] ? `add-node-${results[activeIndex].type}` : undefined}
            placeholder="Search nodes…"
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
              {recentItems.map((item) => (
                <PaletteResult
                  key={`recent-${item.type}`}
                  item={item}
                  onCreate={createNode}
                  onDragStateChange={setIsDragging}
                  onSuccessfulDrag={close}
                />
              ))}
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
                  onDragStateChange={setIsDragging}
                  onSuccessfulDrag={close}
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

function PaletteResult({ item, active, onCreate, onHover, onDragStateChange, onSuccessfulDrag }: {
  item: NodeCatalogItem;
  active?: boolean;
  onCreate: (type: NodeType) => void;
  onHover?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  onSuccessfulDrag?: () => void;
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
        onDragStateChange?.(true);
      }}
      onDragEnd={(event) => {
        onDragStateChange?.(false);
        if (event.dataTransfer.dropEffect !== "none") onSuccessfulDrag?.();
      }}
    >
      <span>{item.label}</span>
      <small>{item.category}</small>
    </button>
  </div>;
}
