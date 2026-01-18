import { db } from '../src/db';
import { subscriptionPlans } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    monthlyPrice: '29.00',
    yearlyPrice: '24.00',
    limits: {
      videos: {
        max: 10,
        period: 'monthly',
      },
      teamSeats: 1,
      features: {
        tiktokTemplates: true,
        aiScript: true,
        aiCaptions: true,
        creativeVariants: 2,
        priorityRendering: false,
        apiAccess: false,
        brandControls: false,
        dedicatedSuccess: false,
      },
    },
    isActive: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    monthlyPrice: '79.00',
    yearlyPrice: '65.00',
    limits: {
      videos: {
        max: 50,
        period: 'monthly',
      },
      teamSeats: 3,
      features: {
        tiktokTemplates: true,
        aiScript: true,
        aiCaptions: true,
        creativeVariants: 6,
        priorityRendering: true,
        apiAccess: false,
        brandControls: false,
        dedicatedSuccess: false,
      },
    },
    isActive: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    monthlyPrice: '199.00',
    yearlyPrice: '169.00',
    limits: {
      videos: {
        max: null, // Unlimited
        period: 'monthly',
      },
      teamSeats: null, // Custom
      features: {
        tiktokTemplates: true,
        aiScript: true,
        aiCaptions: true,
        creativeVariants: null, // Unlimited
        priorityRendering: true,
        apiAccess: true,
        brandControls: true,
        dedicatedSuccess: true,
      },
    },
    isActive: true,
  },
];

async function seedPlans() {
  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    // Check if plan already exists
    const [existing] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, plan.slug))
      .limit(1);

    if (existing) {
      console.log(`Plan ${plan.slug} already exists, updating...`);
      await db
        .update(subscriptionPlans)
        .set({
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          limits: plan.limits,
          isActive: plan.isActive,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.slug, plan.slug));
    } else {
      console.log(`Creating plan ${plan.slug}...`);
      await db.insert(subscriptionPlans).values({
        name: plan.name,
        slug: plan.slug,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        limits: plan.limits,
        isActive: plan.isActive,
        createdAt: new Date(),
      });
    }
  }

  console.log('Subscription plans seeded successfully!');
}

seedPlans()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding plans:', error);
    process.exit(1);
  });
