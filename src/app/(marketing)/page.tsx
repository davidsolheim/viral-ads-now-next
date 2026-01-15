import Link from 'next/link';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Videos generated', value: '12,400+' },
  { label: 'Avg. time to publish', value: '< 5 minutes' },
  { label: 'TikTok-ready templates', value: '40+' },
];

const platforms = [
  { name: 'TikTok', status: 'Live' },
  { name: 'Shopify', status: 'Coming soon' },
  { name: 'Amazon', status: 'Coming soon' },
  { name: 'Instagram Reels', status: 'Coming soon' },
  { name: 'YouTube Shorts', status: 'Coming soon' },
];

const steps = [
  {
    title: 'Paste your product link',
    description: 'Import product details, images, and benefits in seconds.',
  },
  {
    title: 'AI creates the ad',
    description: 'Scripts, scenes, visuals, voiceover, and captions generated instantly.',
  },
  {
    title: 'Download and post',
    description: 'Get a TikTok-ready video with captioned variants.',
  },
];

const features = [
  {
    title: 'AI Scriptwriting',
    description: 'Hook-driven scripts tailored for TikTok conversions.',
  },
  {
    title: 'Auto Voiceover',
    description: 'Human-sounding voices with pacing tuned for ads.',
  },
  {
    title: 'Caption Styling',
    description: 'Built-in subtitle styles that match viral formats.',
  },
  {
    title: 'Scene Builder',
    description: 'Break your script into scroll-stopping scenes automatically.',
  },
  {
    title: 'Creative Variants',
    description: 'Generate multiple angles to test different hooks.',
  },
  {
    title: 'Team Collaboration',
    description: 'Organize projects across brands and teammates.',
  },
];

const testimonials = [
  {
    quote:
      'We launched 6 TikTok ads in a day. ROAS jumped 34% after swapping in Viral Ads Now creatives.',
    name: 'Ashley N.',
    role: 'Shopify Founder',
  },
  {
    quote:
      'It feels like having a full creative team on demand. The scripts are shockingly good.',
    name: 'Marco L.',
    role: 'Performance Marketer',
  },
  {
    quote:
      'Our product videos finally look native on TikTok. The captions and pacing are perfect.',
    name: 'Priya S.',
    role: 'Amazon Seller',
  },
];

const pricing = [
  {
    name: 'Starter',
    price: '$29',
    description: 'Best for testing your first TikTok ads.',
    items: ['10 videos / month', 'TikTok-ready templates', 'Standard support'],
  },
  {
    name: 'Pro',
    price: '$79',
    description: 'Scale winning creatives faster.',
    items: ['50 videos / month', 'Creative variants', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams running high-volume campaigns.',
    items: ['Unlimited videos', 'API access', 'Dedicated success'],
  },
];

const faqs = [
  {
    question: 'How fast can I create a TikTok ad?',
    answer: 'Most sellers go from product link to finished video in under 5 minutes.',
  },
  {
    question: 'Can I pay per video in addition to a plan?',
    answer: 'Yes. Every plan includes a per-video add-on rate for extra volume.',
  },
  {
    question: 'What platforms are supported?',
    answer: 'TikTok is live. Shopify, Amazon, Instagram Reels, and YouTube Shorts are next.',
  },
  {
    question: 'Do I own the videos?',
    answer: 'Yes, all generated ads are yours to download and publish.',
  },
];

export default function MarketingHomePage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              TikTok-first video ad platform
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Turn product links into TikTok ads that convert in minutes.
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Viral Ads Now creates scripts, visuals, voiceovers, and captions so you can post
              winning TikTok creatives without a studio, editor, or agency.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/auth/signin">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View pricing
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-gray-500">
              <span>✅ No credit card required</span>
              <span>✅ Cancel anytime</span>
              <span>✅ Secure AI workflows</span>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
            <div className="rounded-2xl bg-gray-900 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-gray-300">Demo timeline</p>
              <h3 className="mt-3 text-lg font-semibold">Glow Serum TikTok Ad</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="rounded-lg bg-white/10 px-3 py-2">Scene 1 · Hook + Problem</div>
                <div className="rounded-lg bg-white/10 px-3 py-2">Scene 2 · Product reveal</div>
                <div className="rounded-lg bg-white/10 px-3 py-2">Scene 3 · Proof + CTA</div>
              </div>
              <p className="mt-4 text-xs text-gray-400">Ready for export in 4:32</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-blue-50 px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
            <p className="font-semibold uppercase tracking-wide text-gray-400">
              Built for TikTok sellers, expanding next
            </p>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform.name}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium"
                >
                  <span className="text-gray-700">{platform.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      platform.status === 'Live'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {platform.status}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">How it works</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              Go from product link to viral ad in three steps.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-semibold text-blue-600">Step {index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Built for performance marketers
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Every feature designed to boost TikTok conversions.
              </h2>
            </div>
            <Link href="/how-it-works" className="text-sm font-semibold text-blue-600">
              See the full workflow →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Before & after</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              Your product link becomes a polished TikTok narrative.
            </h2>
            <p className="mt-4 text-gray-600">
              Upload a product URL and get a storyboard with hooks, captions, and scenes tailored
              for TikTok viewers. No editing needed.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button variant="outline">View examples</Button>
              <Link href="/pricing">
                <Button>Start now</Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase text-gray-500">Before</p>
              <p className="mt-3 text-sm text-gray-600">
                Product link + images + scattered reviews.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-semibold uppercase text-blue-700">After</p>
              <p className="mt-3 text-sm text-blue-900">
                Scripted TikTok ad with voiceover, captions, and call-to-action.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Testimonials</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">
            Trusted by e-commerce teams launching TikTok ads fast.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-700">“{testimonial.quote}”</p>
                <p className="mt-4 text-sm font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-xs text-gray-500">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Subscription plans plus pay-per-use flexibility.
              </h2>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-blue-600">
              See full pricing →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pricing.map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{plan.price}</p>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {plan.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <Link href="/auth/signin">
                  <Button className="mt-6 w-full">Get started</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">Answers for fast-moving teams.</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Launch your next TikTok ad today.</h2>
          <p className="mt-4 text-lg text-blue-100">
            Save hours on creative production and ship high-performing ads in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/auth/signin">
              <Button size="lg" variant="secondary">
                Start free trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Talk to sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
