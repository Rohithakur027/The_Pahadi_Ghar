'use client';

import { use, useState } from 'react';
import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import GuestForm from '@/components/GuestForm';
import ItemsList from '@/components/ItemsList';
import BillingSummary from '@/components/BillingSummary';
import { Guest, OrderItem } from '@/types';
import { format } from 'date-fns';
import {
  ArrowLeft, BedDouble, UserCheck, ShoppingBag, Receipt,
  ToggleLeft, ToggleRight, Calendar, Moon, AlertCircle,
  Users, ExternalLink, Plus, X, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';

type Tab = 'info' | 'guest' | 'items' | 'billing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'info',    label: 'Room',    icon: <BedDouble size={15} /> },
  { id: 'guest',   label: 'Guest',   icon: <UserCheck size={15} /> },
  { id: 'items',   label: 'Items',   icon: <ShoppingBag size={15} /> },
  { id: 'billing', label: 'Billing', icon: <Receipt size={15} /> },
];

const ROOM_META: Record<string, { emoji: string; label: string }> = {
  'room-gushaini':    { emoji: '🏡', label: 'Room (Gushaini)' },
  'room-banjar':      { emoji: '🌄', label: 'Room (Banjar)' },
  'rooftop-gushaini': { emoji: '🏔️', label: 'RooftopCottage (Gushaini)' },
  'rooftop-banjar':   { emoji: '⛺', label: 'RooftopCottage (Banjar)' },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { rooms, groupBookings, updateRoom, addItem, removeItem, updateGuest, recordPayment, checkIn, checkOut, createGroupBooking } = useHomestay();

  const room = rooms.find(r => r.id === id);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  // Check-in form state
  const [checkInDate, setCheckInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nightlyRate, setNightlyRate] = useState(room?.nightlyRate?.toString() || '2500');
  const [ciErrors, setCiErrors] = useState<{ checkOut?: string; rate?: string }>({});

  const [showEditGuestForm, setShowEditGuestForm] = useState(false);

  // Multi-room state
  const [multiRoom, setMultiRoom] = useState(false);
  const [extraRoomIds, setExtraRoomIds] = useState<string[]>([]);
  const [extraRates, setExtraRates] = useState<Record<string, string>>({});

  // Datepicker dates
  const [ciDateObj, setCiDateObj] = useState<Date | null>(new Date());
  const [coDatObj, setCoDateObj] = useState<Date | null>(null);

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <AlertCircle size={40} style={{ color: '#C0533A' }} className="mb-3" />
        <p className="text-lg font-semibold" style={{ color: '#1C3A2A' }}>Room not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: '#D4873A' }}>Go back</button>
      </div>
    );
  }

  // If room is part of a group booking, show redirect
  const groupBooking = room.groupBookingId ? groupBookings.find(g => g.id === room.groupBookingId) : null;

  const nights = room.checkInDate && room.checkOutDate
    ? Math.max(1, Math.ceil((new Date(room.checkOutDate).getTime() - new Date(room.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const total = calculateTotal(room);
  const balance = total - room.amountPaid;

  const vacantRooms = rooms.filter(r => r.id !== id && r.status === 'vacant');

  const toggleExtraRoom = (roomId: string) => {
    setExtraRoomIds(prev => {
      if (prev.includes(roomId)) {
        const next = prev.filter(r => r !== roomId);
        setExtraRates(er => { const c = { ...er }; delete c[roomId]; return c; });
        return next;
      }
      setExtraRates(er => ({ ...er, [roomId]: rooms.find(r => r.id === roomId)?.nightlyRate?.toString() || '2500' }));
      return [...prev, roomId];
    });
  };

  const nightsCount = ciDateObj && coDatObj
    ? Math.max(0, Math.ceil((coDatObj.getTime() - ciDateObj.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleCheckIn = (guest: Guest) => {
    // Sync date strings from datepicker objects
    const ciStr = ciDateObj ? format(ciDateObj, 'yyyy-MM-dd') : checkInDate;
    const coStr = coDatObj ? format(coDatObj, 'yyyy-MM-dd') : checkOutDate;

    const errs: typeof ciErrors = {};
    if (!coStr) errs.checkOut = 'Check-out date required';
    else if (new Date(coStr) <= new Date(ciStr)) errs.checkOut = 'Must be after check-in';
    if (!nightlyRate || parseFloat(nightlyRate) <= 0) errs.rate = 'Enter a valid rate';
    setCiErrors(errs);
    if (Object.keys(errs).length) return;

    if (multiRoom && extraRoomIds.length > 0) {
      // Create group booking
      const allRoomIds = [id, ...extraRoomIds];
      const roomRates: Record<string, number> = { [id]: parseFloat(nightlyRate) };
      extraRoomIds.forEach(rid => { roomRates[rid] = parseFloat(extraRates[rid] || '2500') || 2500; });
      const nights = Math.max(1, Math.ceil((new Date(coStr).getTime() - new Date(ciStr).getTime()) / (1000 * 60 * 60 * 24)));
      const gbId = createGroupBooking({
        roomIds: allRoomIds, roomRates,
        guestName: guest.fullName, phone: guest.phone,
        adults: guest.adults, children: guest.children,
        checkInDate: ciStr, checkOutDate: coStr, nights,
        specialRequests: guest.specialRequests,
      });
      setShowCheckInForm(false);
      toast.success(`${guest.fullName} checked in — ${allRoomIds.length} rooms 🌲`);
      router.push(`/bookings/${gbId}`);
    } else {
      checkIn(room.id, guest, ciStr, coStr, parseFloat(nightlyRate));
      setShowCheckInForm(false);
      toast.success(`${guest.fullName} checked in! 🌲`);
      setActiveTab('info');
    }
  };

  const handleCheckOut = () => {
    if (!confirm(`Check out ${room.guest?.fullName}?`)) return;
    checkOut(room.id);
    toast.success('Checked out successfully');
    router.push('/rooms');
  };

  const handleUpdateRoom = () => {
    updateRoom(room.id, { nightlyRate: parseFloat(nightlyRate) || room.nightlyRate });
    toast.success('Room details saved');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 pt-5 pb-3"
        style={{ background: 'rgba(247,243,238,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl transition-all active:scale-90" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <ArrowLeft size={18} style={{ color: '#1C3A2A' }} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{room.emoji}</span>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                {room.name}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: room.status === 'occupied' ? 'rgba(212,135,58,0.15)' : 'rgba(62,107,71,0.12)',
                    color: room.status === 'occupied' ? '#A36520' : '#2D5235',
                  }}
                >
                  {room.status === 'occupied' ? 'Occupied' : 'Vacant'}
                </span>
                {room.status === 'occupied' && !groupBooking && (
                  <span className="text-xs" style={{ color: '#7A7A6E' }}>₹{formatINR(balance)} due</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(28,58,42,0.06)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? '#FFFDF9' : 'transparent',
                color: activeTab === tab.id ? '#1C3A2A' : '#7A7A6E',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(28,58,42,0.12)' : 'none',
              }}
            >
              {tab.icon}
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Group booking banner */}
      {groupBooking && (
        <div className="mx-4 mt-4">
          <button
            onClick={() => router.push(`/bookings/${groupBooking.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.25)' }}
          >
            <Users size={18} style={{ color: '#2563EB' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Part of Group Booking</p>
              <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                {groupBooking.guestName} · {groupBooking.roomIds.length} rooms · Manage together
              </p>
            </div>
            <ExternalLink size={15} style={{ color: '#2563EB' }} />
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="px-4 pt-5 pb-6">

        {/* ─── TAB: ROOM INFO ─── */}
        {activeTab === 'info' && (
          <div className="space-y-5 page-enter">
            <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#7A7A6E' }}>Room Status</p>

              {room.status === 'vacant' ? (
                <div className="space-y-4">
                  {!showCheckInForm ? (
                    <button
                      onClick={() => setShowCheckInForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                    >
                      <ToggleRight size={18} />
                      Check In a Guest
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>New Check-In</p>

                      {/* Dates — react-datepicker */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Check-in</label>
                          <DatePicker
                            selected={ciDateObj}
                            onChange={(d: Date | null) => { setCiDateObj(d); if (d) setCheckInDate(format(d, 'yyyy-MM-dd')); }}
                            dateFormat="d MMM yyyy"
                            className="block-datepicker"
                            placeholderText="Select date"
                            popperPlacement="bottom-start"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Check-out</label>
                          <DatePicker
                            selected={coDatObj}
                            onChange={(d: Date | null) => { setCoDateObj(d); if (d) setCheckOutDate(format(d, 'yyyy-MM-dd')); setCiErrors(p => ({ ...p, checkOut: undefined })); }}
                            dateFormat="d MMM yyyy"
                            minDate={ciDateObj ? new Date(ciDateObj.getTime() + 86400000) : new Date()}
                            className="block-datepicker"
                            placeholderText="Select date"
                            disabled={!ciDateObj}
                            popperPlacement="bottom-end"
                          />
                          {ciErrors.checkOut && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>{ciErrors.checkOut}</p>}
                        </div>
                      </div>

                      {/* Nightly Rate */}
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: '#7A7A6E' }}>
                          Nightly Rate (₹) — {ROOM_META[id]?.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                          <input
                            type="number"
                            placeholder="2500"
                            value={nightlyRate}
                            onChange={e => { setNightlyRate(e.target.value); setCiErrors(p => ({ ...p, rate: undefined })); }}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl border bg-white text-sm focus:outline-none"
                            style={{ borderColor: ciErrors.rate ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
                          />
                        </div>
                        {ciErrors.rate && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>{ciErrors.rate}</p>}
                      </div>

                      {/* Night preview */}
                      {nightsCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.1)', border: '1px solid rgba(212,135,58,0.25)' }}>
                          <Moon size={14} style={{ color: '#D4873A' }} />
                          <span className="text-sm" style={{ color: '#A36520' }}>
                            {nightsCount} nights · ₹{formatINR(nightsCount * (parseFloat(nightlyRate) || 0))}
                          </span>
                        </div>
                      )}

                      {/* Multi-room toggle */}
                      <div>
                        <button
                          onClick={() => { setMultiRoom(v => !v); setExtraRoomIds([]); setExtraRates({}); }}
                          className="flex items-center gap-2 text-sm font-semibold transition-all"
                          style={{ color: multiRoom ? '#C0533A' : '#D4873A' }}
                        >
                          {multiRoom ? <X size={15} /> : <Plus size={15} />}
                          {multiRoom ? 'Single room only' : 'Add more rooms to this booking'}
                        </button>
                      </div>

                      {/* Extra rooms selector */}
                      {multiRoom && vacantRooms.length > 0 && (
                        <div className="space-y-2 pl-1">
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Select additional rooms</p>
                          {vacantRooms.map(vr => {
                            const isSelected = extraRoomIds.includes(vr.id);
                            return (
                              <div key={vr.id}>
                                <button
                                  onClick={() => toggleExtraRoom(vr.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                  style={{
                                    background: isSelected ? 'rgba(212,135,58,0.1)' : 'rgba(28,58,42,0.04)',
                                    border: `1.5px solid ${isSelected ? 'rgba(212,135,58,0.4)' : 'rgba(28,58,42,0.1)'}`,
                                  }}
                                >
                                  <span className="text-lg">{vr.emoji}</span>
                                  <span className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>{vr.name}</span>
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: isSelected ? '#D4873A' : 'rgba(28,58,42,0.1)' }}
                                  >
                                    {isSelected && (
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                                {isSelected && (
                                  <div className="relative mt-1.5 ml-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                                    <input
                                      type="number"
                                      placeholder="Rate/night"
                                      value={extraRates[vr.id] || ''}
                                      onChange={e => setExtraRates(er => ({ ...er, [vr.id]: e.target.value }))}
                                      className="w-full pl-7 pr-3 py-2 rounded-xl border text-sm focus:outline-none"
                                      style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {extraRoomIds.length > 0 && (
                            <p className="text-xs font-semibold px-1" style={{ color: '#3E6B47' }}>
                              ✓ Group booking: {1 + extraRoomIds.length} rooms total
                            </p>
                          )}
                        </div>
                      )}

                      {multiRoom && vacantRooms.length === 0 && (
                        <p className="text-xs px-1" style={{ color: '#7A7A6E' }}>No other vacant rooms available.</p>
                      )}

                      <p className="text-xs font-medium" style={{ color: '#7A7A6E' }}>
                        Fill in guest details below →
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => { setShowCheckInForm(false); setMultiRoom(false); setExtraRoomIds([]); }} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(28,58,42,0.06)', color: '#7A7A6E' }}>
                          Cancel
                        </button>
                        <button onClick={() => setActiveTab('guest')} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}>
                          Add Guest Info →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {groupBooking ? (
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(37,99,235,0.06)' }}>
                      <p className="text-xs font-medium" style={{ color: '#7A7A6E' }}>This room is part of a group booking.</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>Manage billing, food and IDs from the booking page.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,58,42,0.05)' }}>
                          <p className="text-xs" style={{ color: '#7A7A6E' }}>Check-in</p>
                          <p className="text-sm font-semibold mt-0.5" style={{ color: '#1C3A2A' }}>{room.checkInDate ? format(new Date(room.checkInDate), 'd MMM yyyy') : '—'}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,58,42,0.05)' }}>
                          <p className="text-xs" style={{ color: '#7A7A6E' }}>Check-out</p>
                          <p className="text-sm font-semibold mt-0.5" style={{ color: '#1C3A2A' }}>{room.checkOutDate ? format(new Date(room.checkOutDate), 'd MMM yyyy') : '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.1)', border: '1px solid rgba(212,135,58,0.2)' }}>
                        <div className="flex items-center gap-2">
                          <Moon size={14} style={{ color: '#D4873A' }} />
                          <span className="text-sm" style={{ color: '#A36520' }}>{nights} night{nights !== 1 ? 's' : ''} @ ₹{formatINR(room.nightlyRate)}/night</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#A36520' }}>₹{formatINR(nights * room.nightlyRate)}</span>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Nightly Rate</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                            <input type="number" value={nightlyRate} onChange={e => setNightlyRate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl border bg-white text-sm focus:outline-none" style={{ borderColor: 'rgba(28,58,42,0.15)' }} />
                          </div>
                          <button onClick={handleUpdateRoom} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>Save</button>
                        </div>
                      </div>
                    </>
                  )}
                  <button onClick={handleCheckOut} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95" style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A', border: '1px solid rgba(192,83,58,0.25)' }}>
                    <ToggleLeft size={16} />
                    Mark as Checked Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: GUEST ─── */}
        {activeTab === 'guest' && (
          <div className="space-y-5 page-enter">

            {/* Vacant — no check-in form open */}
            {room.status === 'vacant' && !showCheckInForm && (
              <div className="rounded-2xl p-4 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.2)' }}>
                <p className="text-2xl mb-2">👤</p>
                <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Set check-in dates first</p>
                <p className="text-xs mt-1 mb-3" style={{ color: '#7A7A6E' }}>Go to Room tab and set dates before adding a guest</p>
                <button onClick={() => { setActiveTab('info'); setShowCheckInForm(true); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>Set Dates →</button>
              </div>
            )}

            {/* Group booking redirect */}
            {groupBooking && (
              <div className="rounded-2xl p-4 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#1A1A1A' }}>Guest details managed in group booking</p>
                <button onClick={() => router.push(`/bookings/${groupBooking.id}`)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
                  Open Group Booking →
                </button>
              </div>
            )}

            {/* Occupied, no group — check-in form (new guest) */}
            {showCheckInForm && !groupBooking && (
              <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A7A6E' }}>Add Guest</p>
                <GuestForm
                  initialGuest={room.guest}
                  onSave={(guest) => { handleCheckIn(guest); }}
                />
              </div>
            )}

            {/* Occupied, no group, guest saved — saved info view OR edit form */}
            {room.status === 'occupied' && !groupBooking && room.guest && (
              <>
                {showEditGuestForm ? (
                  /* ── Edit form ── */
                  <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Edit Guest Details</p>
                      <button
                        onClick={() => setShowEditGuestForm(false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'rgba(28,58,42,0.08)', color: '#7A7A6E' }}
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                    <GuestForm
                      initialGuest={room.guest}
                      onSave={(guest) => {
                        updateGuest(room.id, guest);
                        toast.success('Guest details saved');
                        setShowEditGuestForm(false);
                      }}
                    />
                  </div>
                ) : (
                  /* ── Saved info card ── */
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Guest Info</p>
                      <button
                        onClick={() => setShowEditGuestForm(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                        style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}
                      >
                        ✎ Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2">
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>Name</p>
                        <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.fullName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs mb-0.5" style={{ color: '#7A7A6E' }}>Phone</p>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold" style={{ color: '#1A1A1A' }}>{room.guest.phone || '—'}</p>
                          {room.guest.phone && (
                            <a
                              href={`https://wa.me/91${room.guest.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-90"
                              style={{ background: 'rgba(37,211,102,0.12)', color: '#128C7E' }}
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>Adults</p>
                        <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.adults}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>Children</p>
                        <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.children}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>ID Type</p>
                        <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.idType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>ID Number</p>
                        <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.idNumber}</p>
                      </div>
                      {room.guest.specialRequests && (
                        <div className="col-span-2">
                          <p className="text-xs" style={{ color: '#7A7A6E' }}>Notes</p>
                          <p className="font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>{room.guest.specialRequests}</p>
                        </div>
                      )}
                      {room.guest.idDocumentBase64 && (
                        <div className="col-span-2">
                          <p className="text-xs mb-1.5" style={{ color: '#7A7A6E' }}>ID Document</p>
                          {room.guest.idDocumentBase64.startsWith('data:image') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={room.guest.idDocumentBase64} alt="ID Document" className="w-full max-h-40 object-cover rounded-xl" />
                          ) : (
                            <span className="text-sm" style={{ color: '#3E6B47' }}>📄 Document uploaded</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── TAB: ITEMS ─── */}
        {activeTab === 'items' && (
          <div className="page-enter">
            {room.status === 'vacant' ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-2xl mb-2">🛒</p>
                <p className="text-sm" style={{ color: '#7A7A6E' }}>Check in a guest first to add items</p>
              </div>
            ) : groupBooking ? (
              <div className="rounded-2xl p-5 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#1A1A1A' }}>Add food/items from the group booking page</p>
                <button onClick={() => router.push(`/bookings/${groupBooking.id}?tab=food`)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>Open Group Booking →</button>
              </div>
            ) : (
              <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A7A6E' }}>Food & Services</p>
                <ItemsList
                  items={room.items}
                  onAdd={(item: Omit<OrderItem, 'id' | 'addedAt'>) => addItem(room.id, item)}
                  onRemove={(itemId: string) => removeItem(room.id, itemId)}
                />
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: BILLING ─── */}
        {activeTab === 'billing' && (
          <div className="page-enter">
            {room.status === 'vacant' ? (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sm" style={{ color: '#7A7A6E' }}>No active billing — room is vacant</p>
              </div>
            ) : groupBooking ? (
              <div className="rounded-2xl p-5 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#1A1A1A' }}>Billing managed in group booking</p>
                <button onClick={() => router.push(`/bookings/${groupBooking.id}?tab=billing`)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>Open Group Booking →</button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/bill/room/${room.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)', boxShadow: '0 3px 12px rgba(212,135,58,0.3)' }}
                >
                  <Receipt size={16} />
                  View &amp; Download Bill
                </button>
                <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A7A6E' }}>Billing Summary</p>
                  <BillingSummary room={room} onRecordPayment={(amount) => recordPayment(room.id, amount)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
