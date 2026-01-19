'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductStep } from './product-step';
import { ScriptStep } from './script-step';
import { ScenesStep } from './scenes-step';
import { ImagesStep } from './images-step';
import { VideoStep } from './video-step';
import { VoiceoverStep } from './voiceover-step';
import { MusicStep } from './music-step';
import { CaptionsStep } from './captions-step';
import { PreviewStep } from './preview-step';
import { TikTokStep } from './tiktok-step';
import { useAutoGenerateStream } from '@/hooks/use-auto-generate-stream';

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

const wizardSteps = [
  { id: 'product', name: 'Product', description: 'Review and edit product details' },
  { id: 'script', name: 'Script', description: 'Generate and select script' },
  { id: 'scenes', name: 'Scenes', description: 'Break into scenes' },
  { id: 'images', name: 'Images', description: 'Generate images' },
  { id: 'video', name: 'Video', description: 'Animate images into video' },
  { id: 'voiceover', name: 'Voiceover', description: 'Add voice narration' },
  { id: 'music', name: 'Music', description: 'Add background music' },
  { id: 'captions', name: 'Captions', description: 'Style video captions' },
  { id: 'compile', name: 'Preview', description: 'Compile and export video' },
  { id: 'tiktok', name: 'TikTok', description: 'Prepare TikTok metadata' },
];

const normalizeStepId = (stepId?: string | null) => {
  if (!stepId) return 'product';
  if (stepId === 'preview') return 'compile';
  if (stepId === 'complete') return 'tiktok';
  if (stepId === 'failed') return 'tiktok';
  if (stepId === 'style' || stepId === 'concept') return 'script';
  return stepId;
};

export function ProjectWizard({ project }: ProjectWizardProps) {
  const initialFlowType = (project.settings as any)?.flowType || 'manual';
  const [flowType, setFlowType] = useState<'manual' | 'automatic'>(initialFlowType);
  const isAutomatic = flowType === 'automatic';
  const { data: autoStream } = useAutoGenerateStream(project.id, isAutomatic);

  const steps = useMemo(() => wizardSteps, []);
  const normalizedProjectStep = normalizeStepId(project.currentStep);
  const normalizedAutoStep = normalizeStepId(autoStream?.step);
  const effectiveStepId = isAutomatic && normalizedAutoStep ? normalizedAutoStep : normalizedProjectStep;
  const currentStepIndex = steps.findIndex((s) => s.id === effectiveStepId);
  const progressIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const [activeStep, setActiveStep] = useState(currentStepIndex >= 0 ? currentStepIndex : 0);

  useEffect(() => {
    if (!isAutomatic) return;
    if (currentStepIndex >= 0 && currentStepIndex !== activeStep) {
      setActiveStep(currentStepIndex);
    }
  }, [currentStepIndex, activeStep, isAutomatic]);

  const currentStepId = steps[activeStep]?.id || steps[0].id;

  const handleSwitchToManual = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowType: 'manual', flowTypeLocked: true }),
      });
      if (!response.ok) return;
      setFlowType('manual');
    } catch (error) {
      console.error('Failed to switch to manual:', error);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-subtle transition-colors hover:text-foreground"
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
                <h1 className="text-lg font-semibold text-foreground">
                  {project.name}
                </h1>
                <p className="text-sm text-subtle">
                  Step {activeStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            {isAutomatic && (
              <Button variant="outline" onClick={handleSwitchToManual}>
                Switch to Manual
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-1 items-center"
              >
                <button
                  onClick={() => setActiveStep(index)}
                  disabled={index > progressIndex}
                  className={`flex flex-col items-center ${
                    index <= progressIndex
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      index === activeStep
                        ? 'border-brand bg-brand text-white'
                        : index < activeStep
                        ? 'border-brand bg-brand text-white'
                        : 'border-border bg-surface text-subtle'
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
                  <span className="mt-2 text-xs font-medium text-muted">
                    {step.name}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      index < activeStep ? 'bg-brand' : 'bg-border'
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
        <div className="rounded-lg bg-surface p-8 shadow-sm">
          {isAutomatic && autoStream?.message && (
            <div className="mb-6 rounded-lg border border-border bg-surface-muted p-4 text-sm text-foreground">
              {autoStream.message}
            </div>
          )}
          {currentStepId === 'product' && (
            <ProductStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'script' && (
            <ScriptStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'scenes' && (
            <ScenesStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'images' && (
            <ImagesStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'video' && (
            <VideoStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'voiceover' && (
            <VoiceoverStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'music' && (
            <MusicStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'captions' && (
            <CaptionsStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'compile' && (
            <PreviewStep
              projectId={project.id}
              onNext={() => setActiveStep(activeStep + 1)}
              readOnly={isAutomatic}
            />
          )}

          {currentStepId === 'tiktok' && (
            <TikTokStep
              projectId={project.id}
              onNext={() => {
                window.location.href = '/dashboard';
              }}
              readOnly={isAutomatic}
            />
          )}
        </div>
      </div>
    </div>
  );
}
