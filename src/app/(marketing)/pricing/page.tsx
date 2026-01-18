'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const basePlans = [
  {
    name: 'Starter',
    monthly: 29,
    annual: 24,
    description: 'Launch your first TikTok creatives fast.',
    videos: '10 videos / month',
    features: ['TikTok templates', 'AI script + captions', 'Standard support'],
  },
  {
    name: 'Pro',
    monthly: 79,
    annual: 65,
    description: 'Scale winning ads with more volume.',
    videos: '50 videos / month',
    features: ['Creative variants', 'Priority rendering', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthly: 199,
    annual: 169,
    description: 'Custom workflows for large ad teams.',
    videos: 'Unlimited videos',
    features: ['API access', 'Brand controls', 'Dedicated success'],
  },
];

const comparison = [
  { feature: 'TikTok-ready templates', starter: true, pro: true, enterprise: true },
  { feature: 'AI script & scene builder', starter: true, pro: true, enterprise: true },
  { feature: 'Caption styling presets', starter: true, pro: true, enterprise: true },
  { feature: 'Creative variants per product', starter: '2', pro: '6', enterprise: 'Unlimited' },
  { feature: 'Video exports per month', starter: '10', pro: '50', enterprise: 'Unlimited' },
  { feature: 'Priority rendering', starter: false, pro: true, enterprise: true },
  { feature: 'Team seats included', starter: '1', pro: '3', enterprise: 'Custom' },
  { feature: 'Dedicated success manager', starter: false, pro: false, enterprise: true },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const plans = useMemo(
    () =>
      basePlans.map((plan) => ({
        ...plan,
        price: billing === 'monthly' ? plan.monthly : plan.annual,
      })),
    [billing]
  );

  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Pricing</p>
            <h1 className="mt-3 text-4xl font-bold text-gray-900">
              Subscription plans plus pay-per-use flexibility.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Start on a monthly plan and add extra video credits when your campaigns scale.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                billing === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                billing === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600'
              }`}
            >
              Annual
            </button>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Save 20% annually
            </span>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 shadow-sm ${
                plan.highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
                {plan.highlight && (
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-600">{plan.description}</p>
              <p className="mt-6 text-4xl font-bold text-gray-900">
                ${plan.price}
                <span className="text-base font-medium text-gray-500">/mo</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">{plan.videos}</p>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              {session?.user?.activeOrganizationId ? (
                <CheckoutButton
                  organizationId={session.user.activeOrganizationId}
                  planSlug={plan.name.toLowerCase()}
                  billingCycle={billing}
                  children={<span className="mt-6 w-full">Get started</span>}
                />
              ) : (
              <Link href="/auth/signin">
                <Button className="mt-6 w-full">Get started</Button>
              </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Usage add-ons</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">
                Pay per video when you need more volume.
              </h2>
              <p className="mt-4 text-gray-600">
                Every plan comes with flexible add-ons so you can scale quickly without upgrading
                tiers. Add credits anytime.
              </p>
              <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">Extra TikTok video</p>
                  <p className="text-2xl font-bold text-gray-900">$4</p>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Includes script, scenes, voiceover, and captions.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Trust & security
              </p>
              <h3 className="mt-3 text-2xl font-bold text-gray-900">Guaranteed results.</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li>✅ 7-day money-back guarantee</li>
                <li>✅ Secure payment processing</li>
                <li>✅ You own all created videos</li>
              </ul>
              <Link href="/contact">
                <Button className="mt-6" variant="outline">
                  Talk to sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Feature comparison
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-4 bg-gray-50 text-sm font-semibold text-gray-700">
              <div className="p-4">Features</div>
              <div className="p-4 text-center">Starter</div>
              <div className="p-4 text-center">Pro</div>
              <div className="p-4 text-center">Enterprise</div>
            </div>
            {comparison.map((row) => (
              <div key={row.feature} className="grid grid-cols-4 border-t border-gray-200 text-sm">
                <div className="p-4 text-gray-700">{row.feature}</div>
                <div className="p-4 text-center text-gray-600">
                  {row.starter === true ? '✓' : row.starter === false ? '—' : row.starter}
                </div>
                <div className="p-4 text-center text-gray-600">
                  {row.pro === true ? '✓' : row.pro === false ? '—' : row.pro}
                </div>
                <div className="p-4 text-center text-gray-600">
                  {row.enterprise === true ? '✓' : row.enterprise === false ? '—' : row.enterprise}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">Ready to launch more TikTok ads?</h2>
          <p className="mt-4 text-gray-600">
            Start with a plan today and add extra videos whenever your campaigns need more creative.
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
