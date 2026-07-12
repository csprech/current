"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowVersion } from "@/app/api/workflow/versions/route";
import { CurrentButton, CurrentSheet } from "@/components/current";

function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkflowVersionHistory() {
  const { saveDirectoryPath, workflowName, listWorkflowVersions, restoreWorkflowVersion } =
    useWorkflowStore(
      useShallow((state) => ({
        saveDirectoryPath: state.saveDirectoryPath,
        workflowName: state.workflowName,
        listWorkflowVersions: state.listWorkflowVersions,
        restoreWorkflowVersion: state.restoreWorkflowVersion,
      }))
    );

  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setVersions(await listWorkflowVersions());
    setLoading(false);
  }, [listWorkflowVersions]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      const ok = await restoreWorkflowVersion(id);
      setRestoringId(null);
      if (ok) setIsOpen(false);
    },
    [restoreWorkflowVersion]
  );

  // Only meaningful once a project has a save location
  if (!saveDirectoryPath || !workflowName) return null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Version history"
        className="current-icon-button"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <CurrentSheet
        open={isOpen}
        title="Version History"
        onClose={() => setIsOpen(false)}
        width="standard"
        returnFocusRef={triggerRef}
      >
          <div className="max-h-[62vh] flex flex-col">
            <p className="text-[10px] text-neutral-500 mb-2">Last {versions.length} saves</p>
            <div className="flex-1 overflow-y-auto py-1">
              {loading && <p className="text-xs text-neutral-500 text-center py-6">Loading…</p>}
              {!loading && versions.length === 0 && (
                <p className="text-xs text-neutral-500 text-center py-6 px-3">
                  No previous versions yet. They accumulate each time you save.
                </p>
              )}
              {!loading &&
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-neutral-700/40 group"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-neutral-300">{formatWhen(v.timestamp)}</p>
                      <p className="text-[10px] text-neutral-500">{formatSize(v.size)}</p>
                    </div>
                    <CurrentButton
                      onClick={() => handleRestore(v.id)}
                      disabled={restoringId !== null}
                      variant="secondary"
                    >
                      {restoringId === v.id ? "Restoring…" : "Restore"}
                    </CurrentButton>
                  </div>
                ))}
            </div>

            <div className="px-3 py-1.5 border-t border-neutral-700 bg-neutral-900/50 shrink-0">
              <span className="text-[10px] text-neutral-500">Restoring keeps your current state until you save again</span>
            </div>
          </div>
      </CurrentSheet>
    </>
  );
}
