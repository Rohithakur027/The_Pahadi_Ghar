'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BedDouble, Receipt, CalendarDays, BarChart2,
  Mountain, X, Menu,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rooms',    label: 'Rooms',     icon: BedDouble },
  { href: '/billing',  label: 'Billing',   icon: Receipt },
  { href: '/calendar', label: 'Calendar',  icon: CalendarDays },
  { href: '/reports',  label: 'Reports',   icon: BarChart2 },
];

function SidebarContent({
  onClose,
  compact = false,
}: {
  onClose?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1A3526 0%, #1C3A2A 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div
        className="flex-shrink-0 relative"
        style={{
          padding: compact ? '18px 0' : '22px 16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
        {compact ? (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,135,58,0.2)' }}
            >
              <Mountain size={16} style={{ color: '#D4873A' }} />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(212,135,58,0.2)' }}
              >
                <Mountain size={13} style={{ color: '#D4873A' }} />
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Tirthan Valley
              </span>
            </div>
            <h1
              className="text-[17px] font-bold leading-snug"
              style={{ fontFamily: 'var(--font-playfair)', color: '#FFFDF9' }}
            >
              The Pahadi Ghar
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Homestay Management
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{ padding: compact ? '14px 8px' : '14px 10px' }}
      >
        {!compact && (
          <p
            className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            Navigation
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl transition-all duration-150 group relative"
                style={{
                  padding: compact ? '10px 0' : '10px 12px',
                  justifyContent: compact ? 'center' : undefined,
                  background: isActive ? 'rgba(212,135,58,0.18)' : 'transparent',
                  borderLeft: !compact
                    ? isActive ? '3px solid #D4873A' : '3px solid transparent'
                    : undefined,
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    color: isActive ? '#D4873A' : 'rgba(255,255,255,0.5)',
                    flexShrink: 0,
                  }}
                />
                {!compact && (
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: isActive ? '#FFFDF9' : 'rgba(255,255,255,0.6)' }}
                  >
                    {label}
                  </span>
                )}
                {/* Tooltip — tablet only */}
                {compact && (
                  <div
                    className="absolute left-full ml-2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      background: '#1C3A2A',
                      color: '#FFFDF9',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex-shrink-0"
        style={{
          padding: compact ? '12px 0' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {compact ? (
          <div className="flex justify-center">
            <div
              className="w-5 h-5 rounded-full"
              style={{ background: 'rgba(212,135,58,0.2)' }}
            />
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Tirthan Valley Homestay
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              v1.0
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Tablet sidebar (md → lg) ── */}
      <aside
        className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 z-40 flex-col"
        style={{ width: 64, boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
      >
        <SidebarContent compact />
      </aside>

      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col"
        style={{ width: 220, boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
        style={{
          background: 'rgba(247,243,238,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(28,58,42,0.1)',
          boxShadow: '0 1px 8px rgba(28,58,42,0.08)',
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: '#1C3A2A' }}
          aria-label="Open menu"
        >
          <Menu size={18} style={{ color: '#FFFDF9' }} />
        </button>
        <span
          className="text-[15px] font-bold"
          style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}
        >
          The Pahadi Ghar
        </span>
      </div>

      {/* ── Mobile overlay sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="md:hidden fixed left-0 top-0 bottom-0 z-[70] flex flex-col"
              style={{
                width: 'min(75vw, 300px)',
                boxShadow: '8px 0 40px rgba(0,0,0,0.3)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="md:ml-16 lg:ml-[220px] min-h-screen pt-14 md:pt-0">
        {children}
      </div>
    </>
  );
}
