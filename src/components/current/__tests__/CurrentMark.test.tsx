import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentMark } from "@/components/current/CurrentMark";

describe("CurrentMark", () => {
  it("renders an accessible Current identity", () => {
    render(<CurrentMark />);
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  });

  it("renders only the approved adaptive monochrome Current assets", () => {
    const { container } = render(<CurrentMark />);

    expect(container.querySelectorAll('img[src="/brand/current-icon-white.svg"]')).toHaveLength(0);
    expect(container.querySelectorAll('img[src="/brand/current-logo-black.svg"]')).toHaveLength(1);
    expect(container.querySelectorAll('img[src="/brand/current-logo-white.svg"]')).toHaveLength(1);
    expect(container.querySelector(".current-brand-icon")).not.toBeInTheDocument();
    for (const assetType of ["icon", "logo"]) {
      expect(container.querySelectorAll(`img[src="/brand/current-${assetType}-color.svg"]`)).toHaveLength(0);
    }
  });

  it("contributes one accessible name when composed in a button", () => {
    render(
      <button type="button">
        <CurrentMark />
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
