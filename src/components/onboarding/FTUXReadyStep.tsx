"use client";

import { CurrentButton } from "@/components/current";

interface FTUXReadyStepProps {
  onStartTutorial: () => void;
  onComplete: () => void;
}

export function FTUXReadyStep({ onStartTutorial, onComplete }: FTUXReadyStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-8">
      <h2 className="text-2xl font-semibold text-neutral-100 mb-4">
        You're ready!
      </h2>
      <p className="text-neutral-300 text-center leading-relaxed mb-8">
        Want a quick tutorial?
      </p>

      <div className="flex gap-3">
        <CurrentButton
          variant="quiet"
          onClick={onComplete}
          className="px-5 py-2.5 text-sm"
        >
          Skip
        </CurrentButton>
        <CurrentButton
          variant="primary"
          onClick={onStartTutorial}
          className="px-5 py-2.5 text-sm"
        >
          Start tutorial
        </CurrentButton>
      </div>
    </div>
  );
}
