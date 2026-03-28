'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import StepPhotos from './step-photos';
import StepSearch from './step-search';
import StepType from './step-type';
import StepCost from './step-cost';
import StepComps from './step-comps';
import StepReview from './step-review';
import { ensureCardPhotosBucket } from '@/lib/supabase/storage-actions';
import type { InventoryType, Condition } from '@/types';

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
  spinPool: false,

  photos: [],

  title: '',
  description: null,
};

const STEPS = ['Photos', 'Search', 'Type & Grade', 'Cost', 'PSA Comps', 'Review'];

export default function CardWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_STATE);

  // Ensure storage bucket exists on mount
  useEffect(() => {
    ensureCardPhotosBucket().catch((err) => {
      console.error('Failed to ensure storage bucket:', err);
      // Continue anyway - user can debug from browser console
    });
  }, []);

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
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
        return <StepSearch state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 2:
        return <StepType state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 3:
        return <StepCost state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 4:
        return <StepComps state={wizardState} updateState={updateState} onNext={handleNext} />;
      case 5:
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
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 && (
          <Button onClick={handleNext} className="gap-2 bg-red-600 hover:bg-red-700">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
