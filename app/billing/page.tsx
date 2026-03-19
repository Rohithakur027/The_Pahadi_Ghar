'use client';

import { useState } from 'react';
import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  TrendingUp, Download, CheckCircle, AlertCircle, Clock,
  ChevronRight, IndianRupee, Mountain, Lock, LogIn, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Filter = 'all' | 'unpaid' | 'partial' | 'paid' | 'advance';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    icon: CheckCircle, color: '#3E6B47', bg: 'rgba(62,107,71,0.12)',   border: 'rgba(62,107,71,0.25)' },
  partial: { label: 'Partial', icon: Clock,        color: '#A36520', bg: 'rgba(212,135,58,0.12)', border: 'rgba(212,135,58,0.3)' },
  unpaid:  { label: 'Unpaid',  icon: AlertCircle,  color: '#C0533A', bg: 'rgba(192,83,58,0.1)',   border: 'rgba(192,83,58,0.25)' },
};

const ROOM_LABELS: Record<string, string> = {
  'room-gushaini':    '🏡 Room (Gushaini)',
  'room-banjar':      '🌄 Room (Banjar)',
  'rooftop-gushaini': '🏔️ Rooftop (Gushaini)',
  'rooftop-banjar':   '⛺ Rooftop (Banjar)',
};

export default function BillingPage() {
  const router = useRouter();
  const { rooms, getMonthlyRevenue, blockedBookings, checkInFromBlock } = useHomestay();
  const [filter, setFilter] = useState<Filter>('all');

  const now = new Date();
  const monthRevenue = getMonthlyRevenue(now.getFullYear(), now.getMonth());
  const lastMonthRevenue = getMonthlyRevenue(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );

  const todayStr = format(now, 'yyyy-MM-dd');
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');

  // Split: checking out today vs still active
  const todayCheckouts = occupiedRooms.filter(r => r.checkOutDate === todayStr);
  const activeRooms    = occupiedRooms.filter(r => r.checkOutDate !== todayStr);

  const filtered = occupiedRooms.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'advance') return false;
    return r.paymentStatus === filter;
  });

  const activeBlocked = blockedBookings.filter(b => b.status === 'blocked');
  const allUnpaid  = occupiedRooms.filter(r => r.paymentStatus === 'unpaid').length;
  const allPartial = occupiedRooms.filter(r => r.paymentStatus === 'partial').length;
  const allPaid    = occupiedRooms.filter(r => r.paymentStatus === 'paid').length;

  const handleCheckInFromBilling = (bookingId: string) => {
    const result = checkInFromBlock(bookingId);
    if (!result) return;
    toast.success(`✓ ${result.guestName} checked in`);
    router.push(`/rooms/${result.firstRoomId}`);
  };

  const FILTER_TABS: { id: Filter; label: string }[] = [
    { id: 'all',     label: 'Active' },
    { id: 'unpaid',  label: 'Unpaid' },
    { id: 'partial', label: 'Partial' },
    { id: 'paid',    label: 'Paid' },
    { id: 'advance', label: `Advance${activeBlocked.length > 0 ? ` (${activeBlocked.length})` : ''}` },
  ];

  return (
    <div className="page-enter px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mountain size={16} style={{ color: '#D4873A' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>Finance</span>
        </div>
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Billing
          </h1>
          <button
            onClick={() => toast('Export coming soon! 📊', { icon: '🌿' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Revenue Card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1C3A2A 0%, #2A5A40 100%)',
          boxShadow: '0 6px 24px rgba(28,58,42,0.25)',
        }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10" style={{ background: '#D4873A' }} />
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 text-white">
            {format(now, 'MMMM yyyy')}
          </p>
          <div className="flex items-center gap-1.5 opacity-80">
            <TrendingUp size={13} style={{ color: '#E8C07A' }} />
            <span className="text-xs text-white/80">
              {lastMonthRevenue > 0
                ? `${((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0)}% vs last month`
                : 'First month'}
            </span>
          </div>
        </div>
        <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
          ₹{formatINR(monthRevenue)}
        </p>
        <p className="text-xs text-white/60">Total collected this month</p>

        <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
          {[
            { label: 'Unpaid',  count: allUnpaid,  color: '#F87171' },
            { label: 'Partial', count: allPartial, color: '#FBB040' },
            { label: 'Paid',    count: allPaid,    color: '#86EFAC' },
            { label: 'Advance', count: activeBlocked.length, color: '#FBBF24' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold" style={{ color: s.color, fontFamily: 'var(--font-playfair)' }}>{s.count}</p>
              <p className="text-xs text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(28,58,42,0.06)' }}>
        {FILTER_TABS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: filter === f.id ? '#FFFDF9' : 'transparent',
              color: filter === f.id ? '#1C3A2A' : '#7A7A6E',
              boxShadow: filter === f.id ? '0 1px 4px rgba(28,58,42,0.1)' : 'none',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── ADVANCE BOOKINGS TAB ── */}
      {filter === 'advance' && (
        <>
          {activeBlocked.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
            >
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No advance bookings</p>
              <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>
                Go to Calendar to block rooms in advance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBlocked.map(booking => (
                <div
                  key={booking.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFFDF9', border: '1.5px dashed rgba(212,135,58,0.5)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
                >
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(212,135,58,0.12)' }}
                        >
                          <Lock size={14} style={{ color: '#D4873A' }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                            {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(212,135,58,0.15)', color: '#A36520' }}
                      >
                        Advance
                      </span>
                    </div>

                    <p className="text-xs mb-2" style={{ color: '#7A7A6E' }}>
                      {format(parseISO(booking.checkInDate), 'd MMM')} → {format(parseISO(booking.checkOutDate), 'd MMM yyyy')} · {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                    </p>

                    <div className="flex gap-2 mb-3">
                      {[
                        { label: 'Total', value: booking.totalAmount, color: '#1C3A2A' },
                        { label: 'Paid', value: booking.advancePaid, color: '#3E6B47' },
                        { label: 'Balance', value: booking.balanceDue, color: booking.balanceDue > 0 ? '#C0533A' : '#3E6B47' },
                      ].map(f => (
                        <div key={f.label} className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(28,58,42,0.05)' }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>{f.label}</p>
                          <p className="text-xs font-bold mt-0.5" style={{ color: f.color }}>₹{formatINR(f.value)}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCheckInFromBilling(booking.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                    >
                      <LogIn size={13} />
                      Check In Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ALL VIEW: two-section layout ── */}
      {filter === 'all' && (
        <>
          {/* Active Bookings */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Active Bookings
            </h2>
            {activeRooms.length === 0 ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-sm" style={{ color: '#7A7A6E' }}>No active guests right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeRooms.map(room => {
                  const total = calculateTotal(room);
                  const balance = total - room.amountPaid;
                  const statusConf = STATUS_CONFIG[room.paymentStatus];
                  const StatusIcon = statusConf.icon;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                      style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 4px rgba(28,58,42,0.04)' }}
                    >
                      <span className="text-xl flex-shrink-0">{room.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{room.guest?.fullName || 'Guest'}</p>
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusConf.bg, border: `1px solid ${statusConf.border}` }}
                          >
                            <StatusIcon size={10} style={{ color: statusConf.color }} />
                            <span className="text-[10px] font-semibold" style={{ color: statusConf.color }}>{statusConf.label}</span>
                          </div>
                        </div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>{room.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                          ₹{formatINR(balance)} {balance > 0 ? 'due' : 'settled'}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/bill/room/${room.id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95"
                        style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                      >
                        <FileText size={12} />
                        View Bill
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Check-outs */}
          {todayCheckouts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                  Today's Check-outs
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(192,83,58,0.12)', color: '#C0533A' }}>
                  {todayCheckouts.length}
                </span>
              </div>
              <div className="space-y-2">
                {todayCheckouts.map(room => {
                  const total = calculateTotal(room);
                  const balance = total - room.amountPaid;
                  const statusConf = STATUS_CONFIG[room.paymentStatus];
                  const StatusIcon = statusConf.icon;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                      style={{ background: '#FFFDF9', border: '1.5px solid rgba(192,83,58,0.2)', boxShadow: '0 1px 6px rgba(192,83,58,0.06)' }}
                    >
                      <span className="text-xl flex-shrink-0">{room.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>{room.guest?.fullName || 'Guest'}</p>
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusConf.bg, border: `1px solid ${statusConf.border}` }}
                          >
                            <StatusIcon size={10} style={{ color: statusConf.color }} />
                            <span className="text-[10px] font-semibold" style={{ color: statusConf.color }}>{statusConf.label}</span>
                          </div>
                        </div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>{room.name}</p>
                        <p className="text-xs mt-0.5 font-semibold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                          {balance > 0 ? `₹${formatINR(balance)} due` : '✓ Fully paid'}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/bill/room/${room.id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)', color: 'white' }}
                      >
                        <Download size={12} />
                        View Bill
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {occupiedRooms.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <p className="text-2xl mb-2">🏔️</p>
              <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No active guests</p>
              <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>Check in guests to see billing</p>
            </div>
          )}
        </>
      )}

      {/* ── FILTERED VIEWS (unpaid / partial / paid) ── */}
      {filter !== 'advance' && filter !== 'all' && (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <p className="text-2xl mb-2">🏔️</p>
              <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No {filter} rooms</p>
              <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(room => {
                const total = calculateTotal(room);
                const balance = total - room.amountPaid;
                const statusConf = STATUS_CONFIG[room.paymentStatus];
                const StatusIcon = statusConf.icon;
                return (
                  <button
                    key={room.id}
                    onClick={() => router.push(`/rooms/${room.id}?tab=billing`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 4px rgba(28,58,42,0.04)' }}
                  >
                    <span className="text-xl flex-shrink-0">{room.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{room.name}</p>
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: statusConf.bg, border: `1px solid ${statusConf.border}` }}
                        >
                          <StatusIcon size={10} style={{ color: statusConf.color }} />
                          <span className="text-[10px] font-semibold" style={{ color: statusConf.color }}>{statusConf.label}</span>
                        </div>
                      </div>
                      <p className="text-xs truncate" style={{ color: '#7A7A6E' }}>{room.guest?.fullName || 'Unknown guest'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs" style={{ color: '#7A7A6E' }}>Total: ₹{formatINR(total)}</span>
                        <span className="text-xs" style={{ color: '#3E6B47' }}>Paid: ₹{formatINR(room.amountPaid)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <IndianRupee size={12} style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }} />
                        <span className="text-sm font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                          {formatINR(balance)}
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: '#7A7A6E' }}>balance</p>
                      <ChevronRight size={14} className="ml-auto mt-1" style={{ color: '#7A7A6E' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
