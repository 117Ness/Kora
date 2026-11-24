import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { getUserProfile } from '@/app/actions/profile';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Kora – Kitchen Cost & Nutrition Planner',
  description:
    'Sleek meal planning, recipe cost breakdowns, and nutritional intelligence in a warm editorial cookbook aesthetic.',
};

async function NavbarLoader() {
  const res = await getUserProfile();
  const initialProfile = res.success ? res.data : null;
  return <Navbar initialProfile={initialProfile} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F3EDE0] text-[#3E3C32] font-sans selection:bg-[#7A7463]/25 selection:text-[#3E3C32]">
        <Suspense fallback={<Navbar />}>
          <NavbarLoader />
        </Suspense>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="w-full border-t border-[#C8BFA8] bg-[#F3EDE0]/80 py-6 text-center text-xs text-[#7D7765]">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-serif font-semibold text-sm text-[#3E3C32] tracking-tight">
              Kora &copy; 2026 – Kitchen Intelligence
            </span>
            <div className="flex items-center gap-3 text-xs text-[#7D7765]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-2.5 py-0.5 text-[11px] font-medium text-[#7D7765]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7A7463]" />
                AI Chef &amp; Flat Living v1
              </span>
              <span>&bull;</span>
              <span className="text-[#5B5646] font-medium">Multi-User Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
