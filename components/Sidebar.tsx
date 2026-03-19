'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BedDouble, Receipt, CalendarDays, Mountain } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rooms',    label: 'Bookings',  icon: BedDouble },
  { href: '/billing',  label: 'Billing',   icon: Receipt },
  { href: '/calendar', label: 'Calendar',  icon: CalendarDays },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-40"
      style={{
        background: 'linear-gradient(180deg, #1A3526 0%, #1C3A2A 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,135,58,0.2)' }}
          >
            <Mountain size={16} style={{ color: '#D4873A' }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Tirthan Valley
          </span>
        </div>
        <h1
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#FFFDF9' }}
        >
          The Pahadi Ghar
        </h1>
        <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Homestay Management
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Navigation
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group"
              style={{
                background: isActive ? 'rgba(212,135,58,0.18)' : 'transparent',
                color: isActive ? '#E8C07A' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isActive ? '#D4873A' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}
              />
              <span
                className="text-sm font-medium flex-1"
                style={{ color: isActive ? '#FFFDF9' : 'rgba(255,255,255,0.55)' }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#D4873A' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ background: 'rgba(212,135,58,0.3)' }}
          />
          <div>
            <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Admin</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Pahadi Ghar v1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
