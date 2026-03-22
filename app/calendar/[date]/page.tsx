'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parseISO, format, isValid } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import BlockRoomSheet from '@/components/BlockRoomSheet';

type SheetTab = 'view' | 'book' | 'block';

const TABS: { id: SheetTab; label: string }[] = [
  { id: 'view',  label: 'View'  },
  { id: 'book',  label: 'Book'  },
  { id: 'block', label: 'Block' },
];

export default function CalendarDatePage() {
  const params   = useParams();
  const router   = useRouter();
  const dateStr  = params.date as string;
  const selectedDate = parseISO(dateStr);
  const [activeTab, setActiveTab] = useState<SheetTab>('view');

  if (!isValid(selectedDate)) {
    return (
      <div className="p-8 text-center text-sm" style={{ color: '#7A7A6E' }}>
        Invalid date.
      </div>
    );
  }

  const handleTabChange = (tab: SheetTab) => setActiveTab(tab);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F3EE' }}>

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-10 flex-shrink-0"
        style={{ background: '#F7F3EE', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        {/* Back row */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 transition-all active:scale-90"
            style={{ background: 'rgba(28,58,42,0.08)' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} style={{ color: '#1C3A2A' }} />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>
              Calendar
            </p>
            <h1
              className="text-base font-bold leading-tight"
              style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}
            >
              {format(selectedDate, 'EEEE, d MMMM yyyy')}
            </h1>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-4 pb-3">
          <div
            className="flex p-1 rounded-xl gap-0.5"
            style={{ background: 'rgba(28,58,42,0.08)' }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: activeTab === tab.id ? '#1C3A2A' : 'transparent',
                  color:      activeTab === tab.id ? '#FFFDF9'  : '#7A7A6E',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <BlockRoomSheet
          selectedDate={selectedDate}
          onClose={() => router.back()}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
