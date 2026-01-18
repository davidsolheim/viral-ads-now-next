'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { OrganizationSwitcher } from './organization-switcher';
import { CreateOrganizationModal } from './create-organization-modal';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  userEmail?: string;
  userName?: string;
  userImage?: string | null;
  activeOrganizationId?: string | null;
}

export function DashboardHeader({
  userEmail,
  userName,
  userImage,
  activeOrganizationId,
}: DashboardHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Projects' },
    { href: '/dashboard/library', label: 'Library' },
    { href: '/dashboard/tiktok', label: 'Trending' },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2">
              <Image
                src="/viral-ads-now-icon.png"
                alt="Viral Ads Now"
                width={32}
                height={32}
                className="h-8 w-8 rounded-xl"
              />
              <h1 className="text-xl font-bold text-gray-900">Viral Ads Now</h1>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100"
              >
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={userName || userEmail || 'User'}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {getInitials(userName, userEmail)}
                  </div>
                )}
                <div className="hidden sm:block">
                  {userName && (
                    <div className="text-sm font-medium text-gray-900">
                      {userName}
                    </div>
                  )}
                  <div className={`text-xs text-gray-500 ${userName ? '' : 'text-sm font-medium text-gray-900'}`}>
                    {userEmail}
                  </div>
                </div>
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                    {/* User Info Section */}
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        {userImage ? (
                          <Image
                            src={userImage}
                            alt={userName || userEmail || 'User'}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                            {getInitials(userName, userEmail)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {userName || 'User'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                        </div>
                      </div>
                    </div>

                    {/* Organization Switcher Section */}
                    <div className="border-b border-gray-200 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Organization
                      </div>
                      <OrganizationSwitcher
                        activeOrganizationId={activeOrganizationId}
                        onOrganizationChange={() => setIsUserMenuOpen(false)}
                        compact={true}
                      />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsCreateOrgModalOpen(true);
                        }}
                        className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Create Organization
                        </div>
                      </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        href="/settings/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Profile Settings
                      </Link>
                      <Link
                        href="/settings/organizations"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <CreateOrganizationModal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />
    </>
  );
}
