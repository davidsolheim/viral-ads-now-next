import Link from 'next/link';
import { Button } from '@/components/ui/button';

const workflowSteps = [
  {
    title: 'Product',
    description: 'Paste a product link or add details manually.',
    time: '30 sec',
  },
  {
    title: 'Script',
    description: 'AI generates hook-based scripts optimized for TikTok.',
    time: '45 sec',
  },
  {
    title: 'Scenes',
    description: 'Break the script into high-impact scenes automatically.',
    time: '30 sec',
  },
  {
    title: 'Images',
    description: 'Create visuals and product shots for each scene.',
    time: '1 min',
  },
  {
    title: 'Video',
    description: 'Animate scenes into short-form clips (coming soon).',
    time: '1 min',
  },
  {
    title: 'Voiceover',
    description: 'Generate a natural voice that matches the ad tone.',
    time: '45 sec',
  },
  {
    title: 'Music',
    description: 'Pick a background track that matches the vibe.',
    time: '30 sec',
  },
  {
    title: 'Captions',
    description: 'Apply TikTok-styled captions and highlight words.',
    time: '30 sec',
  },
  {
    title: 'Compile',
    description: 'Render the final video with all assets synced.',
    time: '1 min',
  },
  {
    title: 'Complete',
    description: 'Download and post your TikTok-ready ad.',
    time: 'Instant',
  },
];

const outcomes = [
  'TikTok-native pacing with strong hooks',
  'Captioned, voiceover-ready videos',
  'Multiple variants for A/B testing',
  'Ready to publish in under 5 minutes',
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-border bg-gradient-to-br from-brand-50 via-white to-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">How it works</p>
            <h1 className="mt-3 text-4xl font-bold text-foreground">
              From product link to TikTok ad in minutes.
            </h1>
            <p className="mt-4 text-lg text-muted">
              Viral Ads Now automates the entire creative workflow so you can launch more TikTok ads
              without extra headcount.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-brand/30 bg-surface p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-brand">Video walkthrough</p>
              <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-brand/30 bg-brand-50 text-sm text-brand-700">
                Demo video placeholder
              </div>
              <p className="mt-4 text-sm text-muted">
                See a full walkthrough of the 10-step flow with real TikTok ads.
              </p>
              <Button className="mt-6">Watch demo</Button>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs font-semibold uppercase text-brand">What you get</p>
              <h2 className="mt-3 text-2xl font-bold text-foreground">
                A complete TikTok ad kit.
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {outcomes.map((item) => (
                  <li key={item}>✅ {item}</li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button className="mt-6" variant="outline">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Every step optimized for TikTok performance.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-brand">Step {index + 1}</p>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                    {step.time}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">Ready to automate your TikTok ads?</h2>
          <p className="mt-4 text-muted">
            Launch your first video today and keep your creative pipeline full.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" className="mt-6">
              Start free trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
