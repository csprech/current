import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickstartInitialView } from "@/components/quickstart/QuickstartInitialView";

describe("QuickstartInitialView", () => {
  const mockOnNewProject = vi.fn();
  const mockOnSelectTemplates = vi.fn();
  const mockOnSelectVibe = vi.fn();
  const mockOnSelectLoad = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the Current title and logo", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.getByText("current")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
    });

    it("should render the description text", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(
        screen.getByText(/a sentence becomes an image, a scene, a film/i)
      ).toBeInTheDocument();
    });

    it("should render all four option buttons", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.getByText("New canvas")).toBeInTheDocument();
      expect(screen.getByText("Open project")).toBeInTheDocument();
      expect(screen.getByText("Browse templates")).toBeInTheDocument();
      expect(screen.getByText("Describe a workflow")).toBeInTheDocument();
    });

    it("should render option descriptions", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.getByText("Begin with an open workspace")).toBeInTheDocument();
      expect(screen.getByText("Continue a workflow from your library")).toBeInTheDocument();
      expect(screen.getByText("Start from a proven creative system")).toBeInTheDocument();
      expect(screen.getByText("Turn an idea into a connected flow")).toBeInTheDocument();
    });
  });

  describe("New Project Option", () => {
    it("should call onNewProject when clicked", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      fireEvent.click(screen.getByText("New canvas"));

      expect(mockOnNewProject).toHaveBeenCalledTimes(1);
    });

    it("should display correct description for new project", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.getByText("Begin with an open workspace")).toBeInTheDocument();
    });
  });

  describe("Load Workflow Option", () => {
    it("should call onSelectLoad when clicked", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      fireEvent.click(screen.getByText("Open project"));

      expect(mockOnSelectLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe("Templates Option", () => {
    it("should call onSelectTemplates when clicked", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      fireEvent.click(screen.getByText("Browse templates"));

      expect(mockOnSelectTemplates).toHaveBeenCalledTimes(1);
    });
  });

  describe("Prompt a Workflow Option", () => {
    it("should call onSelectVibe when clicked", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      fireEvent.click(screen.getByText("Describe a workflow"));

      expect(mockOnSelectVibe).toHaveBeenCalledTimes(1);
    });

    it("should display Beta badge on prompt option", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  describe("External Links", () => {
    it("should not render any external brand links", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      expect(screen.queryByText("Discord")).not.toBeInTheDocument();
      expect(screen.queryByText("Willie")).not.toBeInTheDocument();
      expect(screen.queryByText("Docs")).not.toBeInTheDocument();
      expect(screen.queryByText("NB Pro Waitlist")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have all buttons as interactive button elements", () => {
      render(
        <QuickstartInitialView
          onNewProject={mockOnNewProject}
          onSelectTemplates={mockOnSelectTemplates}
          onSelectVibe={mockOnSelectVibe}
          onSelectLoad={mockOnSelectLoad}
        />
      );

      const buttons = screen.getAllByRole("button");
      // Should have 4 option buttons
      expect(buttons.length).toBe(4);
    });
  });
});
