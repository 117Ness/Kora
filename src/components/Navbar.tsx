'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  CalendarDays,
  BookOpen,
  TrendingUp,
  ChefHat,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    name: 'Plan',
    href: '/',
    icon: CalendarDays,
    description: 'Weekly schedule & daily targets',
  },
  {
    name: 'Library',
    href: '/library',
    icon: BookOpen,
    description: 'Recipes & pantry inventory',
  },
  {
    name: 'Insights',
    href: '/insights',
    icon: TrendingUp,
    description: 'Cost & health analytics',
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#C8BFA8] bg-[#F3EDE0]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo & Desktop Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            {/* Thin-stroke olive line-art icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C8BFA8] bg-[#EBE3D2] text-[#7A7463] shadow-xs transition-transform group-hover:scale-105">
              <ChefHat className="h-5 w-5" strokeWidth={1.5} />
            </div>

            {/* Editorial Serif Kora Wordmark */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-[#3E3C32] leading-none">
                  Kora
                </span>
                <span className="inline-flex items-center rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-1.5 py-0.5 text-[10px] font-semibold text-[#7D7765] font-sans">
                  v1
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-medium text-[#7D7765] font-sans mt-0.5">
                Kitchen &bull; Cookbook
              </span>
            </div>
          </Link>

          {/* Warm hairline divider */}
          <div className="hidden md:block h-6 w-px bg-[#C8BFA8]" />

          {/* Desktop Navigation Links with Pill-shaped active nav states & thin-stroke icons */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                      : 'text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2]/70'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? 'text-[#F7F2E7]' : 'text-[#7D7765]'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side items: Warm hairline divider & Pill-shaped status */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-6 w-px bg-[#C8BFA8]" />
          <div className="flex items-center gap-2 rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-3.5 py-1.5 text-xs font-medium text-[#3E3C32] shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7A7463] animate-pulse" />
            <span className="font-sans text-[#3E3C32]">Personal Kitchen</span>
            <span className="text-[#7D7765]">&bull; Single-User</span>
          </div>
        </div>

        {/* Mobile menu button with thin-stroke icon */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-full p-2 text-[#3E3C32] border border-[#C8BFA8] bg-[#EBE3D2] hover:bg-[#E4DCCB] focus:outline-none focus:ring-1 focus:ring-[#7A7463] transition-colors"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open navigation menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown with warm hairline divider, thin-stroke icons, and pill states */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#C8BFA8] bg-[#F3EDE0] px-4 pt-3 pb-4 space-y-1.5 shadow-md">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                    : 'text-[#3E3C32] bg-[#EBE3D2]/60 hover:bg-[#EBE3D2] border border-[#C8BFA8]/60'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? 'text-[#F7F2E7]' : 'text-[#7A7463]'
                  }`}
                  strokeWidth={1.5}
                />
                <div className="flex flex-col">
                  <span className="leading-snug">{item.name}</span>
                  <span
                    className={`text-[11px] font-normal ${
                      active ? 'text-[#F7F2E7]/80' : 'text-[#7D7765]'
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[#C8BFA8]/60">
            <div className="flex items-center gap-2 rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-3.5 py-2 text-xs text-[#7D7765]">
              <span className="h-2 w-2 rounded-full bg-[#7A7463]" />
              <span className="font-sans text-[#3E3C32] font-medium">
                Personal workspace active
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
