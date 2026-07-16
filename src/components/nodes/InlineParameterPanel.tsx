"use client";

import React, { ReactNode, useRef, useState, useEffect } from "react";

interface InlineParameterPanelProps {
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  nodeId: string;
}

/**
 * Collapsible parameter container for inline display within generation nodes.
 * Provides a chevron toggle button and smooth animated expand/collapse.
 */
function InlineParameterPanelInner({
  expanded,
  onToggle,
  children,
  nodeId,
}: InlineParameterPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (expanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, children]);

  return (
    <>
      {/* Settings toggle button — no background when collapsed, floats below node edge */}
      <button
        type="button"
        onClick={onToggle}
        className={`current-inline-parameters__toggle nodrag nopan w-full flex items-center justify-center gap-1 py-1 transition-colors ${expanded ? "is-expanded" : ""}`}
        aria-label={expanded ? "Collapse parameters" : "Expand parameters"}
        aria-expanded={expanded}
        aria-controls={`params-${nodeId}`}
      >
        <span className="text-[10px]">Settings</span>
        <svg
          className="w-3 h-3 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content area — smooth height animation */}
      <div
        id={`params-${nodeId}`}
        className="current-inline-parameters__content nodrag nopan nowheel overflow-hidden transition-[max-height] duration-150 ease-out rounded-b-lg"
        style={{ maxHeight: expanded ? contentHeight : 0 }}
      >
        <div ref={contentRef} className="px-3 pt-2 pb-3 rounded-b-lg">
          {children}
        </div>
      </div>
    </>
  );
}

// Memoized export to prevent unnecessary re-renders
export const InlineParameterPanel = React.memo(InlineParameterPanelInner);
