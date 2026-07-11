import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FloatingActionBar } from "@/components/FloatingActionBar";

describe("FloatingActionBar compatibility boundary", () => {
  it("renders no legacy production controls", () => {
    const { container } = render(<FloatingActionBar />);
    expect(container).toBeEmptyDOMElement();
  });
});
