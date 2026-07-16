import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppearanceToggle } from "@/components/current/AppearanceToggle";

describe("AppearanceToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.appearance;
  });

  it("starts in dark appearance and lets a desktop user switch to light", () => {
    render(<AppearanceToggle />);

    expect(document.documentElement.dataset.appearance).toBe("dark");
    expect(localStorage.getItem("current-appearance")).toBe("dark");

    const toggle = screen.getByRole("button", { name: "Use light appearance" });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.appearance).toBe("light");
    expect(localStorage.getItem("current-appearance")).toBe("light");
    expect(screen.getByRole("button", { name: "Use dark appearance" })).toBeInTheDocument();
  });

  it("keeps an appearance the user explicitly selected", () => {
    localStorage.setItem("current-appearance", "light");
    localStorage.setItem("current-appearance-user-choice", "true");

    render(<AppearanceToggle />);

    expect(document.documentElement.dataset.appearance).toBe("light");
    expect(screen.getByRole("button", { name: "Use dark appearance" })).toBeInTheDocument();
  });
});
