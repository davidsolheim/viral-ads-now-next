import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const contactOptions = [
  {
    title: 'Sales & demos',
    description: 'Book a walkthrough to see how quickly you can launch TikTok creatives.',
    detail: 'sales@viraladsnow.com',
  },
  {
    title: 'Support',
    description: 'Get help with billing, exports, or troubleshooting within one business day.',
    detail: 'support@viraladsnow.com',
  },
  {
    title: 'Partnerships',
    description: 'Interested in integrations or creative partnerships? Let us know.',
    detail: 'partners@viraladsnow.com',
  },
];

const responseTimes = [
  { label: 'Sales response', value: 'Same day' },
  { label: 'Support response', value: '< 24 hours' },
  { label: 'Onboarding', value: '48 hours' },
];

export default function ContactPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Contact</p>
            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              Let us help you launch your next TikTok ad.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Tell us about your goals, product catalog, and creative volume. We will recommend the
              fastest path to scale winning ads.
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
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Response times
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">Fast support, every day.</h2>
            <p className="mt-3 text-sm text-gray-600">
              Our team is optimized for speed so you can keep campaigns moving.
            </p>
            <div className="mt-6 space-y-4">
              {responseTimes.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              We also offer private Slack channels for enterprise teams.
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Send a note</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900">
              Tell us about your creative goals.
            </h2>
            <p className="mt-4 text-gray-600">
              Share your product catalog size, target markets, and expected ad volume. We will
              follow up with a tailored plan.
            </p>
            <form
              className="mt-8 grid gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
              action="mailto:hello@viraladsnow.com"
              method="post"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First name" name="firstName" placeholder="Alex" required />
                <Input label="Last name" name="lastName" placeholder="Morgan" required />
              </div>
              <Input label="Work email" name="email" type="email" placeholder="you@brand.com" required />
              <Input label="Company" name="company" placeholder="Brand name" />
              <Input label="Monthly creative volume" name="volume" placeholder="50+ videos" />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-900" htmlFor="message">
                  Project details
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Tell us about your products, goals, and timeline."
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  By submitting, you agree to receive emails about your request.
                </p>
                <Button type="submit">Send request</Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Contact options
              </p>
              <div className="mt-6 space-y-4">
                {contactOptions.map((option) => (
                  <div key={option.title} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{option.description}</p>
                    <p className="mt-3 text-sm font-semibold text-blue-600">{option.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
              <h3 className="text-2xl font-bold text-gray-900">Prefer a quick call?</h3>
              <p className="mt-3 text-sm text-gray-700">
                We can walk through your creative goals, benchmarks, and rollout plan in 20
                minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/auth/signin">
                  <Button>Schedule a demo</Button>
                </Link>
                <Link href="/faq">
                  <Button variant="outline">Read FAQ</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Trusted by fast-growing brands</h3>
              <p className="mt-3 text-sm text-gray-600">
                Teams use Viral Ads Now to move from product link to TikTok-ready ad without
                slowing down growth.
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Average time to publish: under 5 minutes
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Script + scene generation included
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Creative variants ready to test
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
