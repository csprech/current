import { describe, it, expect, beforeEach } from "vitest";
import {
  migrateLegacyLocalStorage,
  STORAGE_KEY,
  GENERATE_IMAGE_DEFAULTS_KEY,
  FTUX_COMPLETED_KEY,
} from "../localStorage";

describe("migrateLegacyLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("moves every legacy node-banana-* key to the current-* prefix", () => {
    localStorage.setItem("node-banana-workflow-configs", '{"wf_1":{"workflowId":"wf_1"}}');
    localStorage.setItem("node-banana-ftux-completed", "true");
    localStorage.setItem("node-banana-models-cache", '{"models":[]}');
    localStorage.setItem("unrelated-key", "untouched");

    migrateLegacyLocalStorage();

    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"wf_1":{"workflowId":"wf_1"}}');
    expect(localStorage.getItem(FTUX_COMPLETED_KEY)).toBe("true");
    expect(localStorage.getItem("current-models-cache")).toBe('{"models":[]}');
    expect(localStorage.getItem("node-banana-workflow-configs")).toBeNull();
    expect(localStorage.getItem("node-banana-ftux-completed")).toBeNull();
    expect(localStorage.getItem("node-banana-models-cache")).toBeNull();
    expect(localStorage.getItem("unrelated-key")).toBe("untouched");
  });

  it("renames the image-defaults key away from the legacy model nickname", () => {
    localStorage.setItem("node-banana-nanoBanana-defaults", '{"resolution":"2K"}');

    migrateLegacyLocalStorage();

    expect(localStorage.getItem(GENERATE_IMAGE_DEFAULTS_KEY)).toBe('{"resolution":"2K"}');
    expect(localStorage.getItem("node-banana-nanoBanana-defaults")).toBeNull();
  });

  it("never overwrites data the user already has under the new name", () => {
    localStorage.setItem("current-workflow-configs", '{"wf_new":{}}');
    localStorage.setItem("node-banana-workflow-configs", '{"wf_old":{}}');

    migrateLegacyLocalStorage();

    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"wf_new":{}}');
    expect(localStorage.getItem("node-banana-workflow-configs")).toBeNull();
  });

  it("is idempotent", () => {
    localStorage.setItem("node-banana-recent-models", "[]");
    migrateLegacyLocalStorage();
    migrateLegacyLocalStorage();
    expect(localStorage.getItem("current-recent-models")).toBe("[]");
    expect(localStorage.length).toBe(1);
  });
});
