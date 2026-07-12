"use client";

import { useState } from "react";
import { AssetLibrary } from "@/components/AssetLibrary";
import { GlobalImageHistory } from "@/components/GlobalImageHistory";
import { CurrentPanel } from "@/components/current/CurrentPanel";
import { CurrentSegmentedControl } from "@/components/current/CurrentSegmentedControl";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"assets" | "history">("assets");
  return (
    <CurrentPanel
      side="left"
      title="Library"
      onClose={onClose}
      actions={<CurrentSegmentedControl label="Library view" value={tab} onChange={setTab} options={[{ value: "assets", label: "Assets" }, { value: "history", label: "History" }]} />}
    >
      {tab === "assets" ? <AssetLibrary embedded /> : <GlobalImageHistory embedded />}
    </CurrentPanel>
  );
}
