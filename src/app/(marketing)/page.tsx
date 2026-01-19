import Link from 'next/link';
import Image from 'next/image';
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
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-surface-muted">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              TikTok-first video ad platform
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Turn product links into TikTok ads that convert in minutes.
            </h1>
            <p className="mt-6 text-lg text-muted">
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
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-subtle">
              <span>✅ No credit card required</span>
              <span>✅ Cancel anytime</span>
              <span>✅ Secure AI workflows</span>
            </div>
          </div>
          <div className="relative h-[400px] w-full overflow-hidden rounded-2xl shadow-xl lg:h-[500px]">
            <Image
              src="/banner.png"
              alt="Viral Ads Now - Create Instant Video Ads"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-subtle">
            <p className="font-semibold uppercase tracking-wide text-subtle">
              Built for TikTok sellers, expanding next
            </p>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform.name}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium"
                >
                  <span className="text-foreground">{platform.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      platform.status === 'Live'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-surface-alt text-muted'
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

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">How it works</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Go from product link to viral ad in three steps.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-xs font-semibold text-brand">Step {index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                Built for performance marketers
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">
                Every feature designed to boost TikTok conversions.
              </h2>
            </div>
            <Link href="/how-it-works" className="text-sm font-semibold text-brand">
              See the full workflow →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Before & after</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Your product link becomes a polished TikTok narrative.
            </h2>
            <p className="mt-4 text-muted">
              Upload a product URL and get a concept with hooks, captions, and scenes tailored
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
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase text-subtle">Before</p>
              <p className="mt-3 text-sm text-muted">
                Product link + images + scattered reviews.
              </p>
            </div>
            <div className="rounded-2xl border border-brand/30 bg-brand-50 p-5">
              <p className="text-xs font-semibold uppercase text-brand">After</p>
              <p className="mt-3 text-sm text-foreground">
                Scripted TikTok ad with voiceover, captions, and call-to-action.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Testimonials</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            Trusted by e-commerce teams launching TikTok ads fast.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-sm text-muted">“{testimonial.quote}”</p>
                <p className="mt-4 text-sm font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-xs text-subtle">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">
                Subscription plans plus pay-per-use flexibility.
              </h2>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-brand">
              See full pricing →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pricing.map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-foreground">{plan.price}</p>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
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
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">Answers for fast-moving teams.</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm text-muted">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Launch your next TikTok ad today.</h2>
          <p className="mt-4 text-lg text-brand-100">
            Save hours on creative production and ship high-performing ads in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/auth/signin">
              <Button size="lg" variant="secondary">
                Start free trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white/10">
                Talk to sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
