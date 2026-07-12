import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Position, ReactFlowProvider } from "@xyflow/react";
import { HandleLabel } from "../HandleLabel";
import { CurrentHandle } from "../CurrentHandle";

describe("HandleLabel", () => {
  it("associates its accessible name with the actual React Flow handle", () => {
    const { container } = render(
      <ReactFlowProvider>
        <CurrentHandle type="source" position={Position.Right} id="image" data-handletype="image" />
        <HandleLabel label="Image" side="source" color="var(--current-aqua)" visible={false} />
      </ReactFlowProvider>
    );

    const handle = container.querySelector(".react-flow__handle");
    expect(handle).toHaveAccessibleName("Image connection port");

    const label = screen.getByText("Image");
    expect(label).toHaveClass("current-handle-label");
    expect(label).not.toHaveClass("is-visible");
    expect(label).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the label visible during selection or connection drag", () => {
    render(<HandleLabel label="Text" side="target" color="var(--current-blue)" visible />);

    expect(screen.getByText("Text")).toHaveClass("is-visible");
  });

  it("gives an unlabeled actual handle a typed fallback name", () => {
    const { container } = render(
      <ReactFlowProvider>
        <CurrentHandle type="target" position={Position.Left} id="audio" data-handletype="audio" />
      </ReactFlowProvider>
    );

    expect(container.querySelector(".react-flow__handle")).toHaveAccessibleName("Audio connection port");
  });
});
