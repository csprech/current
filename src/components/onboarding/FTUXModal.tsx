"use client";

import { useState } from "react";
import { FTUXModalProps, FTUXStep } from "@/types/ftux";
import { setFTUXCompleted } from "@/store/utils/localStorage";
import { FTUXWelcomeStep } from "./FTUXWelcomeStep";
import { FTUXApiKeysStep } from "./FTUXApiKeysStep";
import { FTUXModelDefaultsStep } from "./FTUXModelDefaultsStep";
import { FTUXReadyStep } from "./FTUXReadyStep";
import { CurrentAlert, CurrentButton, CurrentMark, CurrentSheet } from "@/components/current";

export function FTUXModal({ onComplete, onStartTutorial }: FTUXModalProps) {
  const [currentStep, setCurrentStep] = useState<FTUXStep>(1);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const handleNext = () => {
    if (currentStep === 4) {
      // Last step - user chose "Skip Tutorial"
      setFTUXCompleted(true);
      onComplete();
    } else {
      setCurrentStep((currentStep + 1) as FTUXStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FTUXStep);
    }
  };

  const handleSkip = () => {
    setFTUXCompleted(true);
    onComplete();
  };

  const handleStartTutorial = () => {
    setFTUXCompleted(true);
    onStartTutorial();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Welcome";
      case 2:
        return "API Keys";
      case 3:
        return "Model Defaults";
      case 4:
        return "Ready";
      default:
        return "";
    }
  };

  const getButtonText = () => {
    if (currentStep === 4) return "Get Started";
    return "Next";
  };

  return (
    <>
      <CurrentSheet
      open
      title={currentStep === 1 ? "Welcome to Current" : getStepTitle()}
      onClose={() => setShowSkipConfirm(true)}
      width={currentStep === 4 ? "compact" : "standard"}
    >
      <div className="current-ftux">
        {currentStep !== 4 && (
          <div className="current-ftux__progress">
            <CurrentMark />
            <span>Step {currentStep} of 4</span>
            <div className="current-ftux__steps" aria-label={`Setup step ${currentStep} of 4`}>
              {([1, 2, 3, 4] as const).map((step) => (
                <span key={step} data-active={step <= currentStep ? "true" : undefined} />
              ))}
            </div>
          </div>
        )}

        <div className="current-ftux__content">
          {currentStep === 1 && <FTUXWelcomeStep />}
          {currentStep === 2 && <FTUXApiKeysStep />}
          {currentStep === 3 && <FTUXModelDefaultsStep />}
          {currentStep === 4 && (
            <FTUXReadyStep
              onStartTutorial={handleStartTutorial}
              onComplete={handleSkip}
            />
          )}
        </div>

        {currentStep !== 4 && (
          <div className="current-ftux__footer">
            <CurrentButton variant="quiet" onClick={handleBack} disabled={currentStep === 1}>
              Back
            </CurrentButton>
            <CurrentButton variant="primary" onClick={handleNext}>
              {getButtonText()}
            </CurrentButton>
          </div>
        )}

      </div>
      </CurrentSheet>
      <CurrentAlert
        open={showSkipConfirm}
        title="Skip setup?"
        description="You can configure API keys and model defaults later in settings."
        onCancel={() => setShowSkipConfirm(false)}
        onConfirm={handleSkip}
        confirmLabel="Skip"
      />
    </>
  );
}
