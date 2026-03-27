'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHomestay } from '@/context/HomestayContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isBefore, parseISO, isWithinInterval, startOfDay, addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Mountain, ChevronDown } from 'lucide-react';
import { Room, BlockedBooking } from '@/types';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getRoomsOnDate(rooms: Room[], date: Date) {
  return rooms.filter(r => {
    if (!r.checkInDate || !r.guest) return false;
    const ci = startOfDay(parseISO(r.checkInDate));
    const co = r.checkOutDate ? startOfDay(parseISO(r.checkOutDate)) : ci;
    return isWithinInterval(startOfDay(date), { start: ci, end: co });
  });
}

function getBlockedBookingsOnDate(blockedBookings: BlockedBooking[], date: Date) {
  return blockedBookings.filter(b => {
    if (b.status !== 'blocked') return false;
    const ci = startOfDay(parseISO(b.checkInDate));
    const co = startOfDay(parseISO(b.checkOutDate));
    return isWithinInterval(startOfDay(date), { start: ci, end: co });
  });
}

export default function CalendarPage() {
  const { rooms, blockedBookings } = useHomestay();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMonthPicker) return;
    const handler = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMonthPicker]);

  const monthGrid = useMemo(() => {
    const months: Date[] = [];
    const base = new Date();
    for (let i = -18; i <= 3; i++) {
      months.push(addMonths(new Date(base.getFullYear(), base.getMonth(), 1), i));
    }
    return months;
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);
  const today = new Date();

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="page-enter px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mountain size={16} style={{ color: '#D4873A' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>
            Bookings
          </span>
        </div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
          Calendar
        </h1>
      </div>

      {/* Calendar Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 2px 16px rgba(28,58,42,0.07)' }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(28,58,42,0.06)' }}
          >
            <ChevronLeft size={16} style={{ color: '#1C3A2A' }} />
          </button>

          {/* Clickable month → opens picker */}
          <div className="relative" ref={monthPickerRef}>
            <button
              onClick={() => setShowMonthPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ background: showMonthPicker ? 'rgba(28,58,42,0.08)' : 'transparent' }}
            >
              <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <ChevronDown size={14} style={{ color: 'rgba(28,58,42,0.4)', marginTop: 2 }} />
            </button>

            {showMonthPicker && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-2xl p-3 shadow-xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.12)', width: 230 }}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {monthGrid.map(m => {
                    const isSelected = format(m, 'yyyy-MM') === format(currentDate, 'yyyy-MM');
                    const isCurrentMonth = format(m, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
                    return (
                      <button
                        key={m.toISOString()}
                        onClick={() => { setCurrentDate(m); setShowMonthPicker(false); }}
                        className="py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: isSelected ? '#1C3A2A' : isCurrentMonth ? 'rgba(212,135,58,0.1)' : 'rgba(28,58,42,0.05)',
                          color: isSelected ? '#FFFDF9' : isCurrentMonth ? '#A36520' : '#1C3A2A',
                          border: isCurrentMonth && !isSelected ? '1px solid rgba(212,135,58,0.3)' : '1px solid transparent',
                        }}
                      >
                        {format(m, 'MMM yy')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={nextMonth}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(28,58,42,0.06)' }}
          >
            <ChevronRight size={16} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center py-1">
              <span className="text-[11px] font-semibold" style={{ color: '#7A7A6E' }}>{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {daysInMonth.map(day => {
            const roomsOnDay = getRoomsOnDate(rooms, day);
            const blockedOnDay = getBlockedBookingsOnDate(blockedBookings, day);
            const isToday = isSameDay(day, today);
            const isPast = isBefore(startOfDay(day), startOfDay(today));

            const occupiedIds = new Set(roomsOnDay.map(r => r.id));
            const blockedIds = new Set(blockedOnDay.flatMap(b => b.roomIds));
            const totalRooms = new Set([...occupiedIds, ...blockedIds]);
            const dotCount = Math.min(totalRooms.size, 4);
            const hasAny = dotCount > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && router.push(`/calendar/${format(day, 'yyyy-MM-dd')}`)}
                disabled={isPast}
                className="flex flex-col items-center py-1.5 rounded-xl transition-all min-h-[52px]"
                style={{
                  background: isToday ? 'rgba(28,58,42,0.07)' : 'transparent',
                  border: isToday
                    ? '1px solid rgba(28,58,42,0.15)'
                    : '1px solid transparent',
                  opacity: isPast ? 0.3 : 1,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                }}
              >
                <span
                  className="text-[13px] font-medium leading-none mb-1.5"
                  style={{
                    color: isPast ? '#9CA3AF' : isToday ? '#D4873A' : '#1A1A1A',
                    fontWeight: isToday ? '700' : '500',
                  }}
                >
                  {format(day, 'd')}
                </span>

                {hasAny && (
                  <div className="flex justify-center gap-0.5">
                    {Array.from({ length: dotCount }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'transparent', border: '1.5px dashed rgba(28,58,42,0.45)' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
