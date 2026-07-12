import React from "react";

interface SettingsTabBarProps {
  activeTab: "primary" | "fallback";
  onTabChange: (tab: "primary" | "fallback") => void;
  primaryLabel: string;
  fallbackLabel: string;
}

export function SettingsTabBar({
  activeTab,
  onTabChange,
  primaryLabel,
  fallbackLabel,
}: SettingsTabBarProps) {
  return (
    <div className="current-settings-tabs" role="group" aria-label="Model settings">
      <button
        type="button"
        aria-pressed={activeTab === "primary"}
        className="current-settings-tabs__tab"
        onClick={() => {
          if (activeTab !== "primary") onTabChange("primary");
        }}
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        aria-pressed={activeTab === "fallback"}
        className="current-settings-tabs__tab"
        onClick={() => {
          if (activeTab !== "fallback") onTabChange("fallback");
        }}
      >
        {fallbackLabel}
      </button>
    </div>
  );
}
