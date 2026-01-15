import Link from 'next/link';
import { Button } from '@/components/ui/button';

const bestPractices = [
  {
    title: 'Hook in the first 2 seconds',
    description: 'AI scripts open with curiosity-driven hooks proven to stop the scroll.',
  },
  {
    title: 'Native-style visuals',
    description: 'Scenes are formatted for TikTok pacing with clean captions and overlays.',
  },
  {
    title: 'Clear, repeated CTA',
    description: 'Every script includes CTAs that align with TikTok conversion flows.',
  },
  {
    title: 'Fast iteration',
    description: 'Generate multiple variants for A/B testing without extra editing.',
  },
];

const successStories = [
  {
    brand: 'GlowLab Skincare',
    result: '+42% ROAS',
    detail: 'Scaled from 2 to 9 TikTok ads/week without a creative team.',
  },
  {
    brand: 'UrbanFit Gear',
    result: '+31% CTR',
    detail: 'Hook testing helped find a winning angle in two days.',
  },
  {
    brand: 'PetBloom',
    result: '+28% CPA drop',
    detail: 'Replaced agency edits with AI creative variants.',
  },
];

const comingSoon = ['Instagram Reels', 'YouTube Shorts', 'Pinterest', 'Meta Ads'];

export default function TikTokAdsPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-300">
              TikTok-first creative engine
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Launch TikTok ads that feel native, not produced.
            </h1>
            <p className="mt-4 text-lg text-gray-200">
              Viral Ads Now turns product links into TikTok-native video ads built for conversion,
              not just views.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/auth/signin">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                TikTok best practices baked in
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Built for how TikTok audiences actually watch.
              </h2>
              <p className="mt-4 text-gray-600">
                Our AI is trained on high-performing TikTok creative patterns, so your ads feel
                native to the For You page.
              </p>
              <ul className="mt-6 space-y-4 text-sm text-gray-600">
                {bestPractices.map((practice) => (
                  <li key={practice.title}>
                    <p className="font-semibold text-gray-900">{practice.title}</p>
                    <p className="mt-1">{practice.description}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-xs font-semibold uppercase text-gray-500">Sample ad flow</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                  Hook: “Why do 9/10 serums fail? We fixed it.”
                </div>
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                  Proof: “Clinical test: 87% saw brighter skin in 7 days.”
                </div>
                <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                  CTA: “Tap to claim your starter kit today.”
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-600">
                Complete scripts, scenes, and captions generated instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Success stories</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">
            TikTok sellers scaling faster with Viral Ads Now.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {successStories.map((story) => (
              <div key={story.brand} className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-sm font-semibold text-gray-900">{story.brand}</p>
                <p className="mt-3 text-2xl font-bold text-blue-600">{story.result}</p>
                <p className="mt-2 text-sm text-gray-600">{story.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Coming soon</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              More e-commerce channels on the way.
            </h2>
            <p className="mt-4 text-gray-600">
              We are expanding beyond TikTok to support additional placements for e-commerce teams,
              agencies, and creators.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {comingSoon.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-600">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to win TikTok in 2026?</h2>
          <p className="mt-4 text-blue-100">
            Get your first TikTok ad live today with AI-generated creative.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" variant="secondary" className="mt-6">
              Start free trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
