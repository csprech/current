import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FTUXReadyStep } from "@/components/onboarding/FTUXReadyStep";

describe("FTUXReadyStep", () => {
  it("uses the shared primary action treatment for starting the tutorial", () => {
    render(<FTUXReadyStep onComplete={vi.fn()} onStartTutorial={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Start tutorial" })).toHaveAttribute("data-variant", "primary");
  });
});
