'use client';

import { useState } from 'react';
import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { Mountain, LogIn, Users, UserPlus, Phone } from 'lucide-react';

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import toast from 'react-hot-toast';
import CheckInSheet from '@/components/CheckInSheet';

const ROOM_LABELS: Record<string, string> = {
  'room-gushaini':    '🏡 Room (Gushaini)',
  'room-banjar':      '🌄 Room (Banjar)',
  'rooftop-gushaini': '🏔️ Rooftop (Gushaini)',
  'rooftop-banjar':   '⛺ Rooftop (Banjar)',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default function BookingPage() {
  const { rooms, blockedBookings, groupBookings, checkInFromBlock } = useHomestay();
  const router = useRouter();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Today's blocked check-ins
  const todayBlocked = blockedBookings.filter(b => b.status === 'blocked' && b.checkInDate === todayStr && b.blockType !== 'maintenance');

  // Active group bookings
  const activeGroups = groupBookings.filter(g => g.status === 'active');

  // Active single-room bookings (occupied, no group booking)
  const activeSingle = rooms.filter(r => r.status === 'occupied' && !r.groupBookingId);

  // Upcoming blocked in next 7 days (excluding today)
  const upcomingBlocked = blockedBookings
    .filter(b => {
      if (b.status !== 'blocked') return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      return isWithinInterval(ci, { start: startOfDay(addDays(now, 1)), end: startOfDay(addDays(now, 7)) });
    })
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  const hasActive = activeGroups.length > 0 || activeSingle.length > 0;

  return (
    <div className="page-enter px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mountain size={16} style={{ color: '#D4873A' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>Property</span>
        </div>
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Bookings
          </h1>
        </div>
      </div>

      {/* Walk-in Check-in */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>Walk-in Check-in</p>
          <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>Check in directly</p>
        </div>
        <button
          onClick={() => setShowCheckIn(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)', boxShadow: '0 3px 10px rgba(212,135,58,0.3)' }}
        >
          <UserPlus size={15} />
          Check In
        </button>
      </div>

      {/* Active Bookings */}
      {hasActive && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Active Bookings
          </h2>
          <div className="space-y-2">
            {/* Group bookings */}
            {activeGroups.map(gb => (
              <div
                key={gb.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
              >
                <button
                  onClick={() => router.push(`/bookings/${gb.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.1)' }}>
                    <Users size={18} style={{ color: '#2563EB' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold truncate" style={{ color: '#1A1A1A' }}>{gb.guestName}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
                        {gb.roomIds.length} rooms
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#7A7A6E' }}>
                      {gb.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                      Out {format(parseISO(gb.checkOutDate), 'd MMM')} · {gb.nights} nights
                    </p>
                  </div>
                </button>
                {gb.phone && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`tel:+91${gb.phone.replace(/\D/g, '')}`}
                      onClick={e => e.stopPropagation()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(62,107,71,0.12)', color: '#2D5235' }}
                    >
                      <Phone size={15} />
                    </a>
                    <a
                      href={`https://wa.me/91${gb.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${gb.guestName}!`)}`}
                      onClick={e => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}
                    >
                      <WhatsAppIcon size={15} />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {/* Single room bookings */}
            {activeSingle.map(room => (
              <div
                key={room.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
              >
                <button
                  onClick={() => router.push(`/rooms/${room.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <span className="text-2xl flex-shrink-0">{room.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1A1A1A' }}>{room.guest?.fullName || 'Guest'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{room.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                      Out {room.checkOutDate ? format(new Date(room.checkOutDate), 'd MMM') : '—'}
                    </p>
                  </div>
                </button>
                {room.guest?.phone && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`tel:+91${room.guest.phone.replace(/\D/g, '')}`}
                      onClick={e => e.stopPropagation()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(62,107,71,0.12)', color: '#2D5235' }}
                    >
                      <Phone size={15} />
                    </a>
                    <a
                      href={`https://wa.me/91${room.guest.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${room.guest.fullName}!`)}`}
                      onClick={e => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}
                    >
                      <WhatsAppIcon size={15} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Bookings (blocked, not yet checked in) */}
      {todayBlocked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Today's Bookings</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}>{todayBlocked.length}</span>
          </div>
          <div className="space-y-2">
            {todayBlocked.map(booking => (
              <div
                key={booking.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(62,107,71,0.2)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#7A7A6E' }}>
                    {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                    {booking.nights} night{booking.nights !== 1 ? 's' : ''} · Out {format(parseISO(booking.checkOutDate), 'd MMM')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {booking.phone && (
                    <a
                      href={`tel:+91${booking.phone.replace(/\D/g, '')}`}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(62,107,71,0.12)', color: '#2D5235' }}
                    >
                      <Phone size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const result = checkInFromBlock(booking.id);
                      if (!result) return;
                      toast.success(`✓ ${result.guestName} checked in`);
                      if (result.groupBookingId) router.push(`/bookings/${result.groupBookingId}`);
                      else router.push(`/rooms/${result.firstRoomId}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                  >
                    <LogIn size={13} />
                    Check In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bookings */}
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
            className="rounded-2xl p-6 text-center"
            style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
          >
            <p className="text-2xl mb-2">🗓️</p>
            <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No upcoming bookings</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#7A7A6E' }}>Tap + New Booking to block rooms in advance</p>
            <button
              onClick={() => router.push('/calendar')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}
            >
              Open Calendar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBlocked.map(booking => (
              <div
                key={booking.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', boxShadow: '0 1px 6px rgba(28,58,42,0.05)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#7A7A6E' }}>
                    {booking.roomIds.map(id => ROOM_LABELS[id] || id).join(', ')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                    {booking.nights} night{booking.nights !== 1 ? 's' : ''} · In {format(parseISO(booking.checkInDate), 'd MMM')} → Out {format(parseISO(booking.checkOutDate), 'd MMM')}
                  </p>
                </div>
                {booking.phone && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`tel:+91${booking.phone.replace(/\D/g, '')}`}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(62,107,71,0.12)', color: '#2D5235' }}
                    >
                      <Phone size={15} />
                    </a>
                    <a
                      href={`https://wa.me/91${booking.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${booking.guestName}!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}
                    >
                      <WhatsAppIcon size={15} />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state when nothing at all */}
      {!hasActive && todayBlocked.length === 0 && upcomingBlocked.length === 0 && (
        <div className="rounded-2xl p-8 text-center -mt-2" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
          <p className="text-3xl mb-3">🏔️</p>
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>No bookings yet</p>
          <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>Tap + New Booking to get started</p>
        </div>
      )}

      {/* Walk-in check-in sheet */}
      {showCheckIn && <CheckInSheet onClose={() => setShowCheckIn(false)} />}
    </div>
  );
}
