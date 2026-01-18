'use client';

import { Button } from '@/components/ui/button';

interface SubscriptionCardProps {
  subscription: {
    id: string;
    status: string;
    planId: string;
    currentPeriodStart?: Date | string;
    currentPeriodEnd?: Date | string;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: {
    id: string;
    name: string;
    monthlyPrice?: string | null;
    yearlyPrice?: string | null;
  } | null;
  onManageClick?: () => void;
}

export function SubscriptionCard({ subscription, plan, onManageClick }: SubscriptionCardProps) {
  if (!subscription || !plan) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
        <p className="mt-2 text-sm text-gray-600">No active subscription</p>
        <Button className="mt-4" onClick={onManageClick}>
          Subscribe to a plan
        </Button>
      </div>
    );
  }

  const periodStart = subscription.currentPeriodStart
    ? new Date(subscription.currentPeriodStart)
    : null;
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">{plan.name}</p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              statusColors[subscription.status] || statusColors.canceled
            }`}
          >
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
          </span>
        </div>
        {plan.monthlyPrice && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${plan.monthlyPrice}</p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        )}
      </div>

      {periodEnd && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            {subscription.cancelAtPeriodEnd
              ? `Cancels on ${periodEnd.toLocaleDateString()}`
              : `Renews on ${periodEnd.toLocaleDateString()}`}
          </p>
        </div>
      )}

      {onManageClick && (
        <div className="mt-4">
          <Button variant="outline" onClick={onManageClick} className="w-full">
            Manage Subscription
          </Button>
        </div>
      )}
    </div>
  );
}
