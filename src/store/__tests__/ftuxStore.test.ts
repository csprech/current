import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFTUXStore } from "@/store/ftuxStore";

describe("FTUX tutorial flow", () => {
  beforeEach(() => {
    useFTUXStore.getState().resetTutorial();
    useFTUXStore.setState({ loadTutorialSampleImage: vi.fn() });
  });

  it("teaches node creation through the current Add Node control", () => {
    useFTUXStore.getState().startTutorial();
    const steps = useFTUXStore.getState().tutorialSteps;

    expect(steps.find((step) => step.id === "add-image")).toEqual(expect.objectContaining({
      highlightSelector: '[data-tutorial="add-node-button"]',
      message: expect.stringContaining("Add Node"),
    }));
    expect(steps.find((step) => step.id === "add-prompt-node")).toEqual(expect.objectContaining({
      highlightSelector: '[data-tutorial="add-node-button"]',
      message: expect.stringContaining("Add Node"),
    }));
  });
});
