'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

import StepPhotos from './step-photos';
import StepType from './step-type';
import StepCost from './step-cost';
import StepReview from './step-review';
import type { InventoryType, Condition } from '@/types';

interface WizardPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface WizardState {
  // Step 1: Search
  cardId: string | null;
  player: string;
  year: number | null;
  setName: string;
  cardNumber: string;
  team: string | null;
  sport: string | null;
  position: string | null;
  rarity: string | null;
  rookie: boolean;
  parallelType: string | null;
  manufacturer: string | null;

  // Step 2: Type & Grade
  type: InventoryType;
  condition: Condition | null;
  gradeCompany: string | null;
  gradeValue: string | null;
  certNumber: string | null;

  // Step 3: Cost
  costBasis: number | null;

  // Step 4: PSA Comps
  price: number | null;
  spinPool: boolean;

  // Step 5: Photos
  photos: string[];
  photoFiles: WizardPhoto[];

  // Additional
  title: string;
  description: string | null;
}

const INITIAL_STATE: WizardState = {
  cardId: null,
  player: '',
  year: null,
  setName: '',
  cardNumber: '',
  team: null,
  sport: null,
  position: null,
  rarity: null,
  rookie: false,
  parallelType: null,
  manufacturer: null,

  type: 'single',
  condition: null,
  gradeCompany: null,
  gradeValue: null,
  certNumber: null,

  costBasis: null,

  price: null,
  spinPool: false, // Auto-assign if no price set

  photos: [],
  photoFiles: [],

  title: '',
  description: null,
};

const STEPS = ['Photos', 'Card Info', 'Cost', 'Review'];

function revokePreviewUrl(photo: WizardPhoto) {
  if (photo.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

export default function CardWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_STATE);
  const latestPhotoFilesRef = useRef(wizardState.photoFiles);

  useEffect(() => {
    latestPhotoFilesRef.current = wizardState.photoFiles;
  }, [wizardState.photoFiles]);

  useEffect(() => {
    return () => {
      latestPhotoFilesRef.current.forEach(revokePreviewUrl);
    };
  }, []);

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => {
      if (updates.photoFiles) {
        const nextPhotoIds = new Set(updates.photoFiles.map((photo) => photo.id));
        prev.photoFiles
          .filter((photo) => !nextPhotoIds.has(photo.id))
          .forEach(revokePreviewUrl);
      }

      return { ...prev, ...updates };
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepPhotos state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 1:
        return <StepType state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 2:
        return <StepCost state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 3:
        return <StepReview state={wizardState} updateState={updateState} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">List a Card</h1>
        <p className="text-muted-foreground mt-2">
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
        </p>
      </div>

      <Card className="p-6">
        {/* Step Indicators */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx === currentStep
                    ? 'bg-red-600 text-white'
                    : idx < currentStep
                      ? 'bg-red-100 text-red-600'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    idx < currentStep ? 'bg-red-600' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Separator className="mb-8" />

        {/* Step Content */}
        {renderStep()}
      </Card>

      {/* Navigation */}
      <div className="flex justify-start gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
