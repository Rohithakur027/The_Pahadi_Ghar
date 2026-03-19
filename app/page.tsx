'use client';

import { useState, useMemo } from 'react';
import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import {
  format, parseISO, addDays, isWithinInterval, startOfDay,
  subMonths, startOfMonth, endOfMonth, eachMonthOfInterval,
  startOfWeek, endOfWeek,
} from 'date-fns';
import {
  TrendingUp, TrendingDown, Users, LogIn, LogOut, IndianRupee,
  Mountain, Activity, Lock, CalendarCheck, BedDouble, ArrowRight,
  Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BlockedBooking, Payment } from '@/types';

type TimeRange = 'week' | 'month' | '3months' | '6months' | 'year';

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; short: string }[] = [
  { id: 'week',    label: 'This Week',  short: '7D' },
  { id: 'month',   label: 'This Month', short: '1M' },
  { id: '3months', label: '3 Months',   short: '3M' },
  { id: '6months', label: '6 Months',   short: '6M' },
  { id: 'year',    label: 'This Year',  short: '1Y' },
];

const ROOM_LABELS: Record<string, string> = {
  'room-gushaini':    '🏡 Room (Gushaini)',
  'room-banjar':      '🌄 Room (Banjar)',
  'rooftop-gushaini': '🏔️ Rooftop (Gushaini)',
  'rooftop-banjar':   '⛺ Rooftop (Banjar)',
};

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    Icon: CheckCircle,  color: '#3E6B47', bg: 'rgba(62,107,71,0.12)' },
  partial: { label: 'Partial', Icon: Clock,        color: '#A36520', bg: 'rgba(212,135,58,0.12)' },
  unpaid:  { label: 'Unpaid',  Icon: AlertCircle,  color: '#C0533A', bg: 'rgba(192,83,58,0.1)' },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  checkin:  <LogIn size={13} style={{ color: '#3E6B47' }} />,
  checkout: <LogOut size={13} style={{ color: '#C0533A' }} />,
  payment:  <IndianRupee size={13} style={{ color: '#D4873A' }} />,
  item:     <Activity size={13} style={{ color: '#7A7A6E' }} />,
  guest:    <Users size={13} style={{ color: '#7A7A6E' }} />,
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

function getRevenue(payments: Payment[], start: Date, end: Date) {
  return payments
    .filter(p => { const d = new Date(p.date); return d >= start && d <= end; })
    .reduce((s, p) => s + p.amount, 0);
}

interface ChartBar { label: string; value: number }

