import { describe, expect, it } from "vitest";

describe.sequential("test environment localStorage", () => {
  it("provides a writable localStorage implementation", () => {
    localStorage.setItem("setup-regression", "available");

    expect(localStorage.getItem("setup-regression")).toBe("available");
  });

  it("clears localStorage between tests", () => {
    expect(localStorage.getItem("setup-regression")).toBeNull();
  });
});
