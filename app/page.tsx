'use client';

import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { TrendingUp, TrendingDown, Users, LogIn, LogOut, IndianRupee, Mountain, Activity, Lock, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { BlockedBooking } from '@/types';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  checkin: <LogIn size={14} style={{ color: '#3E6B47' }} />,
  checkout: <LogOut size={14} style={{ color: '#C0533A' }} />,
  payment: <IndianRupee size={14} style={{ color: '#D4873A' }} />,
  item: <Activity size={14} style={{ color: '#7A7A6E' }} />,
  guest: <Users size={14} style={{ color: '#7A7A6E' }} />,
};

const ROOM_LABELS: Record<string, string> = {
  'room-gushaini': '🏡 Room (Gushaini)',
  'room-banjar': '🌄 Room (Banjar)',
  'rooftop-gushaini': '🏔️ Rooftop (Gushaini)',
  'rooftop-banjar': '⛺ Rooftop (Banjar)',
};

export default function Dashboard() {
  const { rooms, activityLog, getMonthlyRevenue, blockedBookings, checkInFromBlock } = useHomestay();
  const router = useRouter();

  const now = new Date();
  const thisMonthRevenue = getMonthlyRevenue(now.getFullYear(), now.getMonth());
  const lastMonthRevenue = getMonthlyRevenue(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );

  const revenueChange = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : null;

  const today = format(now, 'yyyy-MM-dd');
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const checkInsToday = rooms.filter(r => r.checkInDate?.startsWith(today)).length;
  const checkOutsToday = rooms.filter(r => r.checkOutDate?.startsWith(today)).length;

  // Count distinct blocked rooms
  const activeBlockedRoomIds = new Set(
    blockedBookings
      .filter(b => b.status === 'blocked')
      .flatMap(b => b.roomIds)
  );

  // Upcoming blocked in next 7 days
  const upcomingBlocked: BlockedBooking[] = blockedBookings
    .filter(b => {
      if (b.status !== 'blocked') return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      const in7 = startOfDay(addDays(now, 7));
      return isWithinInterval(ci, { start: startOfDay(now), end: in7 });
    })
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))
    .slice(0, 5);

  return (
    <div className="page-enter px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mountain size={18} style={{ color: '#D4873A' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>
              Tirthan Valley
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            The Pahadi Ghar
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium" style={{ color: '#7A7A6E' }}>
            {format(now, 'EEE, d MMM')}
          </p>
          <p className="text-xs" style={{ color: '#7A7A6E' }}>
            {format(now, 'yyyy')}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1C3A2A 0%, #2A5A40 60%, #3E6B47 100%)',
          boxShadow: '0 8px 32px rgba(28,58,42,0.3)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: '#D4873A' }} />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10" style={{ background: '#D4873A' }} />

        <p className="text-xs font-semibold uppercase tracking-widest mb-1 opacity-70 text-white">
          {format(now, 'MMMM yyyy')} Revenue
        </p>
        <div className="flex items-end justify-between">
          <p className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
            ₹{formatINR(thisMonthRevenue)}
          </p>
          {revenueChange !== null && (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{ background: revenueChange >= 0 ? 'rgba(212,135,58,0.25)' : 'rgba(192,83,58,0.25)' }}
            >
              {revenueChange >= 0
                ? <TrendingUp size={13} style={{ color: '#E8C07A' }} />
                : <TrendingDown size={13} style={{ color: '#E8907A' }} />
              }
              <span className="text-xs font-semibold" style={{ color: revenueChange >= 0 ? '#E8C07A' : '#E8907A' }}>
                {Math.abs(revenueChange).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <p className="text-xs mt-2 opacity-60 text-white">
          {lastMonthRevenue > 0 ? `Last month: ₹${formatINR(lastMonthRevenue)}` : 'First month tracking'}
        </p>
      </div>

      {/* Quick Stats — 4 tiles */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: 'Occupied', value: `${occupiedRooms.length}/4`,
            icon: <Users size={15} />, color: '#1C3A2A', bg: 'rgba(28,58,42,0.08)',
          },
          {
            label: 'Check-ins', value: checkInsToday,
            icon: <LogIn size={15} />, color: '#3E6B47', bg: 'rgba(62,107,71,0.1)',
          },
          {
            label: 'Check-outs', value: checkOutsToday,
            icon: <LogOut size={15} />, color: '#C0533A', bg: 'rgba(192,83,58,0.09)',
          },
          {
            label: 'Blocked', value: activeBlockedRoomIds.size,
            icon: <Lock size={15} />, color: '#A36520', bg: 'rgba(212,135,58,0.1)',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl p-3 text-center"
            style={{ background: stat.bg }}
          >
            <div className="flex justify-center mb-1" style={{ color: stat.color }}>{stat.icon}</div>
            <p className="text-lg font-bold" style={{ color: stat.color, fontFamily: 'var(--font-playfair)' }}>
              {stat.value}
            </p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: '#7A7A6E' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active Guests */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
          Active Guests
        </h2>
        {occupiedRooms.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
          >
            <p className="text-2xl mb-2">🏔️</p>
            <p className="text-sm" style={{ color: '#7A7A6E' }}>No guests checked in</p>
            <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>The rooms await their first visitors</p>
          </div>
        ) : (
          <div className="space-y-2">
            {occupiedRooms.map(room => {
              const balance = calculateTotal(room) - room.amountPaid;
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
                >
                  <span className="text-xl">{room.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                      {room.guest?.fullName || 'Guest'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                      {room.name} · in {room.checkInDate ? format(new Date(room.checkInDate), 'd MMM') : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                      ₹{formatINR(balance)}
                    </p>
                    <p className="text-[11px]" style={{ color: '#7A7A6E' }}>due</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Check-ins */}
      {(() => {
        const todayStr = format(now, 'yyyy-MM-dd');
        const todayBlocked = blockedBookings.filter(b => b.status === 'blocked' && b.checkInDate === todayStr);
        if (todayBlocked.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck size={16} style={{ color: '#3E6B47' }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                Today's Check-ins
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}>
                {todayBlocked.length}
              </span>
            </div>
            <div className="space-y-2">
              {todayBlocked.map(booking => (
                <div
                  key={booking.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFFDF9', border: '1.5px solid rgba(62,107,71,0.3)', boxShadow: '0 2px 12px rgba(62,107,71,0.1)' }}
                >
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                          {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ml-2" style={{ background: 'rgba(62,107,71,0.12)', color: '#2D5235' }}>
                        {booking.roomIds.length} Room{booking.roomIds.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 text-xs" style={{ color: '#7A7A6E' }}>
                        {booking.nights} night{booking.nights !== 1 ? 's' : ''} · Check-out {format(parseISO(booking.checkOutDate), 'd MMM')}
                      </div>
                      {booking.balanceDue > 0 && (
                        <span className="text-xs font-semibold" style={{ color: '#C0533A' }}>₹{new Intl.NumberFormat('en-IN').format(booking.balanceDue)} due</span>
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
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                    >
                      <LogIn size={15} />
                      Check In Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Upcoming Blocked Rooms */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Upcoming Bookings
          </h2>
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}>
            Next 7 days
          </span>
        </div>

        {upcomingBlocked.length === 0 ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
          >
            <p className="text-2xl mb-2">🗓️</p>
            <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No advance bookings</p>
            <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>Go to Calendar to block rooms in advance</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBlocked.map(booking => (
              <button
                key={booking.id}
                onClick={() => router.push('/calendar')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={{
                  background: '#FFFDF9',
                  border: '1.5px dashed rgba(212,135,58,0.4)',
                  boxShadow: '0 1px 6px rgba(28,58,42,0.05)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(212,135,58,0.12)' }}
                >
                  <Lock size={15} style={{ color: '#D4873A' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                    {booking.guestName}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#7A7A6E' }}>
                    {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: '#A36520' }}>
                    {format(parseISO(booking.checkInDate), 'd MMM')}
                  </p>
                  {booking.balanceDue > 0 && (
                    <p className="text-[10px] mt-0.5" style={{ color: '#C0533A' }}>
                      ₹{formatINR(booking.balanceDue)} due
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
          Recent Activity
        </h2>
        {activityLog.length === 0 ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
          >
            <p className="text-sm" style={{ color: '#7A7A6E' }}>No activity yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activityLog.slice(0, 5).map(entry => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.06)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(28,58,42,0.06)' }}
                >
                  {ACTIVITY_ICONS[entry.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#1A1A1A' }}>{entry.message}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#7A7A6E' }}>
                    {format(new Date(entry.timestamp), 'd MMM, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
