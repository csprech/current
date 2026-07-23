"use client";

import { useState } from "react";
import { AssetLibrary } from "@/components/AssetLibrary";
import { GlobalImageHistory } from "@/components/GlobalImageHistory";
import { SubjectLibrary } from "@/components/SubjectLibrary";
import { CurrentPanel } from "@/components/current/CurrentPanel";
import { CurrentSegmentedControl } from "@/components/current/CurrentSegmentedControl";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"assets" | "history" | "subjects">("assets");
  return (
    <CurrentPanel
      side="left"
      title="Library"
      onClose={onClose}
      actions={<CurrentSegmentedControl label="Library view" value={tab} onChange={setTab} options={[{ value: "assets", label: "Assets" }, { value: "history", label: "History" }, { value: "subjects", label: "Subjects" }]} />}
    >
      {tab === "assets" ? <AssetLibrary embedded /> : tab === "history" ? <GlobalImageHistory embedded /> : <SubjectLibrary />}
    </CurrentPanel>
  );
}
