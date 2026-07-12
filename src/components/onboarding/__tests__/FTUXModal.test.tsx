import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FTUXModal } from "@/components/onboarding/FTUXModal";

vi.mock("@/components/onboarding/FTUXWelcomeStep", () => ({ FTUXWelcomeStep: () => <p>Welcome content</p> }));

describe("FTUXModal", () => {
  it("presents first-run setup in the shared Current sheet language", async () => {
    render(<FTUXModal onComplete={vi.fn()} onStartTutorial={vi.fn()} />);

    const sheet = await screen.findByRole("dialog", { name: "Welcome to Current" });
    expect(sheet).toHaveAttribute("data-surface", "sheet");
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });
});
