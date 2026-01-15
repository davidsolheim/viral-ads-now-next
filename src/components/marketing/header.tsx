import Link from 'next/link';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/tiktok-ads', label: 'TikTok Ads' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            VA
          </span>
          Viral Ads Now
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-blue-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="hidden text-sm font-semibold text-gray-700 sm:inline">
            Sign in
          </Link>
          <Link href="/auth/signin">
            <Button>Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
