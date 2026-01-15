'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductStep } from './product-step';
import { ScriptStep } from './script-step';
import { ScenesStep } from './scenes-step';
import { ImagesStep } from './images-step';
import { VoiceoverStep } from './voiceover-step';
import { CompileStep } from './compile-step';

interface Project {
  id: string;
  name: string;
  currentStep: string;
  organizationId: string;
  creatorId: string;
  settings: any;
  createdAt: Date;
  updatedAt: Date | null;
}

interface ProjectWizardProps {
  project: Project;
}

const steps = [
  { id: 'product', name: 'Product', description: 'Add product details' },
  { id: 'script', name: 'Script', description: 'Generate ad script' },
  { id: 'scenes', name: 'Scenes', description: 'Break into scenes' },
  { id: 'images', name: 'Images', description: 'Generate visuals' },
  { id: 'video', name: 'Video', description: 'Create video clips' },
  { id: 'voiceover', name: 'Voiceover', description: 'Add voiceover' },
  { id: 'music', name: 'Music', description: 'Select music' },
  { id: 'captions', name: 'Captions', description: 'Add captions' },
  { id: 'compile', name: 'Compile', description: 'Finalize video' },
  { id: 'complete', name: 'Complete', description: 'Download & share' },
];

export function ProjectWizard({ project }: ProjectWizardProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === project.currentStep);
  const [activeStep, setActiveStep] = useState(currentStepIndex >= 0 ? currentStepIndex : 0);

  const currentStepId = steps[activeStep].id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {project.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Step {activeStep + 1} of {steps.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-1 items-center"
              >
                <button
                  onClick={() => setActiveStep(index)}
                  disabled={index > currentStepIndex}
                  className={`flex flex-col items-center ${
                    index <= currentStepIndex
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      index === activeStep
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : index < activeStep
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 bg-white text-gray-500'
                    }`}
                  >
                    {index < activeStep ? (
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-700">
                    {step.name}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      index < activeStep ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          {currentStepId === 'product' && (
            <ProductStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'script' && (
            <ScriptStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'scenes' && (
            <ScenesStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'images' && (
            <ImagesStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'video' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Video Clips</h2>
              <p className="mt-2 text-gray-600">
                Animate images into video clips (Coming soon)
              </p>
              <Button onClick={() => setActiveStep(activeStep + 1)} className="mt-6">
                Continue to Voiceover
              </Button>
            </div>
          )}

          {currentStepId === 'voiceover' && (
            <VoiceoverStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'music' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Background Music</h2>
              <p className="mt-2 text-gray-600">
                Select background music (Coming soon)
              </p>
              <Button onClick={() => setActiveStep(activeStep + 1)} className="mt-6">
                Continue to Captions
              </Button>
            </div>
          )}

          {currentStepId === 'captions' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Captions</h2>
              <p className="mt-2 text-gray-600">
                Add and style captions (Coming soon)
              </p>
              <Button onClick={() => setActiveStep(activeStep + 1)} className="mt-6">
                Continue to Compile
              </Button>
            </div>
          )}

          {currentStepId === 'compile' && (
            <CompileStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'complete' && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Video Complete!
              </h2>
              <p className="mt-2 text-gray-600">
                Your viral ad is ready to download and share
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button variant="outline">Download Video</Button>
                <Link href="/dashboard">
                  <Button>Back to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
