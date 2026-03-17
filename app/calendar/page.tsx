'use client';

import { useState, useMemo } from 'react';
import { useHomestay } from '@/context/HomestayContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, parseISO, isWithinInterval, startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Mountain } from 'lucide-react';
import { Room, BlockedBooking } from '@/types';
import BlockRoomSheet, { ROOM_COLORS } from '@/components/BlockRoomSheet';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);
  const today = new Date();

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Total counts for status legend
  const activeBlockedCount = useMemo(
    () => new Set(blockedBookings.filter(b => b.status === 'blocked').flatMap(b => b.roomIds)).size,
    [blockedBookings]
  );

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
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h2>
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
            const isSelected = !!selectedDate && isSameDay(day, selectedDate);

            // Build dot list: occupied rooms + blocked room IDs
            const occupiedDots = roomsOnDay.map(r => ({ roomId: r.id, type: 'occupied' as const }));
            const blockedDots = blockedOnDay
              .flatMap(b => b.roomIds.map(id => ({ roomId: id, type: 'blocked' as const })))
              // Remove if already in occupied (shouldn't happen, but safety)
              .filter(d => !occupiedDots.some(o => o.roomId === d.roomId));
            const allDots = [...occupiedDots, ...blockedDots].slice(0, 4);
            const hasAny = allDots.length > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className="flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-90 min-h-[52px]"
                style={{
                  background: isSelected
                    ? 'rgba(212,135,58,0.15)'
                    : isToday
                    ? 'rgba(28,58,42,0.07)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(212,135,58,0.4)'
                    : isToday
                    ? '1px solid rgba(28,58,42,0.15)'
                    : '1px solid transparent',
                }}
              >
                <span
                  className="text-[13px] font-medium leading-none mb-1.5"
                  style={{
                    color: isToday ? '#D4873A' : '#1A1A1A',
                    fontWeight: isToday ? '700' : '500',
                  }}
                >
                  {format(day, 'd')}
                </span>

                {/* Dots: occupied = filled, blocked = dashed outline */}
                {hasAny && (
                  <div className="flex flex-wrap justify-center gap-0.5 max-w-[36px]">
                    {allDots.map((dot, idx) => {
                      const color = ROOM_COLORS[dot.roomId]?.dot || '#1C3A2A';
                      return (
                        <div
                          key={`${dot.roomId}-${idx}`}
                          className="w-2.5 h-2.5 rounded-full"
                          style={
                            dot.type === 'occupied'
                              ? { background: color }
                              : {
                                  background: 'transparent',
                                  border: `1.5px dashed ${color}`,
                                  opacity: 0.85,
                                }
                          }
                          title={ROOM_COLORS[dot.roomId]?.label}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status legend */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A7A6E' }}>
          Legend
        </p>

        {/* Room colors */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(ROOM_COLORS).map(([roomId, config]) => {
            const room = rooms.find(r => r.id === roomId);
            return (
              <div key={roomId} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: config.dot }} />
                <span className="text-xs" style={{ color: '#7A7A6E' }}>
                  {config.emoji} {config.label}
                  {room?.status === 'occupied' && (
                    <span className="ml-1" style={{ color: config.dot }}>●</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status types */}
        <div
          className="flex items-center flex-wrap gap-x-4 gap-y-2 pt-3"
          style={{ borderTop: '1px solid rgba(28,58,42,0.06)' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#3E6B47' }} />
            <span className="text-xs" style={{ color: '#7A7A6E' }}>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: 'transparent', border: '1.5px dashed #D4873A' }}
            />
            <span className="text-xs" style={{ color: '#7A7A6E' }}>
              Blocked {activeBlockedCount > 0 ? `(${activeBlockedCount})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: 'transparent', border: '1.5px solid rgba(28,58,42,0.2)' }}
            />
            <span className="text-xs" style={{ color: '#7A7A6E' }}>Available</span>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      {selectedDate && (
        <BlockRoomSheet
          selectedDate={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
