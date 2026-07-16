import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetLibrary } from "@/components/AssetLibrary";

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: { saveDirectoryPath: string }) => unknown) =>
    selector({ saveDirectoryPath: "/test-project" }),
}));

class ImmediateIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(element: Element) {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

const asset = {
  id: "asset-1",
  filename: "asset.png",
  folder: "generations" as const,
  type: "image" as const,
  ext: "png",
  size: 1024,
  mtime: 1,
};

describe("AssetLibrary accessibility", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => ({
      json: async () => String(input).startsWith("/api/assets")
        ? { success: true, assets: [asset] }
        : { success: true, image: "data:image/png;base64,abc" },
    })));
  });

  it("connects trigger state to the modal panel and moves focus into it", async () => {
    render(<AssetLibrary />);
    const trigger = screen.getByRole("button", { name: "Open asset library" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /asset library/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Search assets" })).toHaveFocus());
  });

  it("traps focus and restores the exact trigger after closing", async () => {
    render(<AssetLibrary />);
    const trigger = screen.getByRole("button", { name: "Open asset library" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: /asset library/i });
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "Search assets" })).toHaveFocus());

    const focusable = dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    focusable[focusable.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(focusable[0]).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close asset library" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps the lightbox topmost so Escape closes one surface at a time", async () => {
    render(<AssetLibrary />);
    const trigger = screen.getByRole("button", { name: "Open asset library" });
    fireEvent.click(trigger);
    const assetButton = await screen.findByRole("button", { name: "Open asset asset.png" });
    await waitFor(() => expect(assetButton.querySelector("img")).toBeInTheDocument());
    fireEvent.click(assetButton);

    expect(screen.getByRole("dialog", { name: "Preview asset.png" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Preview asset.png" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /asset library/i })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /asset library/i })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("uses non-modal region semantics when embedded", async () => {
    render(<AssetLibrary embedded />);

    expect(screen.queryByRole("dialog", { name: /asset library/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open asset library" })).not.toBeInTheDocument();
    await screen.findByRole("button", { name: "Open asset asset.png" });
  });

  it("uses the provided thumbnail size for embedded output grids", async () => {
    render(<AssetLibrary embedded thumbnailSize={280} />);

    await screen.findByRole("button", { name: "Open asset asset.png" });
    expect(document.querySelector(".current-library-grid")).toHaveClass("current-library-grid--resizable");
    expect(document.querySelector(".current-library-grid")).toHaveStyle({
      "--current-library-thumbnail-size": "280px",
    });
  });
});
