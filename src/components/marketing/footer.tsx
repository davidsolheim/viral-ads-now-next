import Link from 'next/link';
import Image from 'next/image';

const productLinks = [
  { href: '/tiktok-ads', label: 'TikTok Ads' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
];

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center">
              <Image
                src="/banner.svg"
                alt="Viral Ads Now"
                width={120}
                height={36}
                className="h-9 w-auto rounded-xl"
              />
            </div>
            <p className="text-sm text-muted">
              Create TikTok-ready video ads from product links in minutes.
            </p>
            <p className="text-xs text-subtle">
              Focused on TikTok. More channels coming soon.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-subtle">© 2026 Viral Ads Now. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
