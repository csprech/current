import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppearanceToggle } from "@/components/current/AppearanceToggle";

describe("AppearanceToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.appearance;
  });

  it("lets a desktop user switch between light and dark appearance", () => {
    render(<AppearanceToggle />);

    const toggle = screen.getByRole("button", { name: "Use dark appearance" });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.appearance).toBe("dark");
    expect(localStorage.getItem("current-appearance")).toBe("dark");
    expect(screen.getByRole("button", { name: "Use light appearance" })).toBeInTheDocument();
  });
});
