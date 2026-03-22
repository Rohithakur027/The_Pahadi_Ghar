'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, Users, BedDouble,
  Download, Plus, X, ChevronDown, RefreshCw, BarChart2,
  Phone, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays, getDaysInMonth } from 'date-fns';
import { useHomestay, calculateTotal, calculateGroupTotal } from '@/context/HomestayContext';
import { Payment, BlockedBooking, GroupBooking, Room } from '@/types';

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const TABS = ['Revenue', 'Occupancy', 'Guests', 'Rooms', 'Financial', 'Export'];

const ROOM_COLORS: Record<string, string> = {
  'room-gushaini':    '#3E6B47',
  'room-banjar':      '#2E7D9B',
  'rooftop-gushaini': '#D4873A',
  'rooftop-banjar':   '#1C3A2A',
};

const ROOM_SHORT: Record<string, string> = {
  'room-gushaini':    'Pine',
  'room-banjar':      'River',
  'rooftop-gushaini': 'Valley',
  'rooftop-banjar':   'Forest',
};

const ROOM_FULL: Record<string, string> = {
  'room-gushaini':    'Room (Gushaini)',
  'room-banjar':      'Room (Banjar)',
  'rooftop-gushaini': 'Rooftop (Gushaini)',
  'rooftop-banjar':   'Rooftop (Banjar)',
};

// ── HOOKS ────────────────────────────────────────────────────────────────────

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

function fmtShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function filterByPeriod(
  payments: Payment[],
  month: number,
  year: number,
  allTime: boolean,
): Payment[] {
  if (allTime) return payments;
  return payments.filter(p => {
    const d = new Date(p.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ── CUSTOM TOOLTIP ────────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-xl"
      style={{ background: '#1C3A2A', color: '#FFFDF9', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {label && <p className="font-medium mb-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold">
          {p.name ? `${p.name}: ` : ''}₹{fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm shadow-xl"
      style={{ background: '#1C3A2A', color: '#FFFDF9', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="font-semibold">{payload[0].name}: ₹{fmt(payload[0].value)}</p>
    </div>
  );
}

// ── SKELETON COMPONENTS ──────────────────────────────────────────────────────

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-2xl animate-pulse"
      style={{ height, background: 'rgba(28,58,42,0.07)' }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(28,58,42,0.07)', height: 80 }} />
  );
}

// ── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ElementType;
}) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>{label}</p>
          <p className="text-xl font-bold leading-none" style={{ color: accent || '#1C3A2A', fontFamily: 'var(--font-playfair)' }}>
            {value}
          </p>
          {sub && <p className="text-[11px] mt-1.5" style={{ color: '#7A7A6E' }}>{sub}</p>}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: accent ? `${accent}18` : 'rgba(28,58,42,0.07)' }}>
            <Icon size={16} style={{ color: accent || '#1C3A2A' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION HEADING ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mb-3 mt-6 first:mt-0" style={{ color: '#1C3A2A' }}>
      {children}
    </h3>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

function EmptyState({ label = 'No data for this period yet' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-4xl">🏔️</span>
      <p className="text-sm" style={{ color: '#7A7A6E' }}>{label}</p>
    </div>
  );
}

// ── TAB 1: REVENUE ────────────────────────────────────────────────────────────

function RevenueTab({
  payments, rooms, groupBookings, blockedBookings,
  selectedMonth, selectedYear, allTime, isMobile,
}: {
  payments: Payment[];
  rooms: Room[];
  groupBookings: GroupBooking[];
  blockedBookings: BlockedBooking[];
  selectedMonth: number;
  selectedYear: number;
  allTime: boolean;
  isMobile: boolean;
}) {
  const chartHeight = isMobile ? 220 : 320;
  const [show12, setShow12] = useState(false);

  const now = new Date();

  // Monthly revenue — last 12 months
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const revenue = payments
        .filter(p => { const pd = new Date(p.date); return pd.getFullYear() === y && pd.getMonth() === m; })
        .reduce((s, p) => s + p.amount, 0);
      months.push({
        month: format(d, 'MMM'),
        year: y,
        revenue,
        isCurrentMonth: i === 0,
      });
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments]);

  const displayMonthly = (isMobile && !show12) ? monthlyData.slice(-6) : monthlyData;

  // Revenue by room
  const roomRevData = useMemo(() => {
    const byRoom: Record<string, number> = {};
    const filtered = filterByPeriod(payments, selectedMonth, selectedYear, allTime);
    filtered.forEach(p => { byRoom[p.roomId] = (byRoom[p.roomId] || 0) + p.amount; });
    return Object.entries(byRoom)
      .map(([id, rev]) => ({ name: ROOM_SHORT[id] || id, revenue: rev, color: ROOM_COLORS[id] || '#3E6B47' }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [payments, selectedMonth, selectedYear, allTime]);

  // Food vs Room revenue donut
  const foodRevenue = useMemo(() => {
    const fromRooms = rooms.reduce((s, r) => s + r.items.reduce((is, i) => is + i.quantity * i.pricePerUnit, 0), 0);
    const fromGroups = groupBookings.reduce((s, g) => s + g.items.reduce((is, i) => is + i.quantity * i.pricePerUnit, 0), 0);
    return fromRooms + fromGroups;
  }, [rooms, groupBookings]);

  const totalRevenue = filterByPeriod(payments, selectedMonth, selectedYear, allTime)
    .reduce((s, p) => s + p.amount, 0);
  const roomChargeRevenue = Math.max(0, totalRevenue - foodRevenue);

  const donutData = [
    { name: 'Room Charges', value: roomChargeRevenue || 1 },
    { name: 'Food & Services', value: foodRevenue || 0 },
  ];

  // Projected month-end
  const daysInMonth = getDaysInMonth(now);
  const dayOfMonth = now.getDate();
  const collectedThisMonth = payments
    .filter(p => { const d = new Date(p.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, p) => s + p.amount, 0);
  const projectedTotal = dayOfMonth > 0
    ? Math.round((collectedThisMonth / dayOfMonth) * daysInMonth)
    : collectedThisMonth;

  // YoY
  const sameMonthLastYear = payments
    .filter(p => { const d = new Date(p.date); return d.getFullYear() === now.getFullYear() - 1 && d.getMonth() === now.getMonth(); })
    .reduce((s, p) => s + p.amount, 0);
  const yoyPct = sameMonthLastYear > 0
    ? Math.round(((collectedThisMonth - sameMonthLastYear) / sameMonthLastYear) * 100)
    : null;

  // Advance revenue from blocked bookings
  const advanceRevenue = blockedBookings
    .filter(b => {
      if (!allTime) {
        const d = new Date(b.checkInDate);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }
      return true;
    })
    .reduce((s, b) => s + b.advancePaid, 0);

  return (
    <div className="px-4 md:px-6 pb-8 space-y-2">
      {/* Projected & YoY */}
      <SectionHeading>This Month at a Glance</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 border md:col-span-2" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#7A7A6E' }}>Month-End Projection</p>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-6'}`}>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Collected</p>
              <p className="text-lg font-bold" style={{ color: '#1C3A2A' }}>₹{fmt(collectedThisMonth)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Expected (Advance)</p>
              <p className="text-lg font-bold" style={{ color: '#3E6B47' }}>₹{fmt(advanceRevenue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Projected Total</p>
              <p className="text-2xl font-bold" style={{ color: '#D4873A', fontFamily: 'var(--font-playfair)' }}>
                ₹{fmt(projectedTotal)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: '#7A7A6E' }}>vs Same Month Last Year</p>
          {yoyPct !== null ? (
            <div className="flex items-center gap-2">
              {yoyPct >= 0
                ? <TrendingUp size={20} style={{ color: '#3E6B47' }} />
                : <TrendingDown size={20} style={{ color: '#C0533A' }} />}
              <span className="text-xl font-bold" style={{ color: yoyPct >= 0 ? '#3E6B47' : '#C0533A' }}>
                {yoyPct >= 0 ? '+' : ''}{yoyPct}%
              </span>
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#7A7A6E' }}>No data last year</p>
          )}
          {sameMonthLastYear > 0 && (
            <p className="text-[11px] mt-1" style={{ color: '#7A7A6E' }}>
              ₹{fmt(sameMonthLastYear)} last year
            </p>
          )}
        </div>
      </div>

      {/* Monthly Revenue Bar Chart */}
      <SectionHeading>Monthly Revenue</SectionHeading>
      {monthlyData.every(m => m.revenue === 0) ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={displayMonthly} margin={{ top: 4, right: 4, left: isMobile ? -20 : 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,58,42,0.08)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? 1 : 0}
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={isMobile ? fmtShort : (v) => fmtShort(v)}
                width={isMobile ? 44 : 56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {displayMonthly.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isCurrentMonth ? '#D4873A' : '#3E6B47'}
                    fillOpacity={entry.isCurrentMonth ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {isMobile && (
            <button
              onClick={() => setShow12(p => !p)}
              className="mt-3 w-full py-2 text-xs font-medium rounded-xl border"
              style={{ color: '#D4873A', borderColor: 'rgba(212,135,58,0.3)', background: 'rgba(212,135,58,0.06)' }}
            >
              {show12 ? 'Show 6 months' : 'Show all 12 months'}
            </button>
          )}
        </div>
      )}

      {/* Revenue by Room */}
      <SectionHeading>Revenue by Room</SectionHeading>
      {roomRevData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 240}>
            <BarChart
              data={roomRevData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,58,42,0.08)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtShort}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 50 : 64}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {roomRevData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Donut: Room Charges vs Food */}
      <SectionHeading>Room Charges vs Food & Services</SectionHeading>
      <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
        <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 50 : 70}
              outerRadius={isMobile ? 80 : 110}
              paddingAngle={4}
              dataKey="value"
            >
              <Cell fill="#1C3A2A" />
              <Cell fill="#D4873A" />
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: isMobile ? 11 : 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-1">
          <p className="text-[11px]" style={{ color: '#7A7A6E' }}>Total: ₹{fmt(totalRevenue)}</p>
        </div>
      </div>
    </div>
  );
}

// ── TAB 2: OCCUPANCY ──────────────────────────────────────────────────────────

function OccupancyTab({
  rooms, blockedBookings, selectedMonth, selectedYear, allTime, isMobile,
}: {
  rooms: Room[];
  blockedBookings: BlockedBooking[];
  selectedMonth: number;
  selectedYear: number;
  allTime: boolean;
  isMobile: boolean;
}) {
  const chartHeight = isMobile ? 220 : 300;

  const daysInMonth = allTime
    ? 365
    : getDaysInMonth(new Date(selectedYear, selectedMonth));

  // Occupancy per room
  const occupancyData = useMemo(() => {
    return rooms.map(room => {
      const roomBookings = blockedBookings.filter(b => {
        if (b.status === 'cancelled') return false;
        if (!b.roomIds.includes(room.id)) return false;
        if (allTime) return true;
        const ciDate = new Date(b.checkInDate);
        const coDate = new Date(b.checkOutDate);
        const mStart = startOfMonth(new Date(selectedYear, selectedMonth));
        const mEnd = endOfMonth(new Date(selectedYear, selectedMonth));
        return ciDate <= mEnd && coDate >= mStart;
      });

      let occupiedDays = 0;
      const mStart = allTime
        ? new Date(2020, 0, 1)
        : startOfMonth(new Date(selectedYear, selectedMonth));
      const mEnd = allTime
        ? new Date()
        : endOfMonth(new Date(selectedYear, selectedMonth));

      roomBookings.forEach(b => {
        const start = new Date(Math.max(new Date(b.checkInDate).getTime(), mStart.getTime()));
        const end   = new Date(Math.min(new Date(b.checkOutDate).getTime(), mEnd.getTime()));
        if (start < end) occupiedDays += differenceInDays(end, start);
      });

      // Also count if currently occupied
      if (!allTime && room.status === 'occupied' && room.checkInDate) {
        const ci = new Date(room.checkInDate);
        const co = room.checkOutDate ? new Date(room.checkOutDate) : new Date();
        const start = new Date(Math.max(ci.getTime(), mStart.getTime()));
        const end   = new Date(Math.min(co.getTime(), mEnd.getTime()));
        if (start < end) {
          const days = differenceInDays(end, start);
          occupiedDays = Math.max(occupiedDays, days);
        }
      }

      const rate = Math.min(100, Math.round((occupiedDays / daysInMonth) * 100));
      return {
        id: room.id,
        name: room.name,
        short: ROOM_SHORT[room.id] || room.id,
        color: ROOM_COLORS[room.id] || '#3E6B47',
        rate,
        occupiedDays,
        status: room.status,
      };
    });
  }, [rooms, blockedBookings, selectedMonth, selectedYear, allTime, daysInMonth]);

  const overallRate = Math.round(
    occupancyData.reduce((s, r) => s + r.rate, 0) / rooms.length
  );

  // Avg length of stay
  const checkedOutBookings = blockedBookings.filter(b => b.status === 'checked_out');
  const avgLOS = checkedOutBookings.length > 0
    ? Math.round(checkedOutBookings.reduce((s, b) => s + b.nights, 0) / checkedOutBookings.length * 10) / 10
    : 0;

  // Booking lead time
  const lead = blockedBookings
    .filter(b => b.status !== 'cancelled' && b.createdAt)
    .map(b => differenceInDays(new Date(b.checkInDate), new Date(b.createdAt)));
  const avgLead = lead.length > 0
    ? Math.round(lead.reduce((s, d) => s + d, 0) / lead.length)
    : 0;

  // Walk-in vs Advance
  const advanceCount = blockedBookings.filter(b =>
    b.blockType === 'advance' && b.status !== 'cancelled'
  ).length;
  const walkInCount = blockedBookings.filter(b =>
    b.blockType !== 'advance' && b.status !== 'cancelled' && b.blockType !== 'maintenance'
  ).length + rooms.filter(r => r.status === 'occupied' && !r.groupBookingId).length;

  const walkAdvData = [
    { name: 'Advance', value: advanceCount || 0, fill: '#D4873A' },
    { name: 'Walk-in', value: walkInCount || 0, fill: '#3E6B47' },
  ];

  function getRingColor(rate: number) {
    if (rate >= 70) return '#3E6B47';
    if (rate >= 40) return '#D4873A';
    return '#C0533A';
  }

  const radialData = occupancyData.map(r => ({
    name: r.short,
    rate: r.rate,
    fill: getRingColor(r.rate),
  }));

  return (
    <div className="px-4 md:px-6 pb-8">
      <SectionHeading>Occupancy Overview</SectionHeading>

      {/* Overall rate */}
      <div className="mb-4 rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: '#7A7A6E' }}>Overall Occupancy Rate</p>
            <p className="text-3xl font-bold mt-1" style={{
              color: getRingColor(overallRate),
              fontFamily: 'var(--font-playfair)',
            }}>
              {overallRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#7A7A6E' }}>Avg Stay</p>
            <p className="text-lg font-bold" style={{ color: '#1C3A2A' }}>{avgLOS || '–'} nights</p>
            <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>Lead Time</p>
            <p className="text-lg font-bold" style={{ color: '#1C3A2A' }}>{avgLead || '–'} days</p>
          </div>
        </div>
      </div>

      {/* Per-room occupancy radial chart */}
      <div
        className={`grid gap-3 mb-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}
      >
        {occupancyData.map(room => (
          <div
            key={room.id}
            className="rounded-2xl p-3 border flex flex-col items-center"
            style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={isMobile ? 90 : 110}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 28 : 35}
                outerRadius={isMobile ? 40 : 50}
                barSize={isMobile ? 8 : 10}
                data={[{ value: room.rate }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: 'rgba(28,58,42,0.08)' }}
                  dataKey="value"
                  fill={getRingColor(room.rate)}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={getRingColor(room.rate)}
                  fontSize={isMobile ? 13 : 15}
                  fontWeight="bold"
                >
                  {room.rate}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-[11px] font-medium mt-1 text-center leading-tight" style={{ color: '#1C3A2A' }}>
              {room.short}
            </p>
            <p className="text-[10px]" style={{ color: '#7A7A6E' }}>
              {room.occupiedDays}d occ.
            </p>
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Avg Length of Stay" value={avgLOS ? `${avgLOS} nights` : '–'} icon={Clock} />
        <StatCard label="Avg Lead Time" value={avgLead ? `${avgLead} days` : '–'} icon={CalendarDays} />
        <StatCard label="Advance Bookings" value={String(advanceCount)} icon={CheckCircle} accent="#3E6B47" />
        <StatCard label="Walk-in Bookings" value={String(walkInCount)} icon={BedDouble} accent="#D4873A" />
      </div>

      {/* Walk-in vs Advance pie */}
      <SectionHeading>Walk-in vs Advance Bookings</SectionHeading>
      {(advanceCount + walkInCount) === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={walkAdvData}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 80 : 110}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {walkAdvData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="px-3 py-2 rounded-xl text-sm shadow-xl" style={{ background: '#1C3A2A', color: '#FFFDF9' }}>
                    <p className="font-semibold">{payload[0].name}: {payload[0].value} bookings</p>
                  </div>
                ) : null
              } />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── TAB 3: GUESTS ─────────────────────────────────────────────────────────────

function GuestsTab({
  rooms, blockedBookings, groupBookings,
  selectedMonth, selectedYear, allTime, isMobile,
}: {
  rooms: Room[];
  blockedBookings: BlockedBooking[];
  groupBookings: GroupBooking[];
  selectedMonth: number;
  selectedYear: number;
  allTime: boolean;
  isMobile: boolean;
}) {
  const now = new Date();

  // Guest data from blockedBookings + groupBookings
  const guestMap = useMemo(() => {
    const map: Record<string, {
      name: string;
      phone: string;
      totalPaid: number;
      stays: number;
      lastStay: string;
      isRepeat: boolean;
    }> = {};

    [...blockedBookings, ...groupBookings].forEach(booking => {
      const b = booking as BlockedBooking & GroupBooking;
      const key = b.phone || b.guestName;
      if (!key) return;
      if (!map[key]) {
        map[key] = { name: b.guestName, phone: b.phone || '', totalPaid: 0, stays: 0, lastStay: b.checkOutDate || b.checkInDate, isRepeat: false };
      }
      if ('advancePaid' in b) {
        map[key].totalPaid += b.advancePaid;
      } else if ('amountPaid' in b) {
        map[key].totalPaid += (b as GroupBooking).amountPaid;
      }
      map[key].stays += 1;
      const co = b.checkOutDate || b.checkInDate;
      if (co && co > map[key].lastStay) map[key].lastStay = co;
    });

    // Mark repeat guests
    Object.values(map).forEach(g => { if (g.stays > 1) g.isRepeat = true; });
    return map;
  }, [blockedBookings, groupBookings]);

  const allGuests = Object.values(guestMap);
  const repeatGuests = allGuests.filter(g => g.isRepeat);
  const newGuests = allGuests.filter(g => !g.isRepeat);
  const repeatRate = allGuests.length > 0
    ? Math.round((repeatGuests.length / allGuests.length) * 100)
    : 0;

  const donutData = [
    { name: 'Repeat', value: repeatGuests.length || 0 },
    { name: 'New', value: newGuests.length || 0 },
  ];

  // Top 5 spenders
  const topSpenders = [...allGuests]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 5);

  // Churn risk (not visited in 90+ days)
  const churnRisk = allGuests
    .filter(g => {
      const lastDate = new Date(g.lastStay);
      return differenceInDays(now, lastDate) > 90;
    })
    .sort((a, b) => {
      const da = differenceInDays(now, new Date(a.lastStay));
      const db = differenceInDays(now, new Date(b.lastStay));
      return db - da;
    })
    .slice(0, 10);

  // Avg group size
  const groupSizes = [
    ...rooms.filter(r => r.status === 'occupied' && r.guest).map(r => (r.guest!.adults + r.guest!.children)),
    ...blockedBookings.map(b => b.adults + b.children),
    ...groupBookings.map(b => b.adults + b.children),
  ].filter(s => s > 0);
  const avgGroupSize = groupSizes.length > 0
    ? Math.round((groupSizes.reduce((s, n) => s + n, 0) / groupSizes.length) * 10) / 10
    : 0;

  // This month: new vs returning
  const thisMonthStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const thisMonthEnd = endOfMonth(new Date(selectedYear, selectedMonth));
  const thisMonthBookings = blockedBookings.filter(b => {
    const ci = new Date(b.checkInDate);
    return ci >= thisMonthStart && ci <= thisMonthEnd && b.status !== 'cancelled';
  });

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="px-4 md:px-6 pb-8">
      <SectionHeading>Guest Summary</SectionHeading>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Unique Guests" value={String(allGuests.length)} icon={Users} accent="#1C3A2A" />
        <StatCard label="Repeat Guests" value={String(repeatGuests.length)} sub={`${repeatRate}% repeat rate`} icon={TrendingUp} accent="#3E6B47" />
        <StatCard label="Avg Group Size" value={avgGroupSize ? `${avgGroupSize} pax` : '–'} icon={Users} accent="#D4873A" />
        <StatCard label="This Month (Bookings)" value={String(thisMonthBookings.length)} icon={BedDouble} />
      </div>

      {/* Repeat vs New donut */}
      <SectionHeading>Repeat vs New Guests</SectionHeading>
      {allGuests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 50 : 70}
                outerRadius={isMobile ? 80 : 110}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#1C3A2A" />
                <Cell fill="#D4873A" />
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#D4873A', fontFamily: 'var(--font-playfair)' }}>{repeatRate}%</p>
            <p className="text-xs" style={{ color: '#7A7A6E' }}>repeat rate</p>
          </div>
        </div>
      )}

      {/* Top Spenders */}
      <SectionHeading>Top 5 Spending Guests</SectionHeading>
      {topSpenders.length === 0 ? (
        <EmptyState label="No guest data yet" />
      ) : (
        <div className="space-y-2">
          {topSpenders.map((g, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 border flex items-center gap-3"
              style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}
            >
              <span className="text-lg w-8 text-center flex-shrink-0">{MEDAL[i] || `#${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1C3A2A' }}>{g.name}</p>
                <p className="text-[11px]" style={{ color: '#7A7A6E' }}>{g.stays} {g.stays === 1 ? 'stay' : 'stays'}</p>
              </div>
              <p className="text-sm font-bold flex-shrink-0" style={{ color: '#D4873A' }}>₹{fmt(g.totalPaid)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Churn Risk */}
      <SectionHeading>Churn Risk (90+ days since last visit)</SectionHeading>
      {churnRisk.length === 0 ? (
        <EmptyState label="No at-risk guests" />
      ) : (
        <div className="space-y-2">
          {churnRisk.map((g, i) => {
            const daysSince = differenceInDays(now, new Date(g.lastStay));
            const isHighRisk = daysSince > 90;
            return (
              <div
                key={i}
                className="rounded-2xl p-3 border flex items-center gap-3"
                style={{
                  background: '#FFFDF9',
                  borderColor: 'rgba(28,58,42,0.08)',
                  boxShadow: '0 1px 6px rgba(28,58,42,0.06)',
                  borderLeft: isHighRisk ? '3px solid #C0533A' : '3px solid rgba(28,58,42,0.08)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1C3A2A' }}>{g.name}</p>
                  <p className="text-[11px]" style={{ color: '#7A7A6E' }}>
                    Last: {g.lastStay ? format(new Date(g.lastStay), 'd MMM yyyy') : '—'} · {daysSince}d ago
                  </p>
                </div>
                {g.phone && (
                  <a
                    href={`tel:${g.phone}`}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px]"
                    style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A' }}
                  >
                    <Phone size={13} />
                    Call
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB 4: ROOM PERFORMANCE ──────────────────────────────────────────────────

function RoomsTab({
  rooms, payments, blockedBookings,
  selectedMonth, selectedYear, allTime, isMobile,
}: {
  rooms: Room[];
  payments: Payment[];
  blockedBookings: BlockedBooking[];
  selectedMonth: number;
  selectedYear: number;
  allTime: boolean;
  isMobile: boolean;
}) {
  const [show6mo, setShow6mo] = useState(false);
  const now = new Date();

  const filteredPayments = filterByPeriod(payments, selectedMonth, selectedYear, allTime);

  const roomStats = useMemo(() => {
    const daysInMonth = allTime ? 365 : getDaysInMonth(new Date(selectedYear, selectedMonth));
    return rooms.map(room => {
      const revenue = filteredPayments
        .filter(p => p.roomId === room.id)
        .reduce((s, p) => s + p.amount, 0);

      const roomBookings = blockedBookings.filter(b => {
        if (b.status === 'cancelled') return false;
        if (!b.roomIds.includes(room.id)) return false;
        if (allTime) return true;
        const ci = new Date(b.checkInDate);
        const co = new Date(b.checkOutDate);
        const mStart = startOfMonth(new Date(selectedYear, selectedMonth));
        const mEnd = endOfMonth(new Date(selectedYear, selectedMonth));
        return ci <= mEnd && co >= mStart;
      });

      let occupiedDays = 0;
      const mStart = allTime ? new Date(2020, 0, 1) : startOfMonth(new Date(selectedYear, selectedMonth));
      const mEnd = allTime ? now : endOfMonth(new Date(selectedYear, selectedMonth));
      roomBookings.forEach(b => {
        const start = new Date(Math.max(new Date(b.checkInDate).getTime(), mStart.getTime()));
        const end   = new Date(Math.min(new Date(b.checkOutDate).getTime(), mEnd.getTime()));
        if (start < end) occupiedDays += differenceInDays(end, start);
      });

      const totalStays = roomBookings.length;
      const avgNights = totalStays > 0 ? Math.round(roomBookings.reduce((s, b) => s + b.nights, 0) / totalStays * 10) / 10 : 0;
      const occupancyRate = Math.min(100, Math.round((occupiedDays / daysInMonth) * 100));
      const avgRate = revenue > 0 && occupiedDays > 0 ? Math.round(revenue / occupiedDays) : room.nightlyRate;
      const revPAR = Math.round(revenue / daysInMonth);

      return {
        id: room.id,
        name: room.name,
        short: ROOM_SHORT[room.id] || room.id,
        color: ROOM_COLORS[room.id] || '#3E6B47',
        revenue,
        occupancyRate,
        avgRate,
        totalStays,
        avgNights,
        revPAR,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, filteredPayments, blockedBookings, selectedMonth, selectedYear, allTime]);

  // Revenue timeline (last 6 or 3 months)
  const monthsToShow = (isMobile && !show6mo) ? 3 : 6;
  const timelineData = useMemo(() => {
    const months = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const entry: Record<string, string | number> = { month: format(d, 'MMM') };
      rooms.forEach(room => {
        entry[room.id] = payments
          .filter(p => {
            const pd = new Date(p.date);
            return p.roomId === room.id && pd.getFullYear() === y && pd.getMonth() === m;
          })
          .reduce((s, p) => s + p.amount, 0);
      });
      months.push(entry);
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, payments, monthsToShow]);

  return (
    <div className="px-4 md:px-6 pb-8">
      <SectionHeading>RevPAR by Room</SectionHeading>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {roomStats.map(room => (
          <div
            key={room.id}
            className="rounded-2xl p-4 border"
            style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)', borderTop: `3px solid ${room.color}` }}
          >
            <p className="text-[11px] font-medium mb-1" style={{ color: '#7A7A6E' }}>{room.short}</p>
            <p className="text-xl font-bold" style={{ color: room.color, fontFamily: 'var(--font-playfair)' }}>
              ₹{fmt(room.revPAR)}
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#7A7A6E' }}>Revenue / available night</p>
          </div>
        ))}
      </div>

      {/* Room comparison */}
      <SectionHeading>Room Comparison</SectionHeading>
      {isMobile ? (
        /* Mobile: horizontal scroll snap cards */
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {roomStats.map(room => (
            <div
              key={room.id}
              className="rounded-2xl p-4 border flex-shrink-0"
              style={{
                background: '#FFFDF9',
                borderColor: 'rgba(28,58,42,0.08)',
                boxShadow: '0 1px 6px rgba(28,58,42,0.06)',
                scrollSnapAlign: 'start',
                width: 'calc(85vw - 32px)',
                borderTop: `3px solid ${room.color}`,
              }}
            >
              <p className="text-sm font-bold mb-3" style={{ color: '#1C3A2A' }}>{room.short}</p>
              {[
                { label: 'Revenue',    value: `₹${fmt(room.revenue)}` },
                { label: 'Occupancy',  value: `${room.occupancyRate}%` },
                { label: 'Avg Rate',   value: `₹${fmt(room.avgRate)}/night` },
                { label: 'Total Stays',value: String(room.totalStays) },
                { label: 'Avg Nights', value: `${room.avgNights}` },
                { label: 'RevPAR',     value: `₹${fmt(room.revPAR)}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(28,58,42,0.06)' }}>
                  <span className="text-[11px]" style={{ color: '#7A7A6E' }}>{label}</span>
                  <span className="text-[12px] font-semibold" style={{ color: '#1C3A2A' }}>{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: comparison table */
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(28,58,42,0.05)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}>
                {['Room', 'Revenue', 'Occupancy %', 'Avg Rate', 'Stays', 'Avg Nights', 'RevPAR'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#7A7A6E' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomStats.map((room, i) => (
                <tr key={room.id} style={{ borderBottom: i < rooms.length - 1 ? '1px solid rgba(28,58,42,0.06)' : undefined }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: room.color }} />
                      <span className="font-medium text-xs" style={{ color: '#1C3A2A' }}>{room.short}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#1C3A2A' }}>₹{fmt(room.revenue)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7A7A6E' }}>{room.occupancyRate}%</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7A7A6E' }}>₹{fmt(room.avgRate)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7A7A6E' }}>{room.totalStays}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7A7A6E' }}>{room.avgNights}</td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#D4873A' }}>₹{fmt(room.revPAR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue timeline */}
      <SectionHeading>Room Revenue Timeline</SectionHeading>
      <div className="rounded-2xl p-4 border" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
        <ResponsiveContainer width="100%" height={isMobile ? 220 : 320}>
          <LineChart data={timelineData} margin={{ top: 4, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,58,42,0.08)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: isMobile ? 10 : 12, fill: '#7A7A6E' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtShort}
              width={isMobile ? 44 : 56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: isMobile ? 11 : 13 }}
              formatter={(value) => ROOM_SHORT[value as string] || value}
            />
            {rooms.map(room => (
              <Line
                key={room.id}
                type="monotone"
                dataKey={room.id}
                name={room.id}
                stroke={ROOM_COLORS[room.id] || '#3E6B47'}
                strokeWidth={2}
                dot={{ r: isMobile ? 2 : 4 }}
                activeDot={{ r: isMobile ? 4 : 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {isMobile && (
          <button
            onClick={() => setShow6mo(p => !p)}
            className="mt-3 w-full py-2 text-xs font-medium rounded-xl border"
            style={{ color: '#D4873A', borderColor: 'rgba(212,135,58,0.3)', background: 'rgba(212,135,58,0.06)' }}
          >
            {show6mo ? 'Show 3 months' : 'Show 6 months'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── TAB 5: FINANCIAL HEALTH ───────────────────────────────────────────────────

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

const EXPENSE_CATEGORIES = ['Utilities', 'Maintenance', 'Food & Supplies', 'Staff', 'Marketing', 'Other'];

function FinancialTab({
  rooms, payments, blockedBookings, groupBookings,
  selectedMonth, selectedYear, allTime, isMobile,
}: {
  rooms: Room[];
  payments: Payment[];
  blockedBookings: BlockedBooking[];
  groupBookings: GroupBooking[];
  selectedMonth: number;
  selectedYear: number;
  allTime: boolean;
  isMobile: boolean;
}) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try { return JSON.parse(localStorage.getItem('homestay_expenses') || '[]'); } catch { return []; }
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expForm, setExpForm] = useState({ category: 'Utilities', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const saveExpense = () => {
    const amount = parseFloat(expForm.amount);
    if (!amount || amount <= 0) return;
    const newExp: Expense = { id: crypto.randomUUID(), ...expForm, amount };
    const updated = [...expenses, newExp];
    setExpenses(updated);
    localStorage.setItem('homestay_expenses', JSON.stringify(updated));
    setShowExpenseModal(false);
    setExpForm({ category: 'Utilities', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  };

  const deleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem('homestay_expenses', JSON.stringify(updated));
  };

  const filteredPayments = filterByPeriod(payments, selectedMonth, selectedYear, allTime);
  const totalCollected = filteredPayments.reduce((s, p) => s + p.amount, 0);

  // Total invoiced: sum of all blocked bookings totalAmount for this period
  const totalInvoiced = blockedBookings
    .filter(b => {
      if (b.status === 'cancelled') return false;
      if (allTime) return true;
      const ci = new Date(b.checkInDate);
      return ci.getFullYear() === selectedYear && ci.getMonth() === selectedMonth;
    })
    .reduce((s, b) => s + b.totalAmount, 0) +
    groupBookings
      .filter(g => {
        if (allTime) return true;
        const ci = new Date(g.checkInDate);
        return ci.getFullYear() === selectedYear && ci.getMonth() === selectedMonth;
      })
      .reduce((s, g) => s + calculateGroupTotal(g), 0);

  const outstanding = Math.max(0, totalInvoiced - totalCollected);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Outstanding rooms
  const outstandingRooms = rooms
    .filter(r => r.status === 'occupied' && r.paymentStatus !== 'paid')
    .map(r => ({
      room: r,
      outstanding: Math.max(0, calculateTotal(r) - r.amountPaid),
    }))
    .filter(r => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  // Payment method breakdown (using advance payments from blockedBookings)
  const methodMap: Record<string, number> = {};
  blockedBookings.forEach(b => {
    if (b.advancePaid > 0) {
      methodMap[b.paymentMethod] = (methodMap[b.paymentMethod] || 0) + b.advancePaid;
    }
  });
  const methodData = Object.entries(methodMap).map(([name, value]) => ({
    name: name === 'bank_transfer' ? 'Bank Transfer' : name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const METHOD_COLORS = ['#D4873A', '#3E6B47', '#2E7D9B', '#1C3A2A'];

  // Advance collection rate
  const advancePaid = blockedBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((s, b) => s + b.advancePaid, 0);
  const advanceTotal = blockedBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((s, b) => s + b.totalAmount, 0);
  const advanceCollectionRate = advanceTotal > 0 ? Math.round((advancePaid / advanceTotal) * 100) : 0;

  // Filtered expenses
  const filteredExpenses = expenses.filter(e => {
    if (allTime) return true;
    const d = new Date(e.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Rev vs Exp bar data
  const revVsExpData = [
    { label: 'Revenue', value: totalCollected, fill: '#3E6B47' },
    { label: 'Expenses', value: totalExpenses, fill: '#C0533A' },
  ];

  const collRateColor = collectionRate >= 90 ? '#3E6B47' : collectionRate >= 70 ? '#D4873A' : '#C0533A';

  return (
    <div className="px-4 md:px-6 pb-24 md:pb-8">
      {/* Collections summary */}
      <SectionHeading>Collections Summary</SectionHeading>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Invoiced" value={`₹${fmt(totalInvoiced)}`} icon={IndianRupee} />
        <StatCard label="Total Collected" value={`₹${fmt(totalCollected)}`} icon={CheckCircle} accent="#3E6B47" />
        <StatCard label="Outstanding" value={`₹${fmt(outstanding)}`} icon={AlertTriangle} accent="#C0533A" />
        <StatCard label="Collection Rate" value={`${collectionRate}%`} accent={collRateColor} icon={TrendingUp} />
      </div>

      {/* Advance collection */}
      <div className="rounded-2xl p-4 border mb-4" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#7A7A6E' }}>Advance Collection Rate</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(28,58,42,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${advanceCollectionRate}%`, background: advanceCollectionRate >= 70 ? '#3E6B47' : '#D4873A' }}
            />
          </div>
          <span className="text-sm font-bold flex-shrink-0" style={{ color: advanceCollectionRate >= 70 ? '#3E6B47' : '#D4873A' }}>
            {advanceCollectionRate}%
          </span>
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: '#7A7A6E' }}>
          ₹{fmt(advancePaid)} collected of ₹{fmt(advanceTotal)} advance
        </p>
      </div>

      {/* Outstanding rooms */}
      {outstandingRooms.length > 0 && (
        <>
          <SectionHeading>Outstanding Balances</SectionHeading>
          <div className="space-y-2 mb-4">
            {outstandingRooms.map(({ room, outstanding: amt }) => (
              <div
                key={room.id}
                className="rounded-2xl p-3 border flex items-center gap-3"
                style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{room.name}</p>
                  <p className="text-[11px]" style={{ color: '#7A7A6E' }}>
                    {room.guest?.fullName || 'Guest'} · due {room.checkOutDate ? format(new Date(room.checkOutDate), 'd MMM') : '—'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl text-xs font-bold flex-shrink-0" style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A' }}>
                  ₹{fmt(amt)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Payment method breakdown */}
      {methodData.length > 0 && (
        <>
          <SectionHeading>Payment Method Breakdown</SectionHeading>
          <div className="rounded-2xl p-4 border mb-4" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
              <PieChart>
                <Pie data={methodData} cx="50%" cy="50%" outerRadius={isMobile ? 65 : 85} dataKey="value" paddingAngle={3}>
                  {methodData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Expense tracking */}
      <SectionHeading>Expense Tracking</SectionHeading>

      {/* Revenue vs Expenses bar */}
      {(totalCollected > 0 || totalExpenses > 0) && (
        <div className="rounded-2xl p-4 border mb-3" style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={revVsExpData} layout="vertical" margin={{ top: 0, right: 60, left: 16, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#7A7A6E' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#7A7A6E' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {revVsExpData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense list */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-2xl p-6 border flex flex-col items-center gap-2 mb-3"
          style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
          <p className="text-sm" style={{ color: '#7A7A6E' }}>No expenses logged yet</p>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {filteredExpenses.map(exp => (
            <div key={exp.id} className="rounded-2xl p-3 border flex items-center gap-3"
              style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.06)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{exp.category}</p>
                <p className="text-[11px]" style={{ color: '#7A7A6E' }}>
                  {format(new Date(exp.date), 'd MMM yyyy')} {exp.notes ? `· ${exp.notes}` : ''}
                </p>
              </div>
              <p className="text-sm font-bold flex-shrink-0" style={{ color: '#C0533A' }}>₹{fmt(exp.amount)}</p>
              <button onClick={() => deleteExpense(exp.id)} className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ color: '#7A7A6E', background: 'rgba(28,58,42,0.06)' }}>
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="rounded-2xl p-3 border" style={{ background: 'rgba(192,83,58,0.06)', borderColor: 'rgba(192,83,58,0.2)' }}>
            <p className="text-sm font-semibold text-right" style={{ color: '#C0533A' }}>
              Total Expenses: ₹{fmt(totalExpenses)}
            </p>
          </div>
        </div>
      )}

      {/* FAB: Add Expense */}
      <button
        onClick={() => setShowExpenseModal(true)}
        className="fixed bottom-6 right-6 md:relative md:bottom-auto md:right-auto md:w-full w-14 h-14 md:h-11 md:w-auto md:px-5 rounded-full md:rounded-xl flex items-center justify-center gap-2 shadow-xl md:shadow-none z-30 min-h-[44px]"
        style={{ background: '#D4873A', color: '#FFFDF9' }}
      >
        <Plus size={20} />
        <span className="hidden md:block text-sm font-semibold">Add Expense</span>
      </button>

      {/* Expense modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-3" style={{ background: '#FFFDF9' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Add Expense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#7A7A6E', background: 'rgba(28,58,42,0.07)' }}>
                <X size={16} />
              </button>
            </div>
            <select
              value={expForm.category}
              onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Amount ₹"
              value={expForm.amount}
              onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
            />
            <input
              type="date"
              value={expForm.date}
              onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={expForm.notes}
              onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
            />
            <button
              onClick={saveExpense}
              className="w-full py-3 rounded-xl font-semibold text-sm min-h-[44px]"
              style={{ background: '#D4873A', color: '#FFFDF9' }}
            >
              Save Expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 6: EXPORT ─────────────────────────────────────────────────────────────

function ExportTab({
  rooms, payments, blockedBookings, groupBookings,
  selectedMonth, selectedYear,
}: {
  rooms: Room[];
  payments: Payment[];
  blockedBookings: BlockedBooking[];
  groupBookings: GroupBooking[];
  selectedMonth: number;
  selectedYear: number;
}) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const monthLabel = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  const filteredPayments = payments.filter(p => {
    const d = new Date(p.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const totalRevenue = filteredPayments.reduce((s, p) => s + p.amount, 0);

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
  const totalDays = rooms.length * daysInMonth;
  let occupiedDays = 0;
  blockedBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const mStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const mEnd = endOfMonth(new Date(selectedYear, selectedMonth));
    b.roomIds.forEach(() => {
      const start = new Date(Math.max(new Date(b.checkInDate).getTime(), mStart.getTime()));
      const end   = new Date(Math.min(new Date(b.checkOutDate).getTime(), mEnd.getTime()));
      if (start < end) occupiedDays += differenceInDays(end, start);
    });
  });
  const occupancyRate = totalDays > 0 ? Math.min(100, Math.round((occupiedDays / totalDays) * 100)) : 0;

  const guestSet = new Set<string>();
  blockedBookings
    .filter(b => { const ci = new Date(b.checkInDate); return ci.getFullYear() === selectedYear && ci.getMonth() === selectedMonth; })
    .forEach(b => guestSet.add(b.guestName));
  groupBookings
    .filter(g => { const ci = new Date(g.checkInDate); return ci.getFullYear() === selectedYear && ci.getMonth() === selectedMonth; })
    .forEach(g => guestSet.add(g.guestName));
  const totalGuests = guestSet.size;

  const outstanding = rooms
    .filter(r => r.status === 'occupied' && r.paymentStatus !== 'paid')
    .reduce((s, r) => s + Math.max(0, calculateTotal(r) - r.amountPaid), 0);

  const roomPerfData = rooms.map(room => {
    const rev = filteredPayments.filter(p => p.roomId === room.id).reduce((s, p) => s + p.amount, 0);
    const stays = blockedBookings.filter(b =>
      b.roomIds.includes(room.id) && b.status !== 'cancelled' &&
      new Date(b.checkInDate).getMonth() === selectedMonth &&
      new Date(b.checkInDate).getFullYear() === selectedYear
    ).length;
    return { name: ROOM_SHORT[room.id] || room.id, revenue: rev, stays };
  });

  const upcomingBookings = blockedBookings
    .filter(b => {
      const ci = new Date(b.checkInDate);
      return ci >= new Date() && ci <= endOfMonth(new Date(selectedYear, selectedMonth + 1)) && b.status === 'blocked';
    })
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))
    .slice(0, 5);

  const generatePDF = useCallback(async () => {
    if (!pdfRef.current) return;
    setGenerating(true);
    try {
      const [jspdfMod, h2cMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      // jspdf v4 exports jsPDF as a named export; html2canvas uses default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JsPDF = (jspdfMod as any).jsPDF ?? jspdfMod.default;
      const html2canvas = h2cMod.default;
      const canvas = await html2canvas(pdfRef.current!, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`Pahadi-Ghar-Report-${format(new Date(selectedYear, selectedMonth), 'MMM-yyyy')}.pdf`);
    } finally {
      setGenerating(false);
    }
  }, [selectedYear, selectedMonth]);

  return (
    <div className="px-4 md:px-6 pb-8">
      <SectionHeading>Executive Summary PDF</SectionHeading>

      <p className="text-sm mb-4" style={{ color: '#7A7A6E' }}>
        Export a one-page summary for {monthLabel}.
      </p>

      {/* Export button */}
      <button
        onClick={generatePDF}
        disabled={generating}
        className="w-full md:w-auto md:px-8 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 min-h-[44px] mb-6 disabled:opacity-60"
        style={{ background: '#D4873A', color: '#FFFDF9' }}
      >
        {generating ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {generating ? 'Generating PDF…' : 'Download PDF Report'}
      </button>

      {/* PDF preview & hidden capture div */}
      <div className="mb-4">
        <p className="text-xs font-medium mb-2" style={{ color: '#7A7A6E' }}>Preview</p>
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(28,58,42,0.12)' }}>
          <div
            ref={pdfRef}
            style={{ width: 800, background: '#FFFDF9', fontFamily: 'system-ui, sans-serif' }}
          >
            {/* PDF Header */}
            <div style={{ background: '#1C3A2A', padding: '28px 36px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#FFFDF9', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
                  Tirthan Valley Homestay
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Monthly Report — {monthLabel}</div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                Generated on<br />{format(new Date(), 'd MMM yyyy')}
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ padding: '24px 36px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Total Revenue', value: `₹${fmt(totalRevenue)}`, color: '#D4873A' },
                { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: '#3E6B47' },
                { label: 'Total Guests', value: String(totalGuests), color: '#1C3A2A' },
                { label: 'Outstanding ₹', value: `₹${fmt(outstanding)}`, color: '#C0533A' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: '#F7F3EE', borderRadius: 12, padding: '16px', border: `2px solid ${kpi.color}30` }}>
                  <div style={{ fontSize: 11, color: '#7A7A6E', marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Room Performance Table */}
            <div style={{ padding: '24px 36px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3A2A', marginBottom: 12 }}>Room Performance</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1C3A2A' }}>
                    {['Room', 'Revenue', 'Stays'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: '#FFFDF9', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roomPerfData.map((r, i) => (
                    <tr key={r.name} style={{ background: i % 2 === 0 ? '#FFFDF9' : '#F7F3EE' }}>
                      <td style={{ padding: '8px 12px', color: '#1C3A2A', fontWeight: 500 }}>{r.name}</td>
                      <td style={{ padding: '8px 12px', color: '#D4873A', fontWeight: 600 }}>₹{fmt(r.revenue)}</td>
                      <td style={{ padding: '8px 12px', color: '#7A7A6E' }}>{r.stays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Highlights */}
            <div style={{ padding: '24px 36px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3A2A', marginBottom: 10 }}>Key Highlights</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  `Total revenue collected: ₹${fmt(totalRevenue)}`,
                  `Overall occupancy rate: ${occupancyRate}%`,
                  `Unique guests served: ${totalGuests}`,
                  outstanding > 0 ? `Outstanding balance: ₹${fmt(outstanding)} pending collection` : 'All balances collected',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 12, color: '#333' }}>
                    <span style={{ color: '#D4873A', fontWeight: 700 }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Month Outlook */}
            {upcomingBookings.length > 0 && (
              <div style={{ padding: '24px 36px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3A2A', marginBottom: 10 }}>Upcoming Bookings</div>
                {upcomingBookings.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(28,58,42,0.08)', fontSize: 12 }}>
                    <span style={{ color: '#1C3A2A', fontWeight: 500 }}>{b.guestName}</span>
                    <span style={{ color: '#7A7A6E' }}>{format(new Date(b.checkInDate), 'd MMM')} – {format(new Date(b.checkOutDate), 'd MMM')}</span>
                    <span style={{ color: '#D4873A', fontWeight: 600 }}>₹{fmt(b.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PDF Footer */}
            <div style={{ background: '#D4873A', padding: '14px 36px', marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#FFFDF9', fontSize: 11, fontWeight: 600 }}>Confidential — Tirthan Valley Homestay</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>The Pahadi Ghar · v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

// Dummy import to avoid unused import error for CalendarDays icon used in occupancy tab
function CalendarDays({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

export default function ReportsPage() {
  const { rooms, payments, blockedBookings, groupBookings } = useHomestay();
  const [activeTab, setActiveTab] = useState(0);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [allTime, setAllTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSynced] = useState(new Date());

  const isMobile = useMediaQuery('(max-width: 768px)');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Simulate brief loading on filter change
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [selectedMonth, selectedYear, allTime]);

  // Scroll active tab into view
  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const activeEl = bar.children[activeTab] as HTMLElement;
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const monthsOptions = [];
  for (let i = 0; i < 12; i++) {
    monthsOptions.push({ value: i, label: format(new Date(2024, i), 'MMMM') });
  }

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    yearOptions.push(y);
  }

  const minutesSince = Math.floor((new Date().getTime() - lastSynced.getTime()) / 60000);

  const sharedProps = { selectedMonth, selectedYear, allTime, isMobile };

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* ── Page Header ── */}
      <div
        className="sticky top-0 z-20 px-4 md:px-6 py-3"
        style={{
          background: 'rgba(247,243,238,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(28,58,42,0.08)',
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} style={{ color: '#D4873A' }} />
            <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Reports
            </h1>
          </div>

          {/* Month/Year selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllTime(p => !p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px]"
              style={{
                background: allTime ? '#1C3A2A' : 'rgba(28,58,42,0.07)',
                color: allTime ? '#FFFDF9' : '#1C3A2A',
              }}
            >
              All Time
            </button>
            {!allTime && (
              <>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium min-h-[36px] cursor-pointer"
                    style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A', border: 'none', outline: 'none' }}
                  >
                    {monthsOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
                </div>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium min-h-[36px] cursor-pointer"
                    style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A', border: 'none', outline: 'none' }}
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-[10px]" style={{ color: '#7A7A6E' }}>
          Last synced: {minutesSince === 0 ? 'just now' : `${minutesSince}m ago`} · local data
        </p>

        {/* Tab bar */}
        <div
          ref={tabBarRef}
          className="flex gap-2 mt-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 min-h-[32px]"
              style={{
                background: activeTab === i ? '#D4873A' : 'rgba(28,58,42,0.07)',
                color: activeTab === i ? '#FFFDF9' : '#7A7A6E',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="pt-2">
        {loading ? (
          <div className="px-4 md:px-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
            </div>
            <ChartSkeleton height={isMobile ? 220 : 320} />
            <ChartSkeleton height={isMobile ? 180 : 240} />
          </div>
        ) : (
          <>
            {activeTab === 0 && <RevenueTab rooms={rooms} payments={payments} blockedBookings={blockedBookings} groupBookings={groupBookings} {...sharedProps} />}
            {activeTab === 1 && <OccupancyTab rooms={rooms} blockedBookings={blockedBookings} {...sharedProps} />}
            {activeTab === 2 && <GuestsTab rooms={rooms} blockedBookings={blockedBookings} groupBookings={groupBookings} {...sharedProps} />}
            {activeTab === 3 && <RoomsTab rooms={rooms} payments={payments} blockedBookings={blockedBookings} {...sharedProps} />}
            {activeTab === 4 && <FinancialTab rooms={rooms} payments={payments} blockedBookings={blockedBookings} groupBookings={groupBookings} {...sharedProps} />}
            {activeTab === 5 && (
              <ExportTab
                rooms={rooms}
                payments={payments}
                blockedBookings={blockedBookings}
                groupBookings={groupBookings}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
