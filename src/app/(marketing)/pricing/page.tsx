import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { PricingPlans } from '@/components/marketing/pricing-plans';

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

export default async function PricingPage() {
  const session = await auth();

  return (
    <div className="bg-white">
      <PricingPlans activeOrganizationId={session?.user?.activeOrganizationId || null} />

      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Usage add-ons</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">
                Pay per video when you need more volume.
              </h2>
              <p className="mt-4 text-muted">
                Every plan comes with flexible add-ons so you can scale quickly without upgrading
                tiers. Add credits anytime.
              </p>
              <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-foreground">Extra TikTok video</p>
                  <p className="text-2xl font-bold text-foreground">$4</p>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Includes script, scenes, voiceover, and captions.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-brand/30 bg-brand-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                Trust & security
              </p>
              <h3 className="mt-3 text-2xl font-bold text-foreground">Guaranteed results.</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted">
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
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Feature comparison
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-4 bg-surface-muted text-sm font-semibold text-muted">
              <div className="p-4">Features</div>
              <div className="p-4 text-center">Starter</div>
              <div className="p-4 text-center">Pro</div>
              <div className="p-4 text-center">Enterprise</div>
            </div>
            {comparison.map((row) => (
              <div key={row.feature} className="grid grid-cols-4 border-t border-border text-sm">
                <div className="p-4 text-muted">{row.feature}</div>
                <div className="p-4 text-center text-muted">
                  {row.starter === true ? '✓' : row.starter === false ? '—' : row.starter}
                </div>
                <div className="p-4 text-center text-muted">
                  {row.pro === true ? '✓' : row.pro === false ? '—' : row.pro}
                </div>
                <div className="p-4 text-center text-muted">
                  {row.enterprise === true ? '✓' : row.enterprise === false ? '—' : row.enterprise}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground">Ready to launch more TikTok ads?</h2>
          <p className="mt-4 text-muted">
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
