'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, BedDouble, Receipt, CalendarDays,
  Mountain, BarChart2, Wallet, ShoppingCart, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/rooms',          label: 'Bookings',       icon: BedDouble },
  { href: '/billing',        label: 'Billing',        icon: Receipt },
  { href: '/calendar',       label: 'Calendar',       icon: CalendarDays },
  { href: '/expenses',       label: 'Expenses',       icon: Wallet },
  { href: '/shopping-list',  label: 'Shopping List',  icon: ShoppingCart },
  { href: '/reports',        label: 'Reports',        icon: BarChart2 },
];

function useShoppingBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const lists = JSON.parse(localStorage.getItem('pahadi_shopping_lists') || '[]');
        const items = JSON.parse(localStorage.getItem('pahadi_shopping_items') || '[]');
        const active = lists.find((l: { status: string }) => l.status !== 'sent');
        if (!active) { setCount(0); return; }
        const n = items.filter((i: { listId: string; status: string }) =>
          i.listId === active.id && i.status !== 'removed'
        ).length;
        setCount(n);
      } catch { setCount(0); }
    };
    update();
    window.addEventListener('focus', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return count;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const shoppingBadge = useShoppingBadge();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,135,58,0.2)' }}
            >
              <Mountain size={16} style={{ color: '#D4873A' }} />
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Tirthan Valley
            </span>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-xl mb-2"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <X size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </button>
          )}
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
        <p
          className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Navigation
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const badge = href === '/shopping-list' && shoppingBadge > 0 ? shoppingBadge : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150"
              style={{
                background: isActive ? 'rgba(212,135,58,0.18)' : 'transparent',
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
              {badge > 0 && !isActive && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#D4873A', color: '#fff', minWidth: 18, textAlign: 'center' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#D4873A' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'rgba(212,135,58,0.3)' }} />
          <div>
            <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Admin</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Pahadi Ghar v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', open);
    return () => window.removeEventListener('open-mobile-sidebar', open);
  }, []);

  return (
    <>
      {/* ── Desktop sidebar (always visible md+) ────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-40"
        style={{
          background: 'linear-gradient(180deg, #1A3526 0%, #1C3A2A 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar drawer (slide in from left) ──────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 z-[70]"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="md:hidden fixed left-0 top-0 bottom-0 z-[80] flex flex-col"
              style={{
                width: 'min(80vw, 280px)',
                background: 'linear-gradient(180deg, #1A3526 0%, #1C3A2A 100%)',
                boxShadow: '8px 0 32px rgba(0,0,0,0.3)',
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
    </>
  );
}
