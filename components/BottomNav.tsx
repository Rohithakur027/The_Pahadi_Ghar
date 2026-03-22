'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BedDouble, CalendarDays, Receipt } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rooms',    label: 'Booking',   icon: BedDouble },
  { href: '/calendar', label: 'Calendar',  icon: CalendarDays },
  { href: '/billing',  label: 'Billing',   icon: Receipt },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        background: 'rgba(247,243,238,0.96)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(28,58,42,0.1)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-150"
              style={{
                background: isActive ? 'rgba(212,135,58,0.1)' : 'transparent',
                color: isActive ? '#D4873A' : '#7A7A6E',
              }}
            >
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              <span
                className="text-[10px] font-medium leading-none mt-0.5"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
