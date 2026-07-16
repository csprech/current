import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentMark } from "@/components/current/CurrentMark";

describe("CurrentMark", () => {
  it("renders an accessible Current identity", () => {
    render(<CurrentMark showWordmark />);
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });

  it("references the approved Current brand asset family", () => {
    const { container } = render(<CurrentMark showWordmark wordmarkTone="color" />);

    expect(container.querySelector('img[src="/brand/current-icon-color.svg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/current-icon-white.svg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/current-logo-black.svg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/current-logo-color.svg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/current-logo-white.svg"]')).toBeInTheDocument();
  });

  it("contributes one accessible name when composed in a button", () => {
    render(
      <button type="button">
        <CurrentMark showWordmark />
      </button>,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName("Current");
  });

  it("keeps each mark as one accessible identity", () => {
    const { container } = render(
      <>
        <CurrentMark />
        <CurrentMark />
      </>,
    );
    expect(screen.getAllByRole("img", { name: "Current" })).toHaveLength(2);
    expect(container.querySelectorAll("linearGradient")).toHaveLength(0);
  });
});
