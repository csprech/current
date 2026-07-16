"use client";

import { useEffect, useState } from "react";
import { CurrentIconButton } from "./CurrentIconButton";
import { MoonIcon, SunIcon } from "./CurrentIcons";

const STORAGE_KEY = "current-appearance";
type Appearance = "light" | "dark";

function applyAppearance(appearance: Appearance) {
  document.documentElement.dataset.appearance = appearance;
  localStorage.setItem(STORAGE_KEY, appearance);
}

export function AppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const nextAppearance: Appearance = saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setAppearance(nextAppearance);
    applyAppearance(nextAppearance);
  }, []);

  const nextAppearance: Appearance = appearance === "dark" ? "light" : "dark";
  return (
    <CurrentIconButton
      label={`Use ${nextAppearance} appearance`}
      aria-pressed={appearance === "dark"}
      onClick={() => {
        setAppearance(nextAppearance);
        applyAppearance(nextAppearance);
      }}
    >
      {appearance === "dark" ? <SunIcon /> : <MoonIcon />}
    </CurrentIconButton>
  );
}
