import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentMark } from "@/components/current/CurrentMark";

describe("CurrentMark", () => {
  it("renders an accessible Current identity", () => {
    render(<CurrentMark showWordmark />);
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });

  it("contributes one accessible name when composed in a button", () => {
    render(
      <button type="button">
        <CurrentMark showWordmark />
      </button>,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName("Current");
  });

  it("uses a unique gradient for each mark", () => {
    const { container } = render(
      <>
        <CurrentMark />
        <CurrentMark />
      </>,
    );
    const gradients = Array.from(container.querySelectorAll("linearGradient"));
    const rectangles = Array.from(container.querySelectorAll("rect"));

    expect(gradients).toHaveLength(2);
    expect(rectangles).toHaveLength(2);
    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(2);
    rectangles.forEach((rectangle, index) => {
      expect(rectangle).toHaveAttribute("fill", `url(#${gradients[index].id})`);
    });
  });
});
