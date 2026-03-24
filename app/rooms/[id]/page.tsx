'use client';

import { use, useState, useMemo } from 'react';
import { useHomestay, calculateTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import GuestForm from '@/components/GuestForm';
import ItemsList from '@/components/ItemsList';
import BillingSummary from '@/components/BillingSummary';
import { Guest, OrderItem, NoteCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, BedDouble, ShoppingBag, Receipt,
  ToggleLeft, ToggleRight, Moon, AlertCircle,
  Plus, X, StickyNote, Trash2, Users, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type Tab = 'overview' | 'food' | 'notes' | 'billing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BedDouble size={15} /> },
  { id: 'food',     label: 'Food',     icon: <ShoppingBag size={15} /> },
  { id: 'notes',    label: 'Notes',    icon: <StickyNote size={15} /> },
  { id: 'billing',  label: 'Billing',  icon: <Receipt size={15} /> },
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
  const { rooms, groupBookings, updateRoom, addItem, removeItem, addNote, removeNote, updateGuest, recordPayment, checkIn, checkOut, createGroupBooking } = useHomestay();

  const room = rooms.find(r => r.id === id);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  // Notes tab state
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general');
  const [showCheckInForm, setShowCheckInForm] = useState(false);

  // Check-in form state
  const [checkInDate, setCheckInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nightlyRate, setNightlyRate] = useState(room?.nightlyRate?.toString() || '2500');
  const [ciErrors, setCiErrors] = useState<{ checkOut?: string; rate?: string }>({});

  const [showEditGuestForm, setShowEditGuestForm] = useState(false);
  const [showRoomEdit, setShowRoomEdit] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [editCoDateObj, setEditCoDateObj] = useState<Date | null>(null);

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

  const isCheckoutToday = room.checkOutDate === format(new Date(), 'yyyy-MM-dd');
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
      setActiveTab('overview');
    }
  };

  const handleCheckOut = () => {
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

        {/* ─── TAB: OVERVIEW (Room + Guest merged) ─── */}
        {activeTab === 'overview' && (
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
                        Fill in guest details below ↓
                      </p>
                      <button onClick={() => { setShowCheckInForm(false); setMultiRoom(false); setExtraRoomIds([]); }} className="w-full py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(28,58,42,0.06)', color: '#7A7A6E' }}>
                        Cancel
                      </button>
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
                  ) : showRoomEdit ? (
                    /* ── Edit mode: change checkout date ── */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>Edit Booking</p>
                        <button
                          onClick={() => { setShowRoomEdit(false); setEditCoDateObj(null); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#7A7A6E' }}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.1)' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>Check-in (fixed)</p>
                          <p className="text-sm font-bold" style={{ color: '#1C3A2A' }}>{room.checkInDate ? format(new Date(room.checkInDate), 'd MMM yyyy') : '—'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1.5" style={{ color: '#7A7A6E' }}>New Check-out</label>
                          <DatePicker
                            selected={editCoDateObj ?? (room.checkOutDate ? new Date(room.checkOutDate) : null)}
                            onChange={(d: Date | null) => setEditCoDateObj(d)}
                            dateFormat="d MMM yyyy"
                            minDate={room.checkInDate ? new Date(new Date(room.checkInDate).getTime() + 86400000) : new Date()}
                            className="block-datepicker"
                            placeholderText="Pick date"
                            popperPlacement="bottom-end"
                            renderDayContents={(day, date) => {
                              const today = new Date(); today.setHours(0,0,0,0);
                              const isPast = date ? date < today : false;
                              const isBeforeCI = room.checkInDate ? date! <= new Date(room.checkInDate) : false;
                              const isDisabled = isPast || isBeforeCI;
                              return (
                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                  {day}
                                  {isDisabled && (
                                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(192,83,58,0.5)', fontSize: '1.4em', fontWeight: 300, pointerEvents: 'none', lineHeight: 1 }}>
                                      /
                                    </span>
                                  )}
                                </div>
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Nightly Rate (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                          <input type="number" value={nightlyRate} onChange={e => setNightlyRate(e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-xl border bg-white text-sm focus:outline-none" style={{ borderColor: 'rgba(28,58,42,0.15)' }} />
                        </div>
                      </div>
                      {editCoDateObj && room.checkInDate && (() => {
                        const newNights = Math.max(1, Math.ceil((editCoDateObj.getTime() - new Date(room.checkInDate).getTime()) / 86400000));
                        const rate = parseFloat(nightlyRate) || room.nightlyRate;
                        return (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.1)', border: '1px solid rgba(212,135,58,0.25)' }}>
                            <Moon size={14} style={{ color: '#D4873A' }} />
                            <span className="text-sm" style={{ color: '#A36520' }}>{newNights} night{newNights !== 1 ? 's' : ''} · ₹{formatINR(newNights * rate)}</span>
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => {
                          const newCoStr = editCoDateObj ? format(editCoDateObj, 'yyyy-MM-dd') : room.checkOutDate!;
                          updateRoom(room.id, { checkOutDate: newCoStr, nightlyRate: parseFloat(nightlyRate) || room.nightlyRate });
                          setShowRoomEdit(false);
                          setEditCoDateObj(null);
                          toast.success('Booking updated');
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                      >
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    /* ── Static view ── */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Booking Details</p>
                        <button
                          onClick={() => setShowRoomEdit(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                          style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}
                        >
                          ✎ Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.08)' }}>
                          <p className="text-[11px] font-medium mb-0.5" style={{ color: '#7A7A6E' }}>Check-in</p>
                          <p className="text-sm font-bold" style={{ color: '#1C3A2A' }}>{room.checkInDate ? format(new Date(room.checkInDate), 'd MMM') : '—'}</p>
                          <p className="text-[11px]" style={{ color: '#7A7A6E' }}>{room.checkInDate ? format(new Date(room.checkInDate), 'yyyy') : ''}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: isCheckoutToday ? 'rgba(212,135,58,0.1)' : 'rgba(28,58,42,0.04)', border: `1px solid ${isCheckoutToday ? 'rgba(212,135,58,0.3)' : 'rgba(28,58,42,0.08)'}` }}>
                          <p className="text-[11px] font-medium mb-0.5" style={{ color: '#7A7A6E' }}>Check-out</p>
                          <p className="text-sm font-bold" style={{ color: isCheckoutToday ? '#A36520' : '#1C3A2A' }}>{room.checkOutDate ? format(new Date(room.checkOutDate), 'd MMM') : '—'}</p>
                          <p className="text-[11px]" style={{ color: isCheckoutToday ? '#D4873A' : '#7A7A6E' }}>{isCheckoutToday ? 'Today' : room.checkOutDate ? format(new Date(room.checkOutDate), 'yyyy') : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.08)', border: '1px solid rgba(212,135,58,0.18)' }}>
                        <div className="flex items-center gap-2">
                          <Moon size={14} style={{ color: '#D4873A' }} />
                          <span className="text-sm" style={{ color: '#A36520' }}>{nights} night{nights !== 1 ? 's' : ''} · ₹{formatINR(room.nightlyRate)}/night</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#A36520' }}>₹{formatINR(nights * room.nightlyRate)}</span>
                      </div>
                      {/* WhatsApp review request — only for today's checkouts */}
                      {isCheckoutToday && (
                        <a
                          href={`https://wa.me/${room.guest?.phone ? `91${room.guest.phone}` : ''}?text=${encodeURIComponent(`Hi ${room.guest?.fullName ?? 'there'}, thank you for staying with us at The Pahadi Ghar! We'd love it if you could spare a moment to share your experience: https://g.page/r/CUb6p8ca71MEEBE/review 🙏`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95"
                          style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E', border: '1px solid rgba(37,211,102,0.3)' }}
                        >
                          <WhatsAppIcon size={16} />
                          Send Review Request on WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Guest section (inline, below room info) ── */}

            {/* Vacant — prompt */}
            {room.status === 'vacant' && !showCheckInForm && (
              <div className="rounded-2xl p-4 text-center" style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A7A6E' }}>Guest</p>
                <p className="text-sm" style={{ color: '#7A7A6E' }}>No guest yet — check in above</p>
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

            {/* Check-in form: guest details */}
            {showCheckInForm && !groupBooking && (
              <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#7A7A6E' }}>Guest Details</p>
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
                              <WhatsAppIcon size={12} />
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

            {/* ── Mark as Checked Out — bottom of overview ── */}
            {room.status === 'occupied' && !groupBooking && (
              <button
                onClick={() => setShowCheckoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(192,83,58,0.08)', color: '#C0533A', border: '1.5px solid rgba(192,83,58,0.2)' }}
              >
                <ToggleLeft size={17} />
                Mark as Checked Out
              </button>
            )}
          </div>
        )}

        {/* ─── TAB: FOOD ─── */}
        {activeTab === 'food' && (
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

        {/* ─── TAB: NOTES ─── */}
        {activeTab === 'notes' && (
          <div className="space-y-4 page-enter">
            {/* Add note form */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>Add Staff Note</p>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'food',      label: '🍽 Food Pref',    color: '#3E6B47', bg: 'rgba(62,107,71,0.1)' },
                  { id: 'request',   label: '✋ Request',       color: '#D4873A', bg: 'rgba(212,135,58,0.1)' },
                  { id: 'transport', label: '🚗 Transport',     color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                  { id: 'general',   label: '📝 General',       color: '#7A7A6E', bg: 'rgba(28,58,42,0.07)' },
                ] as { id: NoteCategory; label: string; color: string; bg: string }[]).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setNoteCategory(cat.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: noteCategory === cat.id ? cat.bg : 'rgba(28,58,42,0.04)',
                      color: noteCategory === cat.id ? cat.color : '#7A7A6E',
                      border: `1.5px solid ${noteCategory === cat.id ? cat.color + '40' : 'rgba(28,58,42,0.1)'}`,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder={
                  noteCategory === 'food'      ? 'e.g. Guest is vegetarian, no onion/garlic…' :
                  noteCategory === 'request'   ? 'e.g. Extra blanket needed, wants early check-in…' :
                  noteCategory === 'transport' ? 'e.g. Needs taxi tomorrow at 8 AM to Aut…' :
                  'e.g. VIP guest, celebrating anniversary…'
                }
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 transition-all"
                style={{ borderColor: 'rgba(28,58,42,0.15)', background: '#fff', lineHeight: 1.5 }}
              />

              <button
                onClick={() => {
                  if (!noteText.trim()) return;
                  addNote(room.id, { text: noteText.trim(), category: noteCategory });
                  setNoteText('');
                  toast.success('Note added');
                }}
                disabled={!noteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
              >
                <Plus size={15} />
                Save Note
              </button>
            </div>

            {/* Notes list */}
            {(room.notes || []).length === 0 ? (
              <div className="text-center py-8">
                <StickyNote size={32} className="mx-auto mb-2 opacity-20" style={{ color: '#7A7A6E' }} />
                <p className="text-sm" style={{ color: '#7A7A6E' }}>No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...(room.notes || [])].reverse().map(note => {
                  const catMeta = {
                    food:      { label: 'Food Pref',  color: '#3E6B47', bg: 'rgba(62,107,71,0.08)'    },
                    request:   { label: 'Request',    color: '#D4873A', bg: 'rgba(212,135,58,0.08)'  },
                    transport: { label: 'Transport',  color: '#3B82F6', bg: 'rgba(59,130,246,0.08)'  },
                    general:   { label: 'General',    color: '#7A7A6E', bg: 'rgba(28,58,42,0.05)'    },
                  }[note.category];
                  return (
                    <div
                      key={note.id}
                      className="rounded-xl p-3.5"
                      style={{ background: catMeta.bg, border: `1px solid ${catMeta.color}20` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md" style={{ background: catMeta.color + '18', color: catMeta.color }}>
                              {catMeta.label}
                            </span>
                            <span className="text-[11px]" style={{ color: '#AAAAAA' }}>
                              {format(parseISO(note.addedAt), 'd MMM, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: '#1C3A2A' }}>{note.text}</p>
                        </div>
                        <button
                          onClick={() => removeNote(room.id, note.id)}
                          className="p-1.5 rounded-lg flex-shrink-0 transition-all active:scale-90"
                          style={{ color: '#C0533A', background: 'rgba(192,83,58,0.08)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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

      {/* ── Checkout confirmation modal ── */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9', boxShadow: '0 20px 60px rgba(28,58,42,0.25)' }}>
            <div className="text-center mb-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(192,83,58,0.1)' }}>
                <ToggleLeft size={26} style={{ color: '#C0533A' }} />
              </div>
              <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                Check out {room.guest?.fullName}?
              </h3>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(28,58,42,0.55)' }}>
                This will mark the room as vacant. Make sure the bill is settled before checking out.
              </p>
            </div>
            {balance > 0 && (
              <div className="mt-3 px-4 py-2.5 rounded-xl text-center" style={{ background: 'rgba(192,83,58,0.07)', border: '1px solid rgba(192,83,58,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#C0533A' }}>₹{formatINR(balance)} balance due</p>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCheckoutConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold"
                style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowCheckoutConfirm(false); handleCheckOut(); }}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold"
                style={{ background: '#C0533A', color: '#fff' }}
              >
                Yes, Check Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
