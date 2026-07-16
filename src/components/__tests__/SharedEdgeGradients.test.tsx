import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SharedEdgeGradients } from "@/components/edges/SharedEdgeGradients";

describe("SharedEdgeGradients", () => {
  it("keeps idle node connections legible on the canvas", () => {
    const { container } = render(
      <svg>
        <SharedEdgeGradients />
      </svg>
    );

    const stops = container.querySelectorAll("#edge-grad-image-dimmed stop");

    expect(stops[0]).toHaveAttribute("stop-opacity", "0.4");
    expect(stops[1]).toHaveAttribute("stop-opacity", "0.26");
    expect(stops[2]).toHaveAttribute("stop-opacity", "0.4");
  });
});
