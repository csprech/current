import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsTabBar } from "../SettingsTabBar";

describe("SettingsTabBar", () => {
  it("renders both tab labels", () => {
    render(
      <SettingsTabBar
        activeTab="primary"
        onTabChange={vi.fn()}
        primaryLabel="Nano Banana"
        fallbackLabel="Flux Dev"
      />
    );

    expect(screen.getByText("Nano Banana")).toBeInTheDocument();
    expect(screen.getByText("Flux Dev")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    render(
      <SettingsTabBar
        activeTab="primary"
        onTabChange={vi.fn()}
        primaryLabel="Nano Banana"
        fallbackLabel="Flux Dev"
      />
    );

    const primaryTab = screen.getByText("Nano Banana");
    const fallbackTab = screen.getByText("Flux Dev");

    expect(screen.getByRole("group", { name: "Model settings" })).toHaveClass("current-settings-tabs");
    expect(primaryTab).toHaveAttribute("aria-pressed", "true");
    expect(fallbackTab).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("calls onTabChange when clicking inactive tab", () => {
    const onTabChange = vi.fn();
    render(
      <SettingsTabBar
        activeTab="primary"
        onTabChange={onTabChange}
        primaryLabel="Nano Banana"
        fallbackLabel="Flux Dev"
      />
    );

    fireEvent.click(screen.getByText("Flux Dev"));
    expect(onTabChange).toHaveBeenCalledWith("fallback");
  });

  it("does not call onTabChange when clicking active tab", () => {
    const onTabChange = vi.fn();
    render(
      <SettingsTabBar
        activeTab="primary"
        onTabChange={onTabChange}
        primaryLabel="Nano Banana"
        fallbackLabel="Flux Dev"
      />
    );

    fireEvent.click(screen.getByText("Nano Banana"));
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("keeps both segmented buttons in the keyboard focus order", () => {
    render(<SettingsTabBar activeTab="primary" onTabChange={vi.fn()} primaryLabel="Primary" fallbackLabel="Fallback" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons[1].focus();
    expect(buttons[1]).toHaveFocus();
  });
});
