import { describe, it, expect, beforeEach } from "vitest";
import { nudgeUnsavedGeneration, resetUnsavedGenerationNudge } from "@/utils/unsavedGenerationNudge";
import { useToast } from "@/components/Toast";

describe("nudgeUnsavedGeneration", () => {
  beforeEach(() => {
    resetUnsavedGenerationNudge();
    useToast.setState({ message: null });
  });

  it("shows the save-your-project toast on the first unsaved generation", () => {
    nudgeUnsavedGeneration();
    expect(useToast.getState().message).toMatch(/save your project/i);
  });

  it("fires only once per session", () => {
    nudgeUnsavedGeneration();
    useToast.setState({ message: null });
    nudgeUnsavedGeneration();
    expect(useToast.getState().message).toBeNull();
  });

  it("fires again after a reset", () => {
    nudgeUnsavedGeneration();
    useToast.setState({ message: null });
    resetUnsavedGenerationNudge();
    nudgeUnsavedGeneration();
    expect(useToast.getState().message).toMatch(/save your project/i);
  });
});
