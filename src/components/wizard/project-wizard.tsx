'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductStep } from './product-step';
import { StyleStep } from './style-step';
import { StoryboardStep } from './storyboard-step';
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
  { id: 'style', name: 'Style', description: 'Choose advertisement style' },
  { id: 'storyboard', name: 'Storyboard', description: 'Select your storyboard' },
  { id: 'compile', name: 'Download', description: 'Download your video' },
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

          {currentStepId === 'style' && (
            <StyleStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'storyboard' && (
            <StoryboardStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
            />
          )}

          {currentStepId === 'compile' && (
            <CompileStep
              projectId={project.id}
              onNext={() => {
                // After compile, we're done - could redirect to dashboard or show success
                window.location.href = '/dashboard';
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
