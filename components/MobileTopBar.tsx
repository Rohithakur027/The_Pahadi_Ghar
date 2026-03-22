'use client';

import { Menu, Mountain } from 'lucide-react';

export default function MobileTopBar() {
  const openSidebar = () =>
    window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4"
      style={{
        height: 52,
        background: 'rgba(247,243,238,0.96)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(28,58,42,0.08)',
      }}
    >
      <button
        onClick={openSidebar}
        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: 'rgba(28,58,42,0.08)' }}
        aria-label="Open menu"
      >
        <Menu size={18} style={{ color: '#1C3A2A' }} strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(212,135,58,0.15)' }}
        >
          <Mountain size={12} style={{ color: '#D4873A' }} />
        </div>
        <span
          className="text-sm font-bold"
          style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}
        >
          The Pahadi Ghar
        </span>
      </div>
    </header>
  );
}
