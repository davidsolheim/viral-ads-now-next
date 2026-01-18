'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionCard } from '@/components/billing/subscription-card';
import { CreditBalance } from '@/components/billing/credit-balance';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import Link from 'next/link';

interface Subscription {
  id: string;
  status: string;
  planId: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice?: string | null;
  yearlyPrice?: string | null;
}

interface Credit {
  balance: string;
}

interface BillingSettingsClientProps {
  organizationId?: string;
}

export function BillingSettingsClient({ organizationId }: BillingSettingsClientProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [credit, setCredit] = useState<Credit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeOrgId = organizationId || 'default-org';

  useEffect(() => {
    const fetchData = async () => {
      if (!activeOrgId) {
        setIsLoading(false);
        return;
      }

      try {
        const [subscriptionRes, creditRes] = await Promise.all([
          fetch(`/api/billing/subscription?organizationId=${activeOrgId}`),
          fetch(`/api/billing/credits?organizationId=${activeOrgId}`),
        ]);

        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          setSubscription(subscriptionData.subscription);
          setPlan(subscriptionData.plan);
        }

        if (creditRes.ok) {
          const creditData = await creditRes.json();
          setCredit(creditData.credit);
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeOrgId]);

  const handleManageSubscription = async () => {
    if (!activeOrgId) return;

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: activeOrgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Failed to open customer portal');
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading billing information..." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-2 text-gray-600">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionCard
          subscription={subscription}
          plan={plan}
          onManageClick={handleManageSubscription}
        />
        <CreditBalance
          balance={credit?.balance || '0'}
          onPurchaseClick={() => router.push('/pricing')}
        />
      </div>

      <div className="mt-8">
        <Link href="/pricing">
          <Button variant="outline">View all plans</Button>
        </Link>
      </div>
    </main>
  );
}
