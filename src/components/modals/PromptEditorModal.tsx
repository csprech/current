import React, { useState, useEffect, useCallback } from 'react';
import { CurrentAlert, CurrentButton } from '@/components/current';
import { FocusWorkspace } from '@/components/workspace/FocusWorkspace';

const FONT_SIZE_STORAGE_KEY = 'prompt-editor-font-size';
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24];

interface PromptEditorModalProps {
  isOpen: boolean;
  initialPrompt: string;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
  isOpen,
  initialPrompt,
  onSubmit,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    // Load font size from localStorage on mount
    if (typeof window !== 'undefined') {
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

  // Update local state when initial prompt changes
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  // Save font size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
    }
  }, [fontSize]);

  // Track unsaved changes
  const hasUnsavedChanges = prompt !== initialPrompt;

  // Handle close attempt - show confirmation if there are unsaved changes
  const handleAttemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleSubmit = useCallback(() => {
    onSubmit(prompt);
    onClose();
  }, [prompt, onSubmit, onClose]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontSize(parseInt(e.target.value, 10));
  }, []);

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <FocusWorkspace
        title="Edit Prompt"
        onBack={handleAttemptClose}
        onEscape={handleAttemptClose}
        secondaryActions={<CurrentButton variant="secondary" onClick={handleAttemptClose}>Cancel</CurrentButton>}
        primaryAction={<CurrentButton variant="primary" onClick={handleSubmit}>Submit</CurrentButton>}
      >
      <div className="h-full flex flex-col py-5">
        {/* Box containing toolbar and textarea */}
        <div className="mx-6 flex-1 flex flex-col border border-neutral-700 rounded bg-neutral-900/30 overflow-hidden mb-4">
          {/* Toolbar - header of the box */}
          <div className="h-12 bg-neutral-900 border-b border-neutral-700 flex items-center px-4 gap-3 shrink-0">
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
          </div>

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what to generate..."
            className="nodrag nopan nowheel flex-1 w-full p-6 leading-relaxed text-neutral-100 bg-transparent border-0 resize-none focus:outline-none placeholder:text-neutral-500"
            style={{ fontSize: `${fontSize}px` }}
            autoFocus
          />
        </div>

      </div>
      </FocusWorkspace>
      <CurrentAlert
        open={showConfirmation}
        title="You have unsaved changes"
        description="Discard your edits and return to the canvas?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        danger
        onCancel={handleDismissConfirmation}
        onConfirm={onClose}
      />
    </>
  );
};
