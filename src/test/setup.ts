import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

function createLocalStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(String(key));
    },
    setItem: (key, value) => {
      values.set(String(key), String(value));
    },
  };
}

// Node 26 exposes an unavailable global localStorage accessor unless
// --localstorage-file is configured. Use deterministic browser-like storage in tests.
const testLocalStorage = createLocalStorageMock();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testLocalStorage,
});

// Mock ResizeObserver for React Flow tests
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;

// Mock DOMMatrixReadOnly for React Flow
class DOMMatrixReadOnlyMock {
  m22: number = 1;
  constructor() {
    this.m22 = 1;
  }
}

global.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly;

// Cleanup after each test to ensure DOM is reset
afterEach(() => {
  cleanup();
  testLocalStorage.clear();
});
