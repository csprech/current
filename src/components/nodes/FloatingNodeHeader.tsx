"use client";

import { ReactNode, useState, useEffect, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { NodeType, ProviderType } from "@/types";
import { useWorkflowStore } from "@/store/workflowStore";
import { defaultNodeDimensions } from "@/store/utils/nodeDefaults";
import { copyImageToClipboard, getNodeImageSource } from "@/utils/clipboardMedia";
import { estimateNodeRunCost, formatCost } from "@/utils/costCalculator";
import { getVariantCount } from "@/store/execution/variantExecution";
import { useMediaViewerStore } from "@/store/mediaViewerStore";
import { useToast } from "@/components/Toast";
import { ProviderBadge } from "./ProviderBadge";
import { getNodeRole, type NodeRole } from "./nodePresentation";

export interface CommentNavigationProps {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

const RUNNABLE_TYPES = new Set([
  'nanoBanana',
  'generateVideo',
  'generate3d',
  'generateAudio',
  'llmGenerate',
  'removeBackground',
  'imageAction',
]);
const EXPANDABLE_TYPES = new Set(['prompt', 'promptConstructor', 'splitGrid', 'annotation']);

function RoleGlyph({ role }: { role: NodeRole }) {
  const paths: Record<NodeRole, ReactNode> = {
    input: <path d="M5 12h14M12 5l7 7-7 7" />,
    generator: <path d="m12 3 1.4 5.1L18 6l-2.1 4.6L21 12l-5.1 1.4L18 18l-4.6-2.1L12 21l-1.4-5.1L6 18l2.1-4.6L3 12l5.1-1.4L6 6l4.6 2.1L12 3Z" />,
    processor: <path d="M5 7h14M8 7v10m8-10v10M5 17h14" />,
    router: <path d="M5 6h5v5m0 0 4-4h5m-9 4 4 4h5" />,
    output: <path d="M19 12H5m7 7-7-7 7-7" />,
  };

  return (
    <span className="current-node-header__role" data-role={role} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[role]}
      </svg>
    </span>
  );
}

interface FloatingNodeHeaderProps {
  id: string;
  type: NodeType;
  isInLockedGroup?: boolean;
  isExecuting?: boolean;
  focusedCommentNodeId?: string | null;
  position: { x: number; y: number };
  width: number;
  selected: boolean;
  onExpandNode?: (nodeId: string, nodeType: string) => void;
  onRunNode?: (nodeId: string) => void;
  headerAction?: ReactNode;
  headerButtons?: ReactNode;
  /**
   * Buttons that should remain visible regardless of hover/selected state.
   * Rendered to the left of the hover-fade control cluster.
   */
  alwaysVisibleButtons?: ReactNode;
  provider?: ProviderType;
  title: string;
  customTitle?: string;
  comment?: string;
  onCustomTitleChange?: (nodeId: string, title: string) => void;
  onCommentChange?: (nodeId: string, comment: string) => void;
  commentNavigation?: CommentNavigationProps;
}

export const FloatingNodeHeader = memo(function FloatingNodeHeader({
  id,
  type,
  isInLockedGroup = false,
  isExecuting = false,
  focusedCommentNodeId,
  position,
  width,
  selected,
  onExpandNode,
  onRunNode,
  headerAction,
  headerButtons,
  alwaysVisibleButtons,
  provider,
  title,
  customTitle,
  comment,
  onCustomTitleChange,
  onCommentChange,
  commentNavigation,
}: FloatingNodeHeaderProps) {
  const canRun = RUNNABLE_TYPES.has(type);
  const canExpand = EXPANDABLE_TYPES.has(type);
  const role = getNodeRole(type);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const isBodyHovered = useWorkflowStore((state) => state.hoveredNodeId === id);
  const isHovered = isHeaderHovered || isBodyHovered;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(customTitle || "");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editCommentValue, setEditCommentValue] = useState(comment || "");
  const [showCommentTooltip, setShowCommentTooltip] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [menuImageSrc, setMenuImageSrc] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const duplicateNodes = useWorkflowStore((state) => state.duplicateNodes);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isWorkflowRunning = useWorkflowStore((state) => state.isRunning);
  // Estimated cost of one run of this node, including variants (primitive selector — no object churn)
  const runCost = useWorkflowStore((state) => {
    if (!RUNNABLE_TYPES.has(type)) return null;
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return null;
    const perRun = estimateNodeRunCost(node);
    return perRun === null ? null : perRun * getVariantCount(node);
  });

  const titleInputRef = useRef<HTMLInputElement>(null);
  const commentPopoverRef = useRef<HTMLDivElement>(null);
  const commentButtonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Check if comment is focused for navigation
  const isCommentFocused = focusedCommentNodeId === id;

  // Sync state with props
  useEffect(() => {
    if (!isEditingTitle) {
      setEditTitleValue(customTitle || "");
    }
  }, [customTitle, isEditingTitle]);

  useEffect(() => {
    if (!isEditingComment) {
      setEditCommentValue(comment || "");
    }
  }, [comment, isEditingComment]);

  // Focus input on edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Continuously update tooltip position while showing
  useEffect(() => {
    if (!(showCommentTooltip || isCommentFocused) || !commentButtonRef.current) {
      setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      if (commentButtonRef.current) {
        const rect = commentButtonRef.current.getBoundingClientRect();
        setTooltipPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    };

    updatePosition();

    let animationId: number;
    const trackPosition = () => {
      updatePosition();
      animationId = requestAnimationFrame(trackPosition);
    };
    animationId = requestAnimationFrame(trackPosition);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [showCommentTooltip, isCommentFocused]);

  // Title handlers
  const handleTitleSubmit = useCallback(() => {
    const trimmed = editTitleValue.trim();
    if (trimmed !== (customTitle || "")) {
      onCustomTitleChange?.(id, trimmed);
    }
    setIsEditingTitle(false);
  }, [editTitleValue, customTitle, onCustomTitleChange, id]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleTitleSubmit();
      } else if (e.key === "Escape") {
        setEditTitleValue(customTitle || "");
        setIsEditingTitle(false);
      }
    },
    [handleTitleSubmit, customTitle]
  );

  // Comment handlers
  const handleCommentSubmit = useCallback(() => {
    const trimmed = editCommentValue.trim();
    if (trimmed !== (comment || "")) {
      onCommentChange?.(id, trimmed);
    }
    setIsEditingComment(false);
  }, [editCommentValue, comment, onCommentChange, id]);

  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditCommentValue(comment || "");
        setIsEditingComment(false);
      }
    },
    [comment]
  );

  // Click outside handler for comment popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commentPopoverRef.current && !commentPopoverRef.current.contains(e.target as Node)) {
        handleCommentSubmit();
      }
    };

    if (isEditingComment) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditingComment, handleCommentSubmit]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (moreButtonRef.current?.contains(target) || moreMenuRef.current?.contains(target)) return;
      setIsMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    moreMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [isMoreOpen]);

  const closeMoreMenu = useCallback((restoreFocus = false) => {
    if (restoreFocus) {
      moreButtonRef.current?.focus();
    }
    setIsMoreOpen(false);
  }, []);

  const openMoreMenu = useCallback(() => {
    // Resolve the copyable image lazily so headers never subscribe to node data.
    const node = useWorkflowStore.getState().nodes.find((n) => n.id === id);
    setMenuImageSrc(node ? getNodeImageSource(node.type, node.data) : null);
    setIsMoreOpen(true);
  }, [id]);

  const handleMoreMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMoreMenu(true);
      return;
    }

    if (event.key === "Home" || event.key === "End" || event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = Array.from(
        moreMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
      );
      if (items.length === 0) return;

      const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      let nextIndex = 0;
      if (event.key === "End") {
        nextIndex = items.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = activeIndex === -1 ? 0 : (activeIndex + 1) % items.length;
      } else if (event.key === "ArrowUp") {
        nextIndex = activeIndex === -1 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
      }
      items[nextIndex]?.focus();
    }
  }, [closeMoreMenu]);

  const handleCopyImage = useCallback(async () => {
    if (!menuImageSrc) return;
    try {
      await copyImageToClipboard(menuImageSrc);
      useToast.getState().show("Image copied to clipboard", "success");
    } catch {
      useToast.getState().show("Couldn't copy image to clipboard", "error");
    }
  }, [menuImageSrc]);

  // Determine if controls should be visible
  const showControls = isHovered || selected;

  // Drag-to-move: allow repositioning nodes by dragging the header
  const { setNodes, getNodes, getViewport } = useReactFlow();
  const isDraggingRef = useRef(false);

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Don't drag from interactive elements
    if ((e.target as HTMLElement).closest('.nodrag, button, input, textarea, a')) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    const allNodes = getNodes();
    const targetNode = allNodes.find(n => n.id === id);
    if (!targetNode) return;

    // Select this node if not already selected
    if (!targetNode.selected) {
      setNodes(nodes => nodes.map(n => ({
        ...n,
        selected: n.id === id,
      })));
    }

    // Capture starting positions of all nodes that will move
    const movingIds = targetNode.selected
      ? new Set(allNodes.filter(n => n.selected).map(n => n.id))
      : new Set([id]);
    const startPositions = new Map(
      allNodes.filter(n => movingIds.has(n.id)).map(n => [n.id, { x: n.position.x, y: n.position.y }])
    );

    isDraggingRef.current = false;

    const handlePointerMove = (e: PointerEvent) => {
      const screenDx = e.clientX - startX;
      const screenDy = e.clientY - startY;

      if (!isDraggingRef.current && (Math.abs(screenDx) > 5 || Math.abs(screenDy) > 5)) {
        isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        const { zoom } = getViewport();
        const dx = screenDx / zoom;
        const dy = screenDy / zoom;
        setNodes(nodes => nodes.map(n => {
          const startPos = startPositions.get(n.id);
          if (!startPos) return n;
          return {
            ...n,
            position: { x: startPos.x + dx, y: startPos.y + dy },
          };
        }));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasDragging = isDraggingRef.current;

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      isDraggingRef.current = false;

      // Check group membership for ALL moved nodes
      if (wasDragging) {
        const store = useWorkflowStore.getState();
        const { zoom } = getViewport();
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        for (const [nodeId, startPos] of startPositions) {
          // Calculate final position deterministically from drag delta
          const finalX = startPos.x + dx;
          const finalY = startPos.y + dy;

          // Get node dimensions from store (always fresh)
          const storeNode = store.nodes.find(n => n.id === nodeId);
          if (!storeNode) continue;

          const nodeType = storeNode.type as NodeType;
          const defaults = defaultNodeDimensions[nodeType] || { width: 300, height: 280 };
          const nodeWidth = storeNode.measured?.width || (storeNode.style?.width as number) || defaults.width;
          const nodeHeight = storeNode.measured?.height || (storeNode.style?.height as number) || defaults.height;

          // Calculate node center
          const nodeCenterX = finalX + nodeWidth / 2;
          const nodeCenterY = finalY + nodeHeight / 2;

          // Check if node center is inside any group
          let targetGroupId: string | undefined;

          for (const group of Object.values(store.groups)) {
            const inBoundsX = nodeCenterX >= group.position.x && nodeCenterX <= group.position.x + group.size.width;
            const inBoundsY = nodeCenterY >= group.position.y && nodeCenterY <= group.position.y + group.size.height;

            if (inBoundsX && inBoundsY) {
              targetGroupId = group.id;
              break;
            }
          }

          // Update groupId if it changed
          const currentGroupId = storeNode.groupId;
          if (targetGroupId !== currentGroupId) {
            store.setNodeGroupId(nodeId, targetGroupId);
          }
        }
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [id, getNodes, getViewport, setNodes]);

  return (
    <div
      className="absolute pointer-events-none transition-opacity duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 26}px`,
        width: `${width}px`,
        // Keep an open contextual menu above every sibling header, including selected ones
        zIndex: isMoreOpen ? 11000 : selected ? 10000 : 9000,
      }}
    >
      <div
        className="current-node-header group px-1 py-1 flex items-center justify-between w-full pointer-events-auto cursor-grab"
        data-role={role}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        onPointerDown={handleHeaderPointerDown}
      >
        {/* Title Section */}
        <div className="flex-1 min-w-0 max-w-[60%] flex items-center gap-1.5 pl-1">
          <RoleGlyph role={role} />
          {provider && <ProviderBadge provider={provider} />}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              placeholder="Custom title..."
              aria-label="Node title"
              className="current-node-header__title nodrag nopan w-full bg-transparent border-none outline-none text-xs font-semibold tracking-wide placeholder:text-neutral-500"
            />
          ) : (
            <button
              type="button"
              className="current-node-header__title nodrag nopan min-w-0 border-0 bg-transparent p-0 text-left text-xs font-semibold tracking-wide cursor-text truncate"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
              aria-label={`Edit ${customTitle ? `${customTitle} - ${title}` : title} title`}
            >
              {customTitle ? `${customTitle} - ${title}` : title}
            </button>
          )}
        </div>

        {/* Right-aligned controls wrapper: always-visible buttons + hover-fade cluster */}
        <div className="shrink-0 flex items-center gap-1 pr-1 -translate-y-1">
          {/* Always-visible buttons (e.g. fallback shield) — do NOT fade with hover */}
          {alwaysVisibleButtons && (
            <div className="shrink-0 flex items-center gap-1">
              {alwaysVisibleButtons}
            </div>
          )}

        {/* Controls - right-aligned, fade in on hover/selected */}
        <div className={`current-node-header__controls shrink-0 flex items-center gap-1 transition-opacity duration-200 focus-within:opacity-100 group-focus-within:opacity-100 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Header Action (e.g. Browse button) */}
          {headerAction}

          {/* Lock Badge for nodes in locked groups */}
          {isInLockedGroup && (
            <div className="shrink-0 flex items-center" title="This node is in a locked group and will be skipped during execution">
              <svg className="w-3.5 h-3.5 text-[var(--current-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}

          {/* Custom Header Buttons */}
          {headerButtons}

          {/* Comment Icon */}
          <div className="relative shrink-0 flex items-center gap-1" ref={commentPopoverRef}>
            <button
              ref={commentButtonRef}
              onClick={() => setIsEditingComment(!isEditingComment)}
              onMouseEnter={() => comment && !isCommentFocused && setShowCommentTooltip(true)}
              onMouseLeave={() => setShowCommentTooltip(false)}
              className={`current-media-action nodrag nopan ${
                comment
                  ? "text-blue-400 hover:text-blue-200"
                  : "text-neutral-500 hover:text-neutral-200 border border-neutral-600"
              }`}
              title={comment ? "Edit comment" : "Add comment"}
              aria-label={comment ? "Edit comment" : "Add comment"}
            >
              {comment ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              )}
            </button>

            {/* Comment Tooltip with Navigation */}
            {(showCommentTooltip || isCommentFocused) && comment && !isEditingComment && tooltipPosition && createPortal(
              <div
                ref={tooltipRef}
                role="tooltip"
                className="fixed z-[9999] p-3 text-sm text-neutral-200 current-transient-surface rounded-lg shadow-xl"
                style={{
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                  transform: "translateY(-100%) translateX(-50%)",
                }}
              >
                {isCommentFocused && commentNavigation && (
                  <div className="flex items-center justify-center gap-3 mb-2 pb-2 border-b border-neutral-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        commentNavigation.onPrevious();
                      }}
                      className="current-toolbar-action nodrag nopan"
                      title="Previous comment"
                      aria-label="Previous comment"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-neutral-400 min-w-[32px] text-center">
                      {commentNavigation.currentIndex}/{commentNavigation.totalCount}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        commentNavigation.onNext();
                      }}
                      className="current-toolbar-action nodrag nopan"
                      title="Next comment"
                      aria-label="Next comment"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="max-w-[240px] whitespace-pre-wrap break-words">
                  {comment}
                </div>
              </div>,
              document.body
            )}

            {/* Comment Edit Popover */}
            {isEditingComment && (
              <div role="dialog" aria-label="Edit node comment" className="absolute z-[60] right-0 top-full mt-1 w-64 p-2 current-transient-surface rounded shadow-lg">
                <textarea
                  value={editCommentValue}
                  onChange={(e) => setEditCommentValue(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Add a comment..."
                  autoFocus
                  className="nodrag nopan nowheel w-full h-20 p-2 text-xs text-neutral-100 bg-neutral-900/50 border border-neutral-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-neutral-600"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEditCommentValue(comment || "");
                      setIsEditingComment(false);
                    }}
                    className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommentSubmit}
                    className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expand Button */}
          {canExpand && onExpandNode && (
            <div className="relative shrink-0 group">
              <button
                onClick={() => onExpandNode(id, type)}
                className="nodrag nopan p-0.5 rounded transition-all duration-200 ease-in-out text-neutral-500 group-hover:text-neutral-200 border border-neutral-600 flex items-center overflow-hidden group-hover:pr-2"
                title="Expand editor"
                aria-label="Expand editor"
              >
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                <span className="max-w-0 opacity-0 whitespace-nowrap text-[10px] transition-all duration-200 ease-in-out overflow-hidden group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-1">
                  Expand
                </span>
              </button>
            </div>
          )}

          {/* Run Button — shows the estimated per-run cost when pricing is known */}
          {canRun && onRunNode && (
            <div className="relative shrink-0 group">
              <button
                onClick={() => onRunNode(id)}
                disabled={isExecuting}
                className="current-media-action current-media-action--primary current-node-header__run nodrag nopan"
                title={
                  runCost === null
                    ? "Run this node"
                    : runCost === 0
                      ? "Run this node (free — runs locally)"
                      : `Run this node (est. ${formatCost(runCost)})`
                }
                aria-label="Run this node"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="max-w-0 opacity-0 whitespace-nowrap text-[10px] transition-all duration-200 ease-in-out overflow-hidden group-hover:max-w-[96px] group-hover:opacity-100 group-hover:ml-1">
                  {runCost === null ? "Run node" : runCost === 0 ? "Run · free" : `Run · ${formatCost(runCost)}`}
                </span>
              </button>
            </div>
          )}

          {/* Contextual actions that do not compete with the primary controls. */}
          <div className="relative shrink-0">
            <button
              ref={moreButtonRef}
              type="button"
              className="current-node-header__more nodrag nopan"
              aria-label="More node actions"
              aria-haspopup="menu"
              aria-expanded={isMoreOpen}
              aria-controls={isMoreOpen ? `node-actions-${id}` : undefined}
              title="More node actions"
              onClick={() => (isMoreOpen ? closeMoreMenu() : openMoreMenu())}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  openMoreMenu();
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </button>
            {isMoreOpen && (
              <div
                ref={moreMenuRef}
                id={`node-actions-${id}`}
                className="current-node-header__menu nodrag nopan"
                role="menu"
                aria-label="Node actions"
                onKeyDown={handleMoreMenuKeyDown}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMoreMenu();
                    duplicateNodes([id]);
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isWorkflowRunning}
                  title={isWorkflowRunning ? "A workflow is already running" : "Run this node and everything after it"}
                  onClick={() => {
                    closeMoreMenu();
                    executeWorkflow(id);
                  }}
                >
                  Run from Here
                </button>
                {menuImageSrc && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu();
                      handleCopyImage();
                    }}
                  >
                    Copy Image
                  </button>
                )}
                {(type === "nanoBanana" || type === "generateVideo") && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMoreMenu();
                      useMediaViewerStore.getState().open(id);
                    }}
                  >
                    Open in Viewer
                  </button>
                )}
                <div className="current-node-header__menu-separator" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="current-node-header__menu-danger"
                  onClick={() => {
                    closeMoreMenu();
                    removeNode(id);
                  }}
                >
                  Delete Node
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
});
