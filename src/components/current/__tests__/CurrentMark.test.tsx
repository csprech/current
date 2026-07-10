import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentMark } from "@/components/current/CurrentMark";

describe("CurrentMark", () => {
  it("renders an accessible Current identity", () => {
    render(<CurrentMark showWordmark />);
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });

  it("uses a unique gradient for each mark", () => {
    const { container } = render(
      <>
        <CurrentMark />
        <CurrentMark />
      </>,
    );
    const gradients = Array.from(container.querySelectorAll("linearGradient"));

    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(2);
  });
});
