/**
 * Usage Tracking Middleware
 * Tracks usage and checks subscription limits before allowing operations
 */

import { checkSubscriptionLimits, createUsageRecord, getCreditBalance, createCreditTransaction } from '@/lib/db-queries';
import type { NextRequest } from 'next/server';

export type UsageType = 'script_generation' | 'image_generation' | 'video_generation' | 'voiceover_generation' | 'video_render';

interface UsageTrackingResult {
  allowed: boolean;
  reason?: string;
  creditsUsed?: boolean;
}

/**
 * Check if operation is allowed and track usage
 */
export async function trackUsageAndCheckLimits(options: {
  organizationId: string;
  userId: string;
  projectId?: string;
  usageType: UsageType;
  units: number;
  cost?: number; // Cost in dollars
  provider?: 'openai' | 'replicate' | 'wasabi' | 'custom' | 'internal';
  metadata?: any;
}): Promise<UsageTrackingResult> {
  const { organizationId, userId, projectId, usageType, units, cost, provider, metadata } = options;

  // Check subscription limits
  const limitsCheck = await checkSubscriptionLimits(organizationId);

  if (!limitsCheck.hasSubscription) {
    // No subscription - check if user has credits
    const credit = await getCreditBalance(organizationId);
    const creditBalance = parseFloat(credit.balance || '0');

    // For now, assume each operation costs 1 credit
    // You can adjust this based on your pricing model
    const operationCost = 1;

    if (creditBalance < operationCost) {
      return {
        allowed: false,
        reason: 'Insufficient credits. Please purchase credits or subscribe to a plan.',
      };
    }

    // Deduct credits
    await createCreditTransaction({
      organizationId,
      userId,
      type: 'usage',
      amount: operationCost.toString(),
      description: `Usage: ${usageType}`,
    });

    // Record usage
    await createUsageRecord({
      organizationId,
      userId,
      projectId,
      type: usageType,
      units,
      cost: cost?.toString(),
      provider,
      metadata,
    });

    return {
      allowed: true,
      creditsUsed: true,
    };
  }

  // Has subscription - check if within limits
  if (!limitsCheck.withinLimits && limitsCheck.limits) {
    // Over limit - check if they have credits to cover overage
    const credit = await getCreditBalance(organizationId);
    const creditBalance = parseFloat(credit.balance || '0');

    // Assume overage costs 1 credit per operation
    const operationCost = 1;

    if (creditBalance < operationCost) {
      return {
        allowed: false,
        reason: 'Usage limit exceeded. Please purchase credits or upgrade your plan.',
      };
    }

    // Deduct credits for overage
    await createCreditTransaction({
      organizationId,
      userId,
      type: 'usage',
      amount: operationCost.toString(),
      description: `Overage usage: ${usageType}`,
    });
  }

  // Record usage (whether within limits or using credits for overage)
  await createUsageRecord({
    organizationId,
    userId,
    projectId,
    type: usageType,
    units,
    cost: cost?.toString(),
    provider,
    metadata,
  });

  return {
    allowed: true,
    creditsUsed: !limitsCheck.withinLimits,
  };
}

/**
 * Get usage summary for current billing period
 */
export async function getUsageSummary(organizationId: string) {
  const limitsCheck = await checkSubscriptionLimits(organizationId);

  if (!limitsCheck.hasSubscription || !limitsCheck.limits) {
    return {
      hasSubscription: limitsCheck.hasSubscription,
      usage: limitsCheck.usage || {},
      limits: null,
      periodStart: null,
      periodEnd: null,
    };
  }

  return {
    hasSubscription: true,
    usage: limitsCheck.usage || {},
    limits: limitsCheck.limits,
    periodStart: limitsCheck.periodStart,
    periodEnd: limitsCheck.periodEnd,
  };
}
