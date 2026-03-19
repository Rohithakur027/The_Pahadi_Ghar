'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BedDouble, Receipt, CalendarDays } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rooms', label: 'Booking', icon: BedDouble },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-t border-warmamber/20 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 min-w-[60px]"
              style={{
                color: isActive ? '#D4873A' : '#7A7A6E',
                background: isActive ? 'rgba(212,135,58,0.1)' : 'transparent',
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className="text-[11px] font-medium leading-none" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
