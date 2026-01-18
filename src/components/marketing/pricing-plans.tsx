'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/billing/checkout-button';

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

interface PricingPlansProps {
  activeOrganizationId?: string | null;
}

export function PricingPlans({ activeOrganizationId }: PricingPlansProps) {
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
    <>
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
              {activeOrganizationId ? (
                <CheckoutButton
                  organizationId={activeOrganizationId}
                  planSlug={plan.name.toLowerCase()}
                  billingCycle={billing}
                >
                  <span className="mt-6 w-full">Get started</span>
                </CheckoutButton>
              ) : (
                <Link href="/auth/signin">
                  <Button className="mt-6 w-full">Get started</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
