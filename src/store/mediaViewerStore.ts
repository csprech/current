import { create } from "zustand";

/**
 * Which node's media viewer (fullscreen preview + history grid) is open.
 * Opened via F on a selected media node or the expand action on its preview.
 */
interface MediaViewerStore {
  nodeId: string | null;
  open: (nodeId: string) => void;
  close: () => void;
}

export const useMediaViewerStore = create<MediaViewerStore>((set) => ({
  nodeId: null,
  open: (nodeId: string) => set({ nodeId }),
  close: () => set({ nodeId: null }),
}));
