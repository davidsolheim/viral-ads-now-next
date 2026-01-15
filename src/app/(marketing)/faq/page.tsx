import Link from 'next/link';
import { Button } from '@/components/ui/button';

const highlights = [
  { label: 'Avg. time to first ad', value: '4 minutes' },
  { label: 'Creative variants per product', value: 'Up to 6' },
  { label: 'Export formats', value: 'TikTok-ready' },
];

const categories = [
  {
    title: 'Getting started',
    description: 'Everything you need to launch your first TikTok creative.',
    items: [
      {
        question: 'How quickly can I generate my first ad?',
        answer:
          'Most teams create their first TikTok-ready ad in under five minutes after pasting a product link.',
      },
      {
        question: 'Do I need a creative team or editor?',
        answer:
          'No. Viral Ads Now generates scripts, scenes, captions, and voiceover automatically.',
      },
      {
        question: 'What platforms are supported?',
        answer:
          'TikTok is live today. Shopify, Amazon, Instagram Reels, and YouTube Shorts are next.',
      },
      {
        question: 'Can I upload my own assets?',
        answer:
          'Yes. You can bring brand fonts, logos, and preferred product shots to keep ads on brand.',
      },
    ],
  },
  {
    title: 'Pricing & usage',
    description: 'Flexible plans plus add-ons when you need more volume.',
    items: [
      {
        question: 'Is there a free trial?',
        answer:
          'Yes. Start a free trial to preview scripts and generate your first videos without a credit card.',
      },
      {
        question: 'Can I buy extra videos without upgrading?',
        answer:
          'Every plan includes pay-per-video add-ons so you can scale during busy launches.',
      },
      {
        question: 'Do unused credits roll over?',
        answer:
          'Monthly credits reset each cycle, but annual plans include a larger buffer for seasonal spikes.',
      },
      {
        question: 'Can teams share seats?',
        answer:
          'Pro plans include multiple seats with shared libraries, and enterprise includes custom access.',
      },
    ],
  },
  {
    title: 'Creative output',
    description: 'How the ads look, feel, and perform.',
    items: [
      {
        question: 'Do I own the videos?',
        answer: 'Yes. All generated videos are yours to download and publish anywhere.',
      },
      {
        question: 'Can I edit scripts or scenes?',
        answer:
          'Absolutely. You can tweak scripts, reorder scenes, and regenerate voiceovers before export.',
      },
      {
        question: 'What does the voiceover sound like?',
        answer:
          'We use human-sounding voices tuned for TikTok pacing, with multiple accents and tones.',
      },
      {
        question: 'How many variants can I create?',
        answer:
          'Generate multiple hook angles per product to test different openings and CTAs.',
      },
    ],
  },
  {
    title: 'Security & support',
    description: 'Data handling, ownership, and help when you need it.',
    items: [
      {
        question: 'Is my data secure?',
        answer:
          'Yes. We use encrypted storage and follow best practices for data access and retention.',
      },
      {
        question: 'Can I delete projects?',
        answer:
          'You can delete any project at any time, and assets are removed from production storage.',
      },
      {
        question: 'How fast is support?',
        answer:
          'Support responds within one business day for all plans, with priority response for Pro.',
      },
      {
        question: 'Do you offer onboarding?',
        answer:
          'Enterprise teams receive guided onboarding, plus creative templates tailored to your brand.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">FAQ</p>
            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              Answers for fast-moving TikTok teams.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Learn how Viral Ads Now works, what you get with each plan, and how to scale
              high-performing creatives without a studio.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/auth/signin">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Talk to sales
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              What teams love
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">Launch creatives in minutes.</h2>
            <p className="mt-3 text-sm text-gray-600">
              From product link to TikTok-ready ad, with scripts, scenes, captions, and voiceover
              included.
            </p>
            <div className="mt-6 grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {categories.map((category) => (
              <div key={category.title} className="rounded-3xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {category.title}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-gray-900">{category.description}</h2>
                <div className="mt-6 space-y-4">
                  {category.items.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
                        <span className="flex items-center justify-between">
                          {item.question}
                          <span className="ml-4 text-gray-400 group-open:rotate-45 transition-transform">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-sm text-gray-600">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Still have questions?
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Talk to our team about your TikTok growth goals.
              </h2>
              <p className="mt-4 text-gray-600">
                Get a live walkthrough, discuss creative strategy, and see how quickly you can
                launch.
              </p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="space-y-4 text-sm text-gray-700">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  Live demo tailored to your products
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  Creative strategy and iteration plan
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  Personalized rollout timeline
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact">
                  <Button>Contact sales</Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline">View pricing</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