function RevenueBarChart({ bars }: { bars: ChartBar[] }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: '100px' }}>
      {bars.map((bar, i) => {
        const pct = (bar.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: 0 }}>
            {bar.value > 0 && (
              <p className="text-[9px] font-semibold leading-none hidden md:block whitespace-nowrap" style={{ color: '#A36520' }}>
                {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value}
              </p>
            )}
            <div className="w-full flex items-end" style={{ flex: 1 }}>
              <div
                className="w-full rounded-t-md transition-all duration-700"
                style={{
                  height: pct > 0 ? `${Math.max(pct, 5)}%` : '3px',
                  background: pct > 0
                    ? 'linear-gradient(180deg, #D4873A 0%, #E8A55A 100%)'
                    : 'rgba(28,58,42,0.08)',
                  minHeight: '3px',
                }}
              />
            </div>
            <p className="text-[9px] font-medium text-center leading-tight" style={{ color: '#7A7A6E' }}>
              {bar.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { rooms, activityLog, payments, blockedBookings, checkInFromBlock, groupBookings } = useHomestay();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const { rangeStart, rangeRevenue, chartBars, prevRangeRevenue, rangeLabel } = useMemo(() => {
    let start: Date;
    const end = now;
    let bars: ChartBar[] = [];
    let prevStart: Date;
    let prevEnd: Date;
    let label: string;

    if (timeRange === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      const wEnd = endOfWeek(now, { weekStartsOn: 1 });
      prevStart = addDays(start, -7);
      prevEnd = addDays(wEnd, -7);
      label = `${format(start, 'd MMM')} – ${format(wEnd, 'd MMM')}`;
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const ds = startOfDay(d);
        const de = new Date(ds.getTime() + 86399999);
        bars.push({ label: format(d, 'EEE'), value: getRevenue(payments, ds, de) });
      }
    } else if (timeRange === 'month') {
      start = startOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
      label = format(now, 'MMMM yyyy');
      const weeks = Math.ceil(endOfMonth(now).getDate() / 7);
      for (let w = 0; w < weeks; w++) {
        const wStart = addDays(start, w * 7);
        const wEnd = new Date(Math.min(addDays(start, (w + 1) * 7 - 1).getTime(), endOfMonth(now).getTime()));
        bars.push({ label: `W${w + 1}`, value: getRevenue(payments, wStart, wEnd) });
      }
    } else if (timeRange === '3months') {
      start = startOfMonth(subMonths(now, 2));
      prevStart = startOfMonth(subMonths(now, 5));
      prevEnd = endOfMonth(subMonths(now, 3));
      label = `${format(start, 'MMM')} – ${format(now, 'MMM yyyy')}`;
      bars = eachMonthOfInterval({ start, end }).map(m => ({
        label: format(m, 'MMM'),
        value: getRevenue(payments, startOfMonth(m), endOfMonth(m)),
      }));
    } else if (timeRange === '6months') {
      start = startOfMonth(subMonths(now, 5));
      prevStart = startOfMonth(subMonths(now, 11));
      prevEnd = endOfMonth(subMonths(now, 6));
      label = `${format(start, 'MMM')} – ${format(now, 'MMM yyyy')}`;
      bars = eachMonthOfInterval({ start, end }).map(m => ({
        label: format(m, 'MMM'),
        value: getRevenue(payments, startOfMonth(m), endOfMonth(m)),
      }));
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      const yEnd = new Date(now.getFullYear(), 11, 31);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      label = format(now, 'yyyy');
      bars = eachMonthOfInterval({ start, end: now }).map(m => ({
        label: format(m, 'MMM'),
        value: getRevenue(payments, startOfMonth(m), endOfMonth(m)),
      }));
      void yEnd;
    }

    if (!prevStart!) prevStart = subMonths(start, 1);
    if (!prevEnd!) prevEnd = new Date(start.getTime() - 1);

    return {
      rangeStart: start,
      rangeRevenue: getRevenue(payments, start, end),
      chartBars: bars,
      prevRangeRevenue: getRevenue(payments, prevStart, prevEnd),
      rangeLabel: label,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, payments]);

  const revenueChange = prevRangeRevenue > 0
    ? ((rangeRevenue - prevRangeRevenue) / prevRangeRevenue) * 100
    : null;

  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const checkInsToday = rooms.filter(r => r.checkInDate === todayStr).length;
  const checkOutsToday = rooms.filter(r => r.checkOutDate === todayStr).length;
  const activeBlockedCount = blockedBookings.filter(b => b.status === 'blocked').length;
  const occupancyRate = Math.round((occupiedRooms.length / rooms.length) * 100);
  const totalDue = occupiedRooms.reduce((s, r) => s + Math.max(0, calculateTotal(r) - r.amountPaid), 0);

  const upcomingBlocked: BlockedBooking[] = blockedBookings
    .filter(b => {
      if (b.status !== 'blocked') return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      return isWithinInterval(ci, { start: startOfDay(now), end: startOfDay(addDays(now, 7)) });
    })
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))
    .slice(0, 5);

  const todayBlocked = blockedBookings.filter(b => b.status === 'blocked' && b.checkInDate === todayStr && b.blockType !== 'maintenance');
  const activeGroups = groupBookings.filter(g => g.status === 'active');

  void rangeStart;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: '#F7F3EE' }}>

      {/* ── TOP HEADER ── */}
      <div
        className="sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between gap-3"
        style={{
          background: 'rgba(247,243,238,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(28,58,42,0.08)',
        }}
      >
        {/* Mobile brand */}
        <div className="md:hidden">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Mountain size={14} style={{ color: '#D4873A' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>
              Tirthan Valley
            </span>
          </div>
          <h1 className="text-base font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            The Pahadi Ghar
          </h1>
        </div>

        {/* Desktop page title */}
        <div className="hidden md:block">
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
            {format(now, 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        {/* Time range pills — desktop only */}
        <div
          className="hidden md:flex items-center gap-0.5 p-1 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(28,58,42,0.07)' }}
        >
          {TIME_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeRange(opt.id)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: timeRange === opt.id ? '#1C3A2A' : 'transparent',
                color: timeRange === opt.id ? '#FFFDF9' : '#7A7A6E',
              }}
            >
              <span className="md:hidden">{opt.short}</span>
              <span className="hidden md:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile date */}
        <div className="text-right md:hidden flex-shrink-0">
          <p className="text-[11px] font-medium" style={{ color: '#7A7A6E' }}>{format(now, 'EEE, d MMM')}</p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-4 md:px-8 py-5">
        <div className="md:grid md:grid-cols-3 md:gap-6 space-y-5 md:space-y-0">

          {/* ═══ LEFT / MAIN COLUMN (2/3 on desktop) ═══ */}
          <div className="md:col-span-2 space-y-5">

            {/* Revenue + chart card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 2px 16px rgba(28,58,42,0.06)' }}
            >
              {/* Dark header */}
              <div
                className="px-5 pt-5 pb-4 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1C3A2A 0%, #2A5A40 60%, #3E6B47 100%)' }}
              >
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-10" style={{ background: '#D4873A' }} />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-8" style={{ background: '#E8A55A' }} />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest opacity-55 text-white mb-1">
                        Revenue · {rangeLabel}
                      </p>
                      <p className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                        ₹{formatINR(rangeRevenue)}
                      </p>
                    </div>
                    {revenueChange !== null && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                        style={{ background: revenueChange >= 0 ? 'rgba(212,135,58,0.3)' : 'rgba(192,83,58,0.3)' }}
                      >
                        {revenueChange >= 0
                          ? <TrendingUp size={13} style={{ color: '#E8C07A' }} />
                          : <TrendingDown size={13} style={{ color: '#F87171' }} />
                        }
                        <span className="text-xs font-bold" style={{ color: revenueChange >= 0 ? '#E8C07A' : '#F87171' }}>
                          {Math.abs(revenueChange).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {prevRangeRevenue > 0 && (
                    <p className="text-xs opacity-45 text-white mt-1">
                      Prev period: ₹{formatINR(prevRangeRevenue)}
                    </p>
                  )}

                  <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {[
                      { l: 'Collected',  v: `₹${formatINR(rangeRevenue)}` },
                      { l: 'Occupancy', v: `${occupancyRate}%` },
                      { l: 'Total Due', v: `₹${formatINR(totalDue)}` },
                    ].map(s => (
                      <div key={s.l}>
                        <p className="text-[10px] text-white/45">{s.l}</p>
                        <p className="text-sm font-bold text-white/85 mt-0.5">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart area */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>
                    Revenue Breakdown
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }} />
                    <span className="text-[11px]" style={{ color: '#7A7A6E' }}>Revenue (₹)</span>
                  </div>
                </div>
                <RevenueBarChart bars={chartBars} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {[
                { label: 'Occupied',   value: `${occupiedRooms.length}/4`,  icon: <BedDouble size={14} />,     color: '#1C3A2A', bg: 'rgba(28,58,42,0.08)' },
                { label: 'Check-ins',  value: checkInsToday,                icon: <LogIn size={14} />,          color: '#3E6B47', bg: 'rgba(62,107,71,0.1)' },
                { label: 'Check-outs', value: checkOutsToday,               icon: <LogOut size={14} />,         color: '#C0533A', bg: 'rgba(192,83,58,0.09)' },
                { label: 'Bookings',   value: activeBlockedCount,           icon: <CalendarCheck size={14} />,  color: '#A36520', bg: 'rgba(212,135,58,0.1)' },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl p-3 md:p-4 text-center" style={{ background: stat.bg }}>
                  <div className="flex justify-center mb-1.5" style={{ color: stat.color }}>{stat.icon}</div>
                  <p className="text-xl md:text-2xl font-bold leading-none" style={{ color: stat.color, fontFamily: 'var(--font-playfair)' }}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] md:text-[11px] font-medium mt-1" style={{ color: '#7A7A6E' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Active Guests */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 8px rgba(28,58,42,0.05)' }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: '#1C3A2A' }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                    Active Guests
                  </h2>
                  {(occupiedRooms.length > 0 || activeGroups.length > 0) && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}>
                      {occupiedRooms.filter(r => !r.groupBookingId).length + activeGroups.length}
                    </span>
                  )}
                </div>
                <button onClick={() => router.push('/rooms')} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#D4873A' }}>
                  View all <ArrowRight size={11} />
                </button>
              </div>

              {occupiedRooms.length === 0 && activeGroups.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-2xl mb-2">🏔️</p>
                  <p className="text-sm" style={{ color: '#7A7A6E' }}>No guests checked in</p>
                </div>
              ) : (
                <div>
                  {activeGroups.map(gb => {
                    const gTotal = Object.entries(gb.roomRates).reduce((s, [, r]) => s + r * gb.nights, 0)
                      + gb.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
                    const bal = Math.max(0, gTotal - gb.amountPaid);
                    return (
                      <button
                        key={gb.id}
                        onClick={() => router.push(`/bookings/${gb.id}`)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all hover:bg-blue-50/40 active:scale-[0.99]"
                        style={{ borderBottom: '1px solid rgba(28,58,42,0.05)' }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.1)' }}>
                          <Users size={16} style={{ color: '#2563EB' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{gb.guestName}</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                              {gb.roomIds.length} rooms
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                            Out {format(parseISO(gb.checkOutDate), 'd MMM')} · {gb.nights} nights
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: bal > 0 ? '#C0533A' : '#3E6B47' }}>₹{formatINR(bal)}</p>
                          <p className="text-[10px]" style={{ color: '#7A7A6E' }}>due</p>
                        </div>
                      </button>
                    );
                  })}

                  {occupiedRooms.filter(r => !r.groupBookingId).map(room => {
                    const total = calculateTotal(room);
                    const balance = Math.max(0, total - room.amountPaid);
                    const sc = STATUS_CONFIG[room.paymentStatus];
                    return (
                      <button
                        key={room.id}
                        onClick={() => router.push(`/rooms/${room.id}`)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all hover:bg-amber-50/30 active:scale-[0.99]"
                        style={{ borderBottom: '1px solid rgba(28,58,42,0.05)' }}
                      >
                        <span className="text-2xl flex-shrink-0">{room.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                              {room.guest?.fullName || 'Guest'}
                            </p>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: '#7A7A6E' }}>
                            {room.name} · Out {room.checkOutDate ? format(new Date(room.checkOutDate), 'd MMM') : '—'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>₹{formatINR(balance)}</p>
                          <p className="text-[10px]" style={{ color: '#7A7A6E' }}>due</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Check-ins (mobile only — desktop shows in right col) */}
            {todayBlocked.length > 0 && (
              <div className="md:hidden space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={14} style={{ color: '#3E6B47' }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                    Today&apos;s Check-ins
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}>
                    {todayBlocked.length}
                  </span>
                </div>
                {todayBlocked.map(booking => (
                  <div key={booking.id} className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1.5px solid rgba(62,107,71,0.3)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                          {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const result = checkInFromBlock(booking.id);
                        if (!result) return;
                        toast.success(`✓ ${result.guestName} checked in`);
                        if (result.groupBookingId) router.push(`/bookings/${result.groupBookingId}`);
                        else router.push(`/rooms/${result.firstRoomId}`);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                    >
                      <LogIn size={14} /> Check In Now
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Activity */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <Activity size={14} style={{ color: '#1C3A2A' }} />
                <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                  Recent Activity
                </h2>
              </div>
              {activityLog.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm" style={{ color: '#7A7A6E' }}>No activity yet</p>
                </div>
              ) : (
                <div>
                  {activityLog.slice(0, 8).map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderBottom: i < 7 ? '1px solid rgba(28,58,42,0.04)' : 'none' }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(28,58,42,0.06)' }}>
                        {ACTIVITY_ICONS[entry.type]}
                      </div>
                      <p className="text-sm flex-1 truncate" style={{ color: '#1A1A1A' }}>{entry.message}</p>
                      <p className="text-[11px] flex-shrink-0" style={{ color: '#AAAAAA' }}>
                        {format(new Date(entry.timestamp), 'd MMM, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile upcoming */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                  Upcoming Bookings
                </h2>
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}>
                  Next 7 days
                </span>
              </div>
              {upcomingBlocked.length === 0 ? (
                <div className="rounded-2xl p-5 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                  <p className="text-2xl mb-2">🗓️</p>
                  <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No advance bookings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBlocked.map(booking => (
                    <button
                      key={booking.id}
                      onClick={() => router.push('/calendar')}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:scale-[0.99]"
                      style={{ background: '#FFFDF9', border: '1.5px dashed rgba(212,135,58,0.4)' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,135,58,0.12)' }}>
                        <Lock size={14} style={{ color: '#D4873A' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#7A7A6E' }}>
                          {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                        </p>
                      </div>
                      <p className="text-xs font-bold flex-shrink-0" style={{ color: '#A36520' }}>
                        {format(parseISO(booking.checkInDate), 'd MMM')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN — desktop only ═══ */}
          <div className="hidden md:flex flex-col gap-5">

            {/* Room Status Grid */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 8px rgba(28,58,42,0.05)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <div className="flex items-center gap-2">
                  <BedDouble size={14} style={{ color: '#1C3A2A' }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Room Status</h2>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                {rooms.map(room => {
                  const isOcc = room.status === 'occupied';
                  const bal = Math.max(0, calculateTotal(room) - room.amountPaid);
                  return (
                    <button
                      key={room.id}
                      onClick={() => router.push(`/rooms/${room.id}`)}
                      className="rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: isOcc
                          ? 'linear-gradient(135deg, rgba(212,135,58,0.1), rgba(212,135,58,0.04))'
                          : 'rgba(62,107,71,0.06)',
                        border: `1px solid ${isOcc ? 'rgba(212,135,58,0.25)' : 'rgba(62,107,71,0.18)'}`,
                      }}
                    >
                      <p className="text-xl mb-1">{room.emoji}</p>
                      <p className="text-[11px] font-semibold leading-tight" style={{ color: '#1A1A1A' }}>{room.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: isOcc ? '#A36520' : '#3E6B47' }}>
                        {isOcc ? (room.guest?.fullName || 'Occupied') : 'Available'}
                      </p>
                      {isOcc && bal > 0 && (
                        <p className="text-[10px] font-bold mt-0.5" style={{ color: '#C0533A' }}>₹{formatINR(bal)} due</p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px]" style={{ color: '#7A7A6E' }}>Occupancy Rate</p>
                  <p className="text-[11px] font-bold" style={{ color: '#1C3A2A' }}>{occupancyRate}%</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(28,58,42,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${occupancyRate}%`,
                      background: occupancyRate >= 75 ? '#D4873A' : occupancyRate >= 50 ? '#3E6B47' : '#7A7A6E',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Today's Check-ins (desktop) */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 8px rgba(28,58,42,0.05)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <div className="flex items-center gap-2">
                  <LogIn size={14} style={{ color: '#3E6B47' }} />
                  <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Today&apos;s Check-ins</h2>
                  {todayBlocked.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}>
                      {todayBlocked.length}
                    </span>
                  )}
                </div>
              </div>
              {todayBlocked.length === 0 ? (
                <div className="px-5 py-5 text-center">
                  <p className="text-xl mb-1">✓</p>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>No check-ins today</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {todayBlocked.map(booking => (
                    <div key={booking.id} className="rounded-xl p-3" style={{ background: 'rgba(62,107,71,0.06)', border: '1px solid rgba(62,107,71,0.18)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#7A7A6E' }}>
                            {booking.roomIds.length} room{booking.roomIds.length > 1 ? 's' : ''} · {booking.nights}N
                          </p>
                        </div>
                        {booking.balanceDue > 0 && (
                          <p className="text-[11px] font-bold flex-shrink-0 ml-2" style={{ color: '#C0533A' }}>
                            ₹{formatINR(booking.balanceDue)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const result = checkInFromBlock(booking.id);
                          if (!result) return;
                          toast.success(`✓ ${result.guestName} checked in`);
                          if (result.groupBookingId) router.push(`/bookings/${result.groupBookingId}`);
                          else router.push(`/rooms/${result.firstRoomId}`);
                        }}
                        className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                      >
                        Check In Now →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Bookings (desktop) */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 8px rgba(28,58,42,0.05)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={13} style={{ color: '#A36520' }} />
                    <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Upcoming</h2>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}>
                    Next 7 days
                  </span>
                </div>
              </div>
              {upcomingBlocked.length === 0 ? (
                <div className="px-5 py-5 text-center">
                  <p className="text-xl mb-1">🗓️</p>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>No upcoming bookings</p>
                </div>
              ) : (
                <div>
                  {upcomingBlocked.map((booking, i) => (
                    <button
                      key={booking.id}
                      onClick={() => router.push('/calendar')}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-amber-50/30 transition-colors"
                      style={{ borderBottom: i < upcomingBlocked.length - 1 ? '1px solid rgba(28,58,42,0.05)' : 'none' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#7A7A6E' }}>
                          {booking.roomIds.length} room{booking.roomIds.length > 1 ? 's' : ''} · {booking.nights}N
                        </p>
                      </div>
                      <p className="text-xs font-bold flex-shrink-0" style={{ color: '#A36520' }}>
                        {format(parseISO(booking.checkInDate), 'd MMM')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Check In', icon: <LogIn size={14} />, href: '/rooms',    color: '#1C3A2A', bg: 'rgba(28,58,42,0.08)' },
                { label: 'Calendar', icon: <CalendarCheck size={14} />, href: '/calendar', color: '#A36520', bg: 'rgba(212,135,58,0.1)' },
                { label: 'Billing',  icon: <IndianRupee size={14} />, href: '/billing',  color: '#3E6B47', bg: 'rgba(62,107,71,0.1)' },
                { label: 'Bookings', icon: <BedDouble size={14} />, href: '/rooms',    color: '#7A7A6E', bg: 'rgba(28,58,42,0.06)' },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => router.push(q.href)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: q.bg, color: q.color }}
                >
                  {q.icon}
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-4 md:h-8" />
      </div>
    </div>
  );
}
