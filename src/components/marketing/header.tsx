import Link from 'next/link';
import Image from 'next/image';
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
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/banner.svg"
            alt="Viral Ads Now"
            width={120}
            height={36}
            className="h-9 w-auto rounded-xl"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="hidden text-sm font-semibold text-muted transition-colors hover:text-foreground sm:inline">
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
