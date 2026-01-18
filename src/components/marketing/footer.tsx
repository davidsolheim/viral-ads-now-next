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
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Image
                src="/viral-ads-now-icon.png"
                alt="Viral Ads Now"
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl"
              />
              Viral Ads Now
            </div>
            <p className="text-sm text-gray-600">
              Create TikTok-ready video ads from product links in minutes.
            </p>
            <p className="text-xs text-gray-500">
              Focused on TikTok. More channels coming soon.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-blue-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-blue-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-blue-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-gray-500">© 2026 Viral Ads Now. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
