import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AvailableVariable } from "@/types";
import { usePromptAutocomplete } from "@/hooks/usePromptAutocomplete";
import { CurrentAlert, CurrentButton } from "@/components/current";
import { FocusWorkspace } from "@/components/workspace/FocusWorkspace";

const FONT_SIZE_STORAGE_KEY = "prompt-constructor-editor-font-size";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24];

interface PromptConstructorEditorModalProps {
  isOpen: boolean;
  initialTemplate: string;
  availableVariables: AvailableVariable[];
  onSubmit: (template: string) => void;
  onClose: () => void;
}

export const PromptConstructorEditorModal: React.FC<PromptConstructorEditorModalProps> = ({
  isOpen,
  initialTemplate,
  availableVariables,
  onSubmit,
  onClose,
}) => {
  const [template, setTemplate] = useState(initialTemplate);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
          return parsed;
        }
      }
    }
    return DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    setTemplate(initialTemplate);
  }, [initialTemplate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
    }
  }, [fontSize]);

  const hasUnsavedChanges = template !== initialTemplate;

  const {
    showAutocomplete,
    autocompletePosition,
    filteredAutocompleteVars,
    selectedAutocompleteIndex,
    handleChange: autocompleteHandleChange,
    handleKeyDown: autocompleteHandleKeyDown,
    handleAutocompleteSelect,
    closeAutocomplete,
  } = usePromptAutocomplete({
    availableVariables,
    textareaRef,
    localTemplate: template,
    setLocalTemplate: setTemplate,
  });

  // Unresolved variables
  const unresolvedVars = useMemo(() => {
    const varPattern = /@(\w+)/g;
    const unresolved: string[] = [];
    const matches = template.matchAll(varPattern);
    const availableNames = new Set(availableVariables.map((v) => v.name));

    for (const match of matches) {
      const varName = match[1];
      if (!availableNames.has(varName) && !unresolved.includes(varName)) {
        unresolved.push(varName);
      }
    }
    return unresolved;
  }, [template, availableVariables]);

  // Resolved preview
  const resolvedPreview = useMemo(() => {
    let resolved = template;
    availableVariables.forEach((v) => {
      resolved = resolved.replace(new RegExp(`@${v.name}`, "g"), v.value);
    });
    return resolved;
  }, [template, availableVariables]);

  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleFocusEscape = useCallback(() => {
    if (showAutocomplete) closeAutocomplete();
    else handleAttemptClose();
  }, [showAutocomplete, closeAutocomplete, handleAttemptClose]);

  const handleSubmit = useCallback(() => {
    setShowConfirmation(false);
    onSubmit(template);
    onClose();
  }, [template, onSubmit, onClose]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontSize(parseInt(e.target.value, 10));
  }, []);

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Insert @varName at cursor when clicking a variable pill
  const handleVariablePillClick = useCallback(
    (varName: string) => {
      if (!textareaRef.current) return;
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const insertion = `@${varName}`;
      const newTemplate = template.slice(0, start) + insertion + template.slice(end);
      setTemplate(newTemplate);

      const newCursorPos = start + insertion.length;
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [template]
  );

  if (!isOpen) return null;

  return (
    <>
      <FocusWorkspace
        title="Edit Prompt Constructor"
        onBack={handleAttemptClose}
        onEscape={handleFocusEscape}
        secondaryActions={<CurrentButton variant="secondary" onClick={handleAttemptClose}>Cancel</CurrentButton>}
        primaryAction={<CurrentButton variant="primary" onClick={handleSubmit}>Submit</CurrentButton>}
      >
      <div className="h-full flex flex-col py-5">
        <div className="px-6 pb-4 flex items-center gap-3">
          {unresolvedVars.length > 0 && (
            <span className="current-model-badge current-model-badge--capability px-2 py-0.5 rounded text-[11px]">
              Unresolved: {unresolvedVars.map((v) => `@${v}`).join(", ")}
            </span>
          )}
        </div>

        {/* Box containing toolbar and textarea */}
        <div className="mx-6 flex-1 flex flex-col border border-neutral-700 rounded bg-neutral-900/30 overflow-hidden mb-4">
          {/* Toolbar */}
          <div className="min-h-[48px] bg-neutral-900 border-b border-neutral-700 flex items-center px-4 gap-3 shrink-0 flex-wrap py-2">
            {/* Font Size Control */}
            <select
              value={fontSize}
              onChange={handleFontSizeChange}
              className="text-sm py-1 px-2 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
            >
              {FONT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>

            {/* Divider */}
            {availableVariables.length > 0 && (
              <div className="w-px h-5 bg-neutral-700" />
            )}

            {/* Variable pills */}
            {availableVariables.map((v) => (
              <button
                key={v.nodeId}
                onClick={() => handleVariablePillClick(v.name)}
                className="px-2 py-0.5 text-[11px] text-blue-400 bg-blue-900/20 border border-blue-700/40 rounded hover:bg-blue-900/40 transition-colors"
                title={v.value || "(empty)"}
              >
                @{v.name}
              </button>
            ))}
          </div>

          {/* Textarea with autocomplete */}
          <div className="relative flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={template}
              onChange={autocompleteHandleChange}
              onKeyDown={autocompleteHandleKeyDown}
              placeholder="Type @ to insert variables..."
              className="nodrag nopan nowheel flex-1 w-full p-6 leading-relaxed text-neutral-100 bg-transparent border-0 resize-none focus:outline-none placeholder:text-neutral-500"
              style={{ fontSize: `${fontSize}px` }}
              autoFocus
            />

            {/* Autocomplete dropdown */}
            {showAutocomplete && filteredAutocompleteVars.length > 0 && (
              <div
                role="listbox"
                aria-label="Prompt variables"
                className="absolute z-10 current-transient-surface rounded shadow-xl max-h-40 overflow-y-auto"
                style={{
                  top: autocompletePosition.top + 16,
                  left: autocompletePosition.left + 24,
                }}
              >
                {filteredAutocompleteVars.map((variable, index) => (
                  <button
                    key={variable.nodeId}
                    role="option"
                    aria-selected={index === selectedAutocompleteIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAutocompleteSelect(variable.name);
                    }}
                    className={`w-full px-3 py-2 text-left text-[11px] flex flex-col gap-0.5 transition-colors ${
                      index === selectedAutocompleteIndex
                        ? "bg-neutral-700 text-neutral-100"
                        : "text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <div className="font-medium text-blue-400">@{variable.name}</div>
                    <div className="text-neutral-500 truncate max-w-[200px]">
                      {variable.value || "(empty)"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resolved preview */}
        {availableVariables.length > 0 && (
          <div className="mx-6 mb-4 border border-neutral-700 rounded bg-neutral-900/30 overflow-hidden">
            <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-700 text-[11px] text-neutral-400 uppercase tracking-wide font-semibold">
              Resolved Preview
            </div>
            <div className="p-4 text-sm text-neutral-300 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
              {resolvedPreview || <span className="text-neutral-500 italic">Empty template</span>}
            </div>
          </div>
        )}

      </div>
      </FocusWorkspace>
      <CurrentAlert
        open={showConfirmation}
        title="You have unsaved changes"
        description="Discard your constructor edits and return to the canvas?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        danger
        onCancel={handleDismissConfirmation}
        onConfirm={onClose}
        alternateAction={{ label: "Submit", onClick: handleSubmit, variant: "primary" }}
      />
    </>
  );
};
