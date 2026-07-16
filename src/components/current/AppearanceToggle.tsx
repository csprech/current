"use client";

import { useEffect, useState } from "react";
import { CurrentIconButton } from "./CurrentIconButton";
import { MoonIcon, SunIcon } from "./CurrentIcons";

const STORAGE_KEY = "current-appearance";
const EXPLICIT_CHOICE_KEY = "current-appearance-user-choice";
type Appearance = "light" | "dark";

function applyAppearance(appearance: Appearance, explicit = false) {
  document.documentElement.dataset.appearance = appearance;
  localStorage.setItem(STORAGE_KEY, appearance);
  if (explicit) localStorage.setItem(EXPLICIT_CHOICE_KEY, "true");
}

export function AppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const hasExplicitChoice = localStorage.getItem(EXPLICIT_CHOICE_KEY) === "true";
    const nextAppearance: Appearance = hasExplicitChoice && (saved === "dark" || saved === "light")
      ? saved
      : "dark";
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
        applyAppearance(nextAppearance, true);
      }}
    >
      {appearance === "dark" ? <SunIcon /> : <MoonIcon />}
    </CurrentIconButton>
  );
}
