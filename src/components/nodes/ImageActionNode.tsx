"use client";

import { useMemo } from "react";
import { CurrentHandle as Handle } from "./CurrentHandle";
import { Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { ImageActionNodeData } from "@/types";
import {
  IMAGE_ACTIONS,
  IMAGE_ACTIONS_BY_OPERATION,
  resolveActionParams,
  type ImageActionOperation,
  type ImageActionOptionDef,
} from "@/utils/imageOps";
import { useAdaptiveImageSrc } from "@/hooks/useAdaptiveImageSrc";
import { useShowHandleLabels } from "@/hooks/useShowHandleLabels";
import { HandleLabel } from "./HandleLabel";
import { downloadMedia } from "@/utils/downloadMedia";

type ImageActionNodeType = Node<ImageActionNodeData, "imageAction">;

function OptionField({
  def,
  value,
  onChange,
}: {
  def: ImageActionOptionDef;
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  const inputClass =
    "nodrag nopan flex-1 min-w-0 text-[11px] py-1 px-2 bg-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-600 text-white";

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-neutral-400 shrink-0 w-20 truncate" title={def.label}>
        {def.label}
      </label>
      {def.type === "select" ? (
        <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {def.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : def.type === "number" ? (
        <input
          type="number"
          value={value}
          min={def.min}
          max={def.max}
          step={def.step}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass}
        />
      ) : def.type === "color" ? (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="nodrag nopan h-6 w-12 bg-neutral-800 rounded-md border border-neutral-700 cursor-pointer"
          aria-label={def.label}
        />
      ) : (
        <input
          type="text"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.label}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function ImageActionNode({ id, data, selected }: NodeProps<ImageActionNodeType>) {
  const nodeData = data;
  const adaptiveOutputImage = useAdaptiveImageSrc(nodeData.outputImage, id);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const showLabels = useShowHandleLabels(selected);

  const operation = (nodeData.operation as ImageActionOperation) || "rotate";
  const actionDef = IMAGE_ACTIONS_BY_OPERATION.get(operation) ?? IMAGE_ACTIONS[0];
  const params = useMemo(
    () => resolveActionParams(actionDef.operation, nodeData.params),
    [actionDef.operation, nodeData.params]
  );

  const handleOperationChange = (next: string) => {
    // Params are per-operation; reset them (and the stale output) on change
    updateNodeData(id, { operation: next, params: {}, outputImage: null, status: "idle", error: null });
  };

  const handleParamChange = (key: string, value: string | number) => {
    updateNodeData(id, { params: { ...nodeData.params, [key]: value } });
  };

  return (
    <BaseNode
      id={id}
      selected={selected}
      nodeData={nodeData}
      nodeType="imageAction"
      isExecuting={isRunning}
      hasError={nodeData.status === "error"}
      minWidth={320}
      minHeight={340}
      aspectFitMedia={nodeData.outputImage}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        data-handletype="image"
        isConnectable={true}
        style={{ top: "50%" }}
      />
      <HandleLabel
        label={actionDef.imageCount === 2 ? "Images (2)" : "Image In"}
        side="target"
        color="var(--handle-color-image)"
        top="calc(50% - 7px)"
        visible={showLabels}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="image"
        data-handletype="image"
        isConnectable={true}
        style={{ top: "50%" }}
      />
      <HandleLabel label="Image Out" side="source" color="var(--handle-color-image)" top="calc(50% - 7px)" visible={showLabels} />

      <div className="flex-1 flex flex-col min-h-0 gap-2">
        {/* Output preview */}
        <div className="flex-1 min-h-[96px] relative rounded bg-neutral-900/40">
          {nodeData.outputImage ? (
            <>
              <img
                src={adaptiveOutputImage ?? undefined}
                className="absolute inset-0 w-full h-full object-contain rounded"
                alt="Image action result"
              />
              <div className="absolute top-1 right-1 flex items-center gap-0.5">
                <button
                  onClick={() => downloadMedia(nodeData.outputImage!, "image").catch(() => {})}
                  aria-label="Download result"
                  className="current-media-action current-media-action--overlay"
                  title="Download result"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => updateNodeData(id, { outputImage: null, status: "idle", error: null })}
                  aria-label="Clear result"
                  className="current-media-action current-media-action--overlay"
                  title="Clear result"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center border border-dashed border-neutral-600 rounded">
              <span className="text-[10px] text-neutral-500 text-center px-4">
                {actionDef.imageCount === 2
                  ? "Connect two images, then run — free, on-device"
                  : "Connect an image, then run — free, on-device"}
              </span>
            </div>
          )}

          {nodeData.status === "loading" && (
            <div className="absolute inset-0 bg-black/55 rounded flex items-center justify-center">
              <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>

        {/* Operation + parameters */}
        <div className="nodrag nowheel shrink-0 flex flex-col gap-1.5 px-1 pb-1">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-neutral-400 shrink-0 w-20">Operation</label>
            <select
              value={actionDef.operation}
              onChange={(e) => handleOperationChange(e.target.value)}
              aria-label="Image operation"
              className="nodrag nopan flex-1 min-w-0 text-[11px] py-1 px-2 bg-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-600 text-white"
            >
              {IMAGE_ACTIONS.map((action) => (
                <option key={action.operation} value={action.operation}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          {actionDef.options.map((option) => (
            <OptionField
              key={option.key}
              def={option}
              value={params[option.key]}
              onChange={(value) => handleParamChange(option.key, value)}
            />
          ))}
        </div>
      </div>
    </BaseNode>
  );
}
