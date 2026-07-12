import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HandleLabel } from "../HandleLabel";

describe("HandleLabel", () => {
  it("exposes a typed connection-port label to assistive technology", () => {
    render(<HandleLabel label="Image" side="source" color="var(--current-aqua)" visible={false} />);

    const label = screen.getByLabelText("Image connection port");
    expect(label).toHaveClass("current-handle-label");
    expect(label).not.toHaveClass("is-visible");
  });

  it("marks the label visible during selection or connection drag", () => {
    render(<HandleLabel label="Text" side="target" color="var(--current-blue)" visible />);

    expect(screen.getByLabelText("Text connection port")).toHaveClass("is-visible");
  });
});
