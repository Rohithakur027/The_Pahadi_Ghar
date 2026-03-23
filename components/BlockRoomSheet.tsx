'use client';

import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useHomestay } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import {
  format, parseISO, startOfDay, isWithinInterval, differenceInCalendarDays,
} from 'date-fns';
import { X, ChevronLeft, ChevronRight, Phone, Lock } from 'lucide-react';
import { BlockedBooking, PaymentMethod, MealPlan } from '@/types';
import toast from 'react-hot-toast';
import BookingConfirmationModal, { ConfirmedBookingData } from './BookingConfirmationModal';

const MEAL_PLANS: { id: MealPlan; label: string; icon: string }[] = [
  { id: 'room_only',        label: 'Room Only',          icon: '🛏️' },
  { id: 'breakfast',        label: 'Breakfast',          icon: '☕' },
  { id: 'breakfast_dinner', label: 'Breakfast + Dinner', icon: '🍽️' },
  { id: 'all_meals',        label: 'All Meals',          icon: '🥘' },
];

export const ROOM_COLORS: Record<string, { dot: string; bg: string; label: string; emoji: string }> = {
  'room-gushaini':    { dot: '#3E6B47', bg: 'rgba(62,107,71,0.15)',  label: 'Room (Gushaini)',       emoji: '🏡' },
  'room-banjar':      { dot: '#2563EB', bg: 'rgba(37,99,235,0.12)',  label: 'Room (Banjar)',         emoji: '🌄' },
  'rooftop-gushaini': { dot: '#D4873A', bg: 'rgba(212,135,58,0.18)', label: 'RooftopCottage (Gushaini)', emoji: '🏔️' },
  'rooftop-banjar':   { dot: '#1C3A2A', bg: 'rgba(28,58,42,0.15)',   label: 'RooftopCottage (Banjar)',   emoji: '⛺' },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

type WizardStep = 1 | 2 | 3 | 4 | 'confirm';
type SheetTab = 'view' | 'book' | 'block';

interface MaintenanceBlockForm {
  selectedRoomIds: string[];
  checkInDate: Date | null;
  checkOutDate: Date | null;
  reason: string;
}

interface BlockFormData {
  selectedRoomIds: string[];
  checkInDate: Date | null;
  checkOutDate: Date | null;
  guestName: string;
  phone: string;
  adults: number;
  children: number;
  specialRequests: string;
  totalAmount: string;
  advancePaid: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  mealPlan: MealPlan;
}

interface Props {
  selectedDate: Date;
  onClose: () => void;
  activeTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
}

export default function BlockRoomSheet({ selectedDate, onClose, activeTab, onTabChange }: Props) {
  const { rooms, blockedBookings, addBlockedBooking, cancelBlockedBooking, checkInFromBlock } = useHomestay();
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'checkin' | 'cancel'; bookingId: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBookingData | null>(null);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceBlockForm>({
    selectedRoomIds: [],
    checkInDate: selectedDate,
    checkOutDate: null,
    reason: '',
  });

  const emptyForm = (): BlockFormData => ({
    selectedRoomIds: [],
    checkInDate: selectedDate,
    checkOutDate: null,
    guestName: '',
    phone: '',
    adults: 1,
    children: 0,
    specialRequests: '',
    totalAmount: '',
    advancePaid: '',
    paymentMethod: 'cash',
    transactionId: '',
    mealPlan: 'room_only',
  });

  const [form, setForm] = useState<BlockFormData>(emptyForm);

  const occupiedOnDate = useMemo(() => rooms.filter(r => {
    if (!r.checkInDate || !r.guest) return false;
    const ci = startOfDay(parseISO(r.checkInDate));
    const co = r.checkOutDate ? startOfDay(parseISO(r.checkOutDate)) : ci;
    return isWithinInterval(startOfDay(selectedDate), { start: ci, end: co });
  }), [rooms, selectedDate]);

  const blockedOnDate = useMemo(() => blockedBookings.filter(b => {
    if (b.status !== 'blocked') return false;
    const ci = startOfDay(parseISO(b.checkInDate));
    const co = startOfDay(parseISO(b.checkOutDate));
    return isWithinInterval(startOfDay(selectedDate), { start: ci, end: co });
  }), [blockedBookings, selectedDate]);

  const unavailableRoomIds = useMemo(() => {
    const occupied = occupiedOnDate.map(r => r.id);
    const blocked = blockedOnDate.flatMap(b => b.roomIds);
    return new Set([...occupied, ...blocked]);
  }, [occupiedOnDate, blockedOnDate]);

  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, differenceInCalendarDays(form.checkOutDate, form.checkInDate))
    : 0;

  const totalAmt = parseFloat(form.totalAmount) || 0;
  const advanceAmt = parseFloat(form.advancePaid) || 0;
  const balanceDue = totalAmt - advanceAmt;

  const canStep1 = form.selectedRoomIds.length > 0;
  const canStep2 = !!(form.checkInDate && form.checkOutDate && nights > 0);
  const canStep3 = form.guestName.trim().length > 0;
  const canStep4 = totalAmt > 0;
  const canConfirm = canStep1 && canStep2 && canStep3 && canStep4;

  const stepLabel = (s: WizardStep) => {
    if (s === 1) return 'Select Rooms';
    if (s === 2) return 'Dates';
    if (s === 3) return 'Guest Details';
    if (s === 4) return 'Payment';
    return 'Confirm';
  };

  const toggleRoom = (roomId: string) => {
    if (unavailableRoomIds.has(roomId)) return;
    setForm(f => ({
      ...f,
      selectedRoomIds: f.selectedRoomIds.includes(roomId)
        ? f.selectedRoomIds.filter(id => id !== roomId)
        : [...f.selectedRoomIds, roomId],
    }));
  };

  const goNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep('confirm');
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
    else if (step === 'confirm') setStep(4);
  };

  const canGoNext = () => {
    if (step === 1) return canStep1;
    if (step === 2) return canStep2;
    if (step === 3) return canStep3;
    if (step === 4) return canStep4;
    return canConfirm;
  };

  const handleSave = () => {
    if (!canConfirm || !form.checkInDate || !form.checkOutDate) return;

    const checkIn  = format(form.checkInDate,  'yyyy-MM-dd');
    const checkOut = format(form.checkOutDate, 'yyyy-MM-dd');
    const balance  = Math.max(0, balanceDue);

    addBlockedBooking({
      roomIds: form.selectedRoomIds,
      guestName: form.guestName.trim(),
      phone: form.phone.trim(),
      adults: form.adults,
      children: form.children,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      totalAmount: totalAmt,
      advancePaid: advanceAmt,
      balanceDue: balance,
      paymentMethod: form.paymentMethod,
      transactionId: form.transactionId.trim() || undefined,
      specialRequests: form.specialRequests.trim() || undefined,
      mealPlan: form.mealPlan,
      status: 'blocked',
      blockType: 'advance',
    });

    toast.success(`🔒 ${form.guestName} — ${form.selectedRoomIds.length} room${form.selectedRoomIds.length > 1 ? 's' : ''} blocked`);

    // Show booking confirmation instead of closing immediately
    const ref = crypto.randomUUID().slice(-8).toUpperCase();
    setConfirmedBooking({
      bookingRef: ref,
      guestName: form.guestName.trim(),
      phone: form.phone.trim(),
      adults: form.adults,
      children: form.children,
      roomIds: form.selectedRoomIds,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      totalAmount: totalAmt,
      advancePaid: advanceAmt,
      balanceDue: balance,
      mealPlan: form.mealPlan,
      specialRequests: form.specialRequests.trim() || undefined,
      paymentMethod: form.paymentMethod,
      transactionId: form.transactionId.trim() || undefined,
    });
  };

  const handleCheckIn = (bookingId: string) => {
    const result = checkInFromBlock(bookingId);
    if (!result) return;
    toast.success(`✓ ${result.guestName} checked in`);
    setConfirmDialog(null);
    onClose();
    router.push(`/rooms/${result.firstRoomId}`);
  };

  const handleCancelBooking = (bookingId: string) => {
    cancelBlockedBooking(bookingId);
    toast('Booking cancelled', { icon: '🗑️' });
    setConfirmDialog(null);
  };

  const handleTabChange = (tab: SheetTab) => {
    onTabChange(tab);
    if (tab === 'book') {
      setStep(1);
      setForm(emptyForm());
    }
    if (tab === 'block') {
      setMaintenanceForm({ selectedRoomIds: [], checkInDate: selectedDate, checkOutDate: null, reason: '' });
    }
  };

  const maintenanceNights = maintenanceForm.checkInDate && maintenanceForm.checkOutDate
    ? Math.max(0, differenceInCalendarDays(maintenanceForm.checkOutDate, maintenanceForm.checkInDate))
    : 0;

  const canSaveMaintenance = maintenanceForm.selectedRoomIds.length > 0
    && !!maintenanceForm.checkInDate && !!maintenanceForm.checkOutDate
    && maintenanceNights > 0 && maintenanceForm.reason.trim().length > 0;

  const handleMaintenanceBlock = () => {
    if (!canSaveMaintenance || !maintenanceForm.checkInDate || !maintenanceForm.checkOutDate) return;
    addBlockedBooking({
      roomIds: maintenanceForm.selectedRoomIds,
      guestName: 'Maintenance Block',
      phone: '',
      adults: 0,
      children: 0,
      checkInDate: format(maintenanceForm.checkInDate, 'yyyy-MM-dd'),
      checkOutDate: format(maintenanceForm.checkOutDate, 'yyyy-MM-dd'),
      nights: maintenanceNights,
      totalAmount: 0,
      advancePaid: 0,
      balanceDue: 0,
      paymentMethod: 'cash',
      specialRequests: maintenanceForm.reason.trim(),
      mealPlan: 'room_only',
      status: 'blocked',
      blockType: 'maintenance',
      maintenanceReason: maintenanceForm.reason.trim(),
    });
    toast.success(`🔧 Room${maintenanceForm.selectedRoomIds.length > 1 ? 's' : ''} blocked for maintenance`);
    setShowMaintenanceConfirm(false);
    onClose();
  };

  const stepNum = step === 'confirm' ? 4 : Number(step);

  return (
    <>
      {/* Content rendered inline — layout handled by the parent page */}
      <div className="px-4 pb-10 pt-2">

          {/* ─── VIEW TAB ─── */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              {occupiedOnDate.length === 0 && blockedOnDate.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-3xl mb-3">🌿</p>
                  <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>No bookings on this date</p>
                  <p className="text-xs mt-1 mb-5" style={{ color: '#7A7A6E' }}>All rooms available</p>
                  <button
                    onClick={() => handleTabChange('book')}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}
                  >
                    + Book a Room
                  </button>
                </div>
              )}

              {/* Occupied rooms */}
              {occupiedOnDate.map(room => {
                const config = ROOM_COLORS[room.id];
                const isCI = room.checkInDate && format(parseISO(room.checkInDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isCO = room.checkOutDate && format(parseISO(room.checkOutDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={room.id}
                    onClick={() => { onClose(); router.push(`/rooms/${room.id}`); }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={{ background: config?.bg || 'rgba(28,58,42,0.05)', border: `1.5px solid ${config?.dot}40` }}
                  >
                    <span className="text-xl">{room.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{room.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#7A7A6E' }}>
                        {room.guest?.fullName}
                        {isCI && <span style={{ color: '#3E6B47' }}> · Check-in</span>}
                        {isCO && <span style={{ color: '#C0533A' }}> · Check-out</span>}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(62,107,71,0.15)', color: '#2D5235' }}
                    >
                      Occupied
                    </span>
                  </button>
                );
              })}

              {/* Blocked bookings */}
              {blockedOnDate.map(booking => {
                const roomNames = booking.roomIds
                  .map(id => `${ROOM_COLORS[id]?.emoji} ${ROOM_COLORS[id]?.label}`)
                  .join(', ');
                return (
                  <div
                    key={booking.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ border: '1.5px dashed rgba(212,135,58,0.6)', background: 'rgba(212,135,58,0.04)' }}
                  >
                    <div className="p-4 space-y-3">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(212,135,58,0.15)' }}
                          >
                            <Lock size={14} style={{ color: '#D4873A' }} />
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{roomNames}</p>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(212,135,58,0.15)', color: '#A36520' }}
                        >
                          Advance Booked
                        </span>
                      </div>

                      {/* Phone + WhatsApp */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: '#1C3A2A' }}>+91 {booking.phone}</span>
                        <a
                          href={`https://wa.me/91${booking.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-bold"
                          style={{ color: '#25D366' }}
                        >
                          WhatsApp
                        </a>
                      </div>

                      {/* Dates row */}
                      <div className="flex items-center gap-2">
                        {[
                          { label: 'Check-in', value: format(parseISO(booking.checkInDate), 'd MMM') },
                          { label: '→', value: null },
                          { label: 'Check-out', value: format(parseISO(booking.checkOutDate), 'd MMM') },
                          { label: 'Nights', value: String(booking.nights) },
                        ].map((item, i) =>
                          item.value === null ? (
                            <span key={i} style={{ color: '#7A7A6E', fontSize: 14 }}>→</span>
                          ) : (
                            <div key={i} className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(28,58,42,0.06)' }}>
                              <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>{item.label}</p>
                              <p className="text-xs font-bold mt-0.5" style={{ color: '#1C3A2A' }}>{item.value}</p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Financials */}
                      <div className="flex gap-2">
                        {[
                          { label: 'Total', value: booking.totalAmount, color: '#1C3A2A' },
                          { label: 'Paid', value: booking.advancePaid, color: '#3E6B47' },
                          { label: 'Balance', value: booking.balanceDue, color: booking.balanceDue > 0 ? '#C0533A' : '#3E6B47' },
                        ].map(f => (
                          <div key={f.label} className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(28,58,42,0.05)' }}>
                            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>{f.label}</p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: f.color }}>₹{formatINR(f.value)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setConfirmDialog({ type: 'cancel', bookingId: booking.id })}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A', border: '1px solid rgba(192,83,58,0.2)' }}
                        >
                          Cancel Booking
                        </button>
                        <button
                          onClick={() => setConfirmDialog({ type: 'checkin', bookingId: booking.id })}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                        >
                          Check In Now →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── BOOK ROOMS TAB ─── */}
          {activeTab === 'book' && (
            <div>
              {/* Progress bar */}
              {step !== 'confirm' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: '#7A7A6E' }}>Step {stepNum} of 4</p>
                    <p className="text-xs font-semibold" style={{ color: '#1C3A2A' }}>{stepLabel(step)}</p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(28,58,42,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        background: 'linear-gradient(90deg, #D4873A, #E8A55A)',
                        width: `${(stepNum / 4) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 1 — Select Rooms ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="mb-4">
                    <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                      Select Rooms to Block
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                      Tap to select · Multiple rooms allowed for group bookings
                    </p>
                  </div>
                  {Object.entries(ROOM_COLORS).map(([roomId, config]) => {
                    const isSelected = form.selectedRoomIds.includes(roomId);
                    const isUnavailable = unavailableRoomIds.has(roomId);
                    return (
                      <button
                        key={roomId}
                        onClick={() => toggleRoom(roomId)}
                        disabled={isUnavailable}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(212,135,58,0.1)' : 'rgba(28,58,42,0.04)',
                          border: isSelected
                            ? '2px solid rgba(212,135,58,0.55)'
                            : '2px solid rgba(28,58,42,0.1)',
                          opacity: isUnavailable ? 0.45 : 1,
                          transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                        }}
                      >
                        <span className="text-2xl">{config.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: isUnavailable ? '#7A7A6E' : '#1A1A1A' }}>
                            {config.label}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: isUnavailable ? '#C0533A' : '#3E6B47' }}>
                            {isUnavailable ? 'Already occupied / blocked' : '● Available'}
                          </p>
                        </div>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150"
                          style={{
                            background: isSelected ? '#D4873A' : 'rgba(28,58,42,0.1)',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          }}
                        >
                          {isSelected && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 2 — Dates ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                      Booking Dates
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                      Set check-in and check-out dates
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>
                        Check-in
                      </label>
                      <DatePicker
                        selected={form.checkInDate}
                        onChange={(date: Date | null) =>
                          setForm(f => ({
                            ...f,
                            checkInDate: date,
                            checkOutDate: f.checkOutDate && date && f.checkOutDate <= date ? null : f.checkOutDate,
                          }))
                        }
                        dateFormat="d MMM yyyy"
                        minDate={new Date()}
                        className="block-datepicker"
                        placeholderText="Pick date"
                        popperPlacement="bottom-start"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>
                        Check-out
                      </label>
                      <DatePicker
                        selected={form.checkOutDate}
                        onChange={(date: Date | null) => setForm(f => ({ ...f, checkOutDate: date }))}
                        dateFormat="d MMM yyyy"
                        minDate={form.checkInDate ? new Date(form.checkInDate.getTime() + 86400000) : new Date()}
                        className="block-datepicker"
                        placeholderText="Pick date"
                        disabled={!form.checkInDate}
                        popperPlacement="bottom-end"
                      />
                    </div>
                  </div>

                  {nights > 0 && (
                    <div
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(212,135,58,0.1)', border: '1px solid rgba(212,135,58,0.3)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: '#A36520' }}>
                        🌙 {nights} night{nights !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-bold" style={{ color: '#D4873A' }}>
                        {form.checkInDate && format(form.checkInDate, 'd MMM')}
                        {' → '}
                        {form.checkOutDate && format(form.checkOutDate, 'd MMM')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3 — Guest Details ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                      Guest Details
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>Person who made the advance booking</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      value={form.guestName}
                      onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                      placeholder="Full name"
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
                      style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                      Phone Number (optional)
                    </label>
                    <div className="flex gap-2">
                      <div
                        className="flex items-center px-3 py-3 rounded-xl border text-sm font-semibold flex-shrink-0"
                        style={{ background: 'rgba(28,58,42,0.06)', borderColor: 'rgba(28,58,42,0.2)', color: '#7A7A6E' }}
                      >
                        +91
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        placeholder="10-digit number"
                        className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none"
                        style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>Adults</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setForm(f => ({ ...f, adults: Math.max(1, f.adults - 1) }))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >−</button>
                        <span className="flex-1 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{form.adults}</span>
                        <button
                          onClick={() => setForm(f => ({ ...f, adults: f.adults + 1 }))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>Children</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setForm(f => ({ ...f, children: Math.max(0, f.children - 1) }))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >−</button>
                        <span className="flex-1 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{form.children}</span>
                        <button
                          onClick={() => setForm(f => ({ ...f, children: f.children + 1 }))}
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {/* Meal Plan */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Meal Plan</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MEAL_PLANS.map(mp => (
                        <button
                          key={mp.id}
                          onClick={() => setForm(f => ({ ...f, mealPlan: mp.id }))}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
                          style={{
                            background: form.mealPlan === mp.id ? 'rgba(212,135,58,0.15)' : 'rgba(28,58,42,0.04)',
                            border: `1.5px solid ${form.mealPlan === mp.id ? 'rgba(212,135,58,0.5)' : 'rgba(28,58,42,0.1)'}`,
                            color: form.mealPlan === mp.id ? '#A36520' : '#7A7A6E',
                          }}
                        >
                          <span>{mp.icon}</span>
                          <span className="text-xs">{mp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                      Special Requests (optional)
                    </label>
                    <textarea
                      value={form.specialRequests}
                      onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                      placeholder="Dietary needs, early check-in, etc."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none resize-none"
                      style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 4 — Financial Details ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                      Financial Details
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>Booking amount and advance received</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                      Total Booking Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#7A7A6E' }}>₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.totalAmount}
                        onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border text-sm focus:outline-none"
                        style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                      Advance Paid (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#7A7A6E' }}>₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.advancePaid}
                        onChange={e => {
                          const val = e.target.value;
                          const total = parseFloat(form.totalAmount) || 0;
                          const advance = parseFloat(val) || 0;
                          if (total > 0 && advance > total) return;
                          setForm(f => ({ ...f, advancePaid: val }));
                        }}
                        placeholder="0"
                        max={parseFloat(form.totalAmount) || undefined}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border text-sm focus:outline-none"
                        style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                      />
                    </div>
                  </div>

                  {/* Live balance due */}
                  {form.totalAmount && (
                    <div
                      className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: balanceDue > 0 ? 'rgba(192,83,58,0.08)' : 'rgba(62,107,71,0.1)',
                        border: `1px solid ${balanceDue > 0 ? 'rgba(192,83,58,0.2)' : 'rgba(62,107,71,0.25)'}`,
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: '#7A7A6E' }}>Balance Due</span>
                      <span className="text-base font-bold" style={{ color: balanceDue > 0 ? '#C0533A' : '#3E6B47' }}>
                        ₹{formatINR(Math.max(0, balanceDue))}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>
                      Advance Payment Method
                    </label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'bank_transfer'] as PaymentMethod[]).map(method => (
                        <button
                          key={method}
                          onClick={() => setForm(f => ({ ...f, paymentMethod: method }))}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: form.paymentMethod === method ? '#1C3A2A' : 'rgba(28,58,42,0.07)',
                            color: form.paymentMethod === method ? '#FFFDF9' : '#7A7A6E',
                          }}
                        >
                          {method === 'cash' ? '💵 Cash' : method === 'upi' ? '📱 UPI' : '🏦 Bank'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(form.paymentMethod === 'upi' || form.paymentMethod === 'bank_transfer') && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                        {form.paymentMethod === 'upi' ? 'UPI Reference / Transaction ID' : 'Bank Transaction ID'}
                      </label>
                      <input
                        type="text"
                        value={form.transactionId}
                        onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
                        placeholder="Reference number"
                        className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
                        style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── CONFIRM STEP ── */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                      Review & Confirm
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>Check all details before saving</p>
                  </div>

                  <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.12)' }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7A6E' }}>Rooms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.selectedRoomIds.map(id => (
                          <span
                            key={id}
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: `${ROOM_COLORS[id]?.dot}22`, color: ROOM_COLORS[id]?.dot, border: `1px solid ${ROOM_COLORS[id]?.dot}40` }}
                          >
                            {ROOM_COLORS[id]?.emoji} {ROOM_COLORS[id]?.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7A7A6E' }}>Dates</p>
                      <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                        {form.checkInDate && format(form.checkInDate, 'd MMM yyyy')}
                        {' → '}
                        {form.checkOutDate && format(form.checkOutDate, 'd MMM yyyy')}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{nights} night{nights !== 1 ? 's' : ''}</p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7A7A6E' }}>Meal Plan</p>
                      <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                        {MEAL_PLANS.find(m => m.id === form.mealPlan)?.icon}{' '}
                        {MEAL_PLANS.find(m => m.id === form.mealPlan)?.label}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7A7A6E' }}>Guest</p>
                      <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{form.guestName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                        +91 {form.phone} · {form.adults} adult{form.adults !== 1 ? 's' : ''}
                        {form.children > 0 ? `, ${form.children} child${form.children !== 1 ? 'ren' : ''}` : ''}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7A6E' }}>Financials</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Total', value: totalAmt, color: '#1C3A2A' },
                          { label: 'Advance', value: advanceAmt, color: '#3E6B47' },
                          { label: 'Balance', value: Math.max(0, balanceDue), color: balanceDue > 0 ? '#C0533A' : '#3E6B47' },
                        ].map(f => (
                          <div key={f.label} className="rounded-xl px-2 py-2 text-center" style={{ background: 'rgba(28,58,42,0.06)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>{f.label}</p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: f.color }}>₹{formatINR(f.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!canConfirm}
                    className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
                    style={{
                      background: canConfirm ? 'linear-gradient(135deg, #D4873A, #E8A55A)' : 'rgba(28,58,42,0.12)',
                      color: canConfirm ? 'white' : '#7A7A6E',
                    }}
                  >
                    🔒 Confirm Block
                  </button>

                  <button
                    onClick={goBack}
                    className="w-full py-2 text-sm font-medium transition-all"
                    style={{ color: '#7A7A6E' }}
                  >
                    ← Edit Details
                  </button>
                </div>
              )}

              {/* Navigation */}
              {step !== 'confirm' && (
                <div className="flex gap-3 mt-6 pb-2">
                  {step > 1 && (
                    <button
                      onClick={goBack}
                      className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                      style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                    >
                      <ChevronLeft size={16} />
                      Back
                    </button>
                  )}
                  <button
                    onClick={goNext}
                    disabled={!canGoNext()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                    style={{
                      background: canGoNext() ? 'linear-gradient(135deg, #1C3A2A, #2A5A40)' : 'rgba(28,58,42,0.12)',
                      color: canGoNext() ? 'white' : '#7A7A6E',
                    }}
                  >
                    {step === 4 ? 'Review →' : <>Next <ChevronRight size={16} /></>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── BLOCK (MAINTENANCE) TAB ─── */}
          {activeTab === 'block' && (
            <div className="space-y-4">
              <div className="mb-2">
                <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                  Block for Maintenance
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                  Block rooms for repairs, cleaning, or other work
                </p>
              </div>

              {/* Room selection */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>
                  Select Rooms *
                </p>
                {Object.entries(ROOM_COLORS).map(([roomId, config]) => {
                  const isSelected = maintenanceForm.selectedRoomIds.includes(roomId);
                  const isUnavailable = unavailableRoomIds.has(roomId);
                  return (
                    <button
                      key={roomId}
                      onClick={() => {
                        if (isUnavailable) return;
                        setMaintenanceForm(f => ({
                          ...f,
                          selectedRoomIds: f.selectedRoomIds.includes(roomId)
                            ? f.selectedRoomIds.filter(id => id !== roomId)
                            : [...f.selectedRoomIds, roomId],
                        }));
                      }}
                      disabled={isUnavailable}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                      style={{
                        background: isSelected ? 'rgba(192,83,58,0.08)' : 'rgba(28,58,42,0.04)',
                        border: isSelected ? '2px solid rgba(192,83,58,0.4)' : '2px solid rgba(28,58,42,0.1)',
                        opacity: isUnavailable ? 0.45 : 1,
                      }}
                    >
                      <span className="text-xl">{config.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: isUnavailable ? '#7A7A6E' : '#1A1A1A' }}>
                          {config.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: isUnavailable ? '#C0533A' : '#7A7A6E' }}>
                          {isUnavailable ? 'Already booked / blocked' : 'Available'}
                        </p>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: isSelected ? '#C0533A' : 'rgba(28,58,42,0.1)' }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>
                    From *
                  </label>
                  <DatePicker
                    selected={maintenanceForm.checkInDate}
                    onChange={(date: Date | null) =>
                      setMaintenanceForm(f => ({
                        ...f,
                        checkInDate: date,
                        checkOutDate: f.checkOutDate && date && f.checkOutDate <= date ? null : f.checkOutDate,
                      }))
                    }
                    dateFormat="d MMM yyyy"
                    className="block-datepicker"
                    placeholderText="Start date"
                    popperPlacement="bottom-start"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>
                    To *
                  </label>
                  <DatePicker
                    selected={maintenanceForm.checkOutDate}
                    onChange={(date: Date | null) => setMaintenanceForm(f => ({ ...f, checkOutDate: date }))}
                    dateFormat="d MMM yyyy"
                    minDate={maintenanceForm.checkInDate ? new Date(maintenanceForm.checkInDate.getTime() + 86400000) : new Date()}
                    className="block-datepicker"
                    placeholderText="End date"
                    disabled={!maintenanceForm.checkInDate}
                    popperPlacement="bottom-end"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>
                  Reason for blocking *
                </label>
                <textarea
                  value={maintenanceForm.reason}
                  onChange={e => setMaintenanceForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Painting work, plumbing repair, deep cleaning…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none resize-none"
                  style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' }}
                />
              </div>

              <button
                onClick={() => setShowMaintenanceConfirm(true)}
                disabled={!canSaveMaintenance}
                className="w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  background: canSaveMaintenance ? 'linear-gradient(135deg, #C0533A, #D4663A)' : 'rgba(28,58,42,0.12)',
                  color: canSaveMaintenance ? 'white' : '#7A7A6E',
                }}
              >
                🔧 Block Rooms
              </button>
            </div>
          )}
      </div>

      {/* Maintenance block confirmation */}
      {showMaintenanceConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center px-6 fade-overlay"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
        >
          <div className="w-full rounded-2xl p-6 space-y-4" style={{ maxWidth: '320px', background: '#FFFDF9' }}>
            <div className="text-center">
              <p className="text-3xl mb-2">🔧</p>
              <p className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                Block Rooms?
              </p>
              <p className="text-sm mt-2" style={{ color: '#7A7A6E' }}>
                Block{' '}
                <strong style={{ color: '#1A1A1A' }}>
                  {maintenanceForm.selectedRoomIds.map(id => ROOM_COLORS[id]?.emoji + ' ' + ROOM_COLORS[id]?.label).join(', ')}
                </strong>{' '}
                for <strong style={{ color: '#C0533A' }}>{maintenanceForm.reason}</strong>?
              </p>
              {maintenanceForm.checkInDate && maintenanceForm.checkOutDate && (
                <p className="text-xs mt-1.5" style={{ color: '#7A7A6E' }}>
                  {format(maintenanceForm.checkInDate, 'd MMM')} → {format(maintenanceForm.checkOutDate, 'd MMM')}
                  {' · '}{maintenanceNights} night{maintenanceNights !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <p className="text-xs text-center px-2" style={{ color: '#7A7A6E' }}>
              These rooms will be unavailable for guest bookings during this period.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMaintenanceConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(28,58,42,0.08)', color: '#7A7A6E' }}
              >
                Go Back
              </button>
              <button
                onClick={handleMaintenanceBlock}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #C0533A, #D4663A)' }}
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      {confirmDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center px-6 fade-overlay"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 60 }}
        >
          <div className="w-full rounded-2xl p-6" style={{ maxWidth: '320px', background: '#FFFDF9' }}>
            {confirmDialog.type === 'checkin' ? (
              <>
                <div className="text-center mb-5">
                  <p className="text-3xl mb-2">🏨</p>
                  <p className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                    Check In Now?
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#7A7A6E' }}>
                    Check in{' '}
                    <strong style={{ color: '#1A1A1A' }}>
                      {blockedBookings.find(b => b.id === confirmDialog.bookingId)?.guestName}
                    </strong>{' '}
                    and mark room{blockedBookings.find(b => b.id === confirmDialog.bookingId)?.roomIds && blockedBookings.find(b => b.id === confirmDialog.bookingId)!.roomIds.length > 1 ? 's' : ''} as Occupied?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(28,58,42,0.08)', color: '#7A7A6E' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCheckIn(confirmDialog.bookingId)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                  >
                    Check In ✓
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-3xl mb-2">⚠️</p>
                  <p className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                    Cancel Booking?
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#7A7A6E' }}>
                    This will remove the block and free the room. The advance paid will need to be refunded manually.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(28,58,42,0.08)', color: '#7A7A6E' }}
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => handleCancelBooking(confirmDialog.bookingId)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(192,83,58,0.12)', color: '#C0533A', border: '1px solid rgba(192,83,58,0.3)' }}
                  >
                    Cancel It
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Booking Confirmation Modal ── */}
      {confirmedBooking && (
        <BookingConfirmationModal
          data={confirmedBooking}
          onClose={() => {
            setConfirmedBooking(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
