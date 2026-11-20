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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-2 shadow-lg shadow-emerald-500/10">
              <ChefHat className="h-5 w-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">
                  Kora
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  v1
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 -mt-0.5">
                Kitchen Cost & Nutrition
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/70 text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side items */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Personal Single-User</span>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open navigation menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800/80 bg-slate-950 px-4 pt-2 pb-4 space-y-1 sm:px-6">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                  active
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-xs font-normal text-slate-400">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
          <div className="pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Personal workspace active</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
