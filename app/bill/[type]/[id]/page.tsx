'use client';

import { use, useRef, useState } from 'react';
import { useHomestay, calculateTotal, calculateGroupTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Pencil, Download, Loader2 } from 'lucide-react';

const ROOM_META: Record<string, { emoji: string; label: string }> = {
  'room-gushaini':    { emoji: '🏡', label: 'Room (Gushaini)' },
  'room-banjar':      { emoji: '🌄', label: 'Room (Banjar)' },
  'rooftop-gushaini': { emoji: '🏔️', label: 'RooftopCottage (Gushaini)' },
  'rooftop-banjar':   { emoji: '⛺', label: 'RooftopCottage (Banjar)' },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-0"
      style={{ borderBottom: '1px solid rgba(28,58,42,0.07)' }}
    >
      <span className="text-[13px]" style={{ color: '#5A5A52' }}>{label}</span>
      <span className="text-[13px]" style={{ fontWeight: bold ? '700' : '500', color: color || '#1A1A1A' }}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-1 pb-1.5" style={{ borderBottom: '2px solid #1C3A2A' }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1C3A2A' }}>
        {children}
      </p>
    </div>
  );
}

export default function BillPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params);
  const router = useRouter();
  const { rooms, groupBookings } = useHomestay();
  const billRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const room = type === 'room' ? rooms.find(r => r.id === id) : null;
  const booking = type === 'booking' ? groupBookings.find(b => b.id === id) : null;

  if (!room && !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-base font-semibold" style={{ color: '#1C3A2A' }}>Booking not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: '#D4873A' }}>
          Go back
        </button>
      </div>
    );
  }

  // Derived data ─ single room
  const rNights = room?.checkInDate && room?.checkOutDate
    ? Math.max(1, Math.ceil((new Date(room.checkOutDate).getTime() - new Date(room.checkInDate).getTime()) / 86400000))
    : 0;
  const rRoomCharge = room ? rNights * room.nightlyRate : 0;
  const rItemsTotal = room?.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0) ?? 0;
  const rTotal = room ? calculateTotal(room) : 0;
  const rBalance = room ? Math.max(0, rTotal - room.amountPaid) : 0;

  // Derived data ─ group booking
  const bRoomCharge = booking
    ? Object.entries(booking.roomRates).reduce((s, [, r]) => s + r * booking.nights, 0)
    : 0;
  const bItemsTotal = booking?.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0) ?? 0;
  const bTotal = booking ? calculateGroupTotal(booking) : 0;
  const bBalance = booking ? Math.max(0, bTotal - booking.amountPaid) : 0;

  const guestName = room?.guest?.fullName ?? booking?.guestName ?? '—';
  const guestPhone = room?.guest?.phone ?? booking?.phone ?? '—';
  const adults = room?.guest?.adults ?? booking?.adults ?? 0;
  const children = room?.guest?.children ?? booking?.children ?? 0;
  const checkIn = room?.checkInDate ?? booking?.checkInDate;
  const checkOut = room?.checkOutDate ?? booking?.checkOutDate;
  const nights = room ? rNights : (booking?.nights ?? 0);
  const items = room?.items ?? booking?.items ?? [];
  const roomCharge = room ? rRoomCharge : bRoomCharge;
  const itemsTotal = room ? rItemsTotal : bItemsTotal;
  const grandTotal = room ? rTotal : bTotal;
  const amountPaid = room?.amountPaid ?? booking?.amountPaid ?? 0;
  const balance = room ? rBalance : bBalance;
  const bookingId = id.slice(-8).toUpperCase();

  const editHref = type === 'room' ? `/rooms/${id}?tab=items` : `/bookings/${id}?tab=food`;

  const handleDownload = async () => {
    if (!billRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Capture only the bill element, not the whole page
      const el = billRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210; // mm
      const A4_H = 297; // mm
      // Scale image to fit A4 width with margins
      const margin = 10;
      const imgW = A4_W - margin * 2;
      const imgH = (canvas.height / canvas.width) * imgW;
      // If taller than A4, scale down proportionally
      const finalW = imgH > A4_H - margin * 2 ? ((A4_H - margin * 2) / imgH) * imgW : imgW;
      const finalH = imgH > A4_H - margin * 2 ? A4_H - margin * 2 : imgH;
      pdf.addImage(imgData, 'JPEG', margin, margin, finalW, finalH);
      pdf.save(`Bill_${guestName.replace(/\s+/g, '_')}_${bookingId}.pdf`);
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Top action bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 gap-3"
        style={{
          background: 'rgba(247,243,238,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(28,58,42,0.08)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl transition-all active:scale-90"
          style={{ background: 'rgba(28,58,42,0.08)' }}
        >
          <ArrowLeft size={18} style={{ color: '#1C3A2A' }} />
        </button>

        <p className="text-sm font-bold flex-1 text-center" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
          Bill Preview
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(editHref)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? 'Saving…' : 'Download'}
          </button>
        </div>
      </div>

      {/* Bill body */}
      <div className="px-4 py-5">
        <div
          ref={billRef}
          className="rounded-2xl overflow-hidden mx-auto"
          style={{ maxWidth: '480px', background: '#ffffff', boxShadow: '0 4px 24px rgba(28,58,42,0.12)' }}
        >
          {/* Bill header */}
          <div
            className="px-6 py-7 text-center"
            style={{ background: 'linear-gradient(135deg, #1C3A2A 0%, #2A5A40 100%)' }}
          >
            {/* Mountain icon accent */}
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,135,58,0.25)', border: '1px solid rgba(212,135,58,0.35)' }}>
                <span className="text-2xl">🏔️</span>
              </div>
            </div>
            <h1
              className="text-3xl font-bold text-white"
              style={{ fontFamily: 'var(--font-playfair)', letterSpacing: '0.01em' }}
            >
              The Pahadi Ghar
            </h1>
            <p className="text-xs text-white/60 mt-1">Your Himalayan Retreat · Tirthan Valley, HP</p>
            <div className="w-16 h-px mx-auto mt-4" style={{ background: 'rgba(212,135,58,0.5)' }} />
          </div>

          {/* Meta row */}
          <div
            className="flex items-center justify-between px-6 py-2.5"
            style={{ background: 'rgba(28,58,42,0.04)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
          >
            <p className="text-[11px]" style={{ color: '#7A7A6E' }}>
              Generated: {format(new Date(), 'd MMM yyyy, h:mm a')}
            </p>
            <p className="text-[11px] font-semibold" style={{ color: '#1C3A2A' }}>
              ID: #{bookingId}
            </p>
          </div>

          {/* Bill content */}
          <div className="px-6 pb-6">

            {/* Guest Information */}
            <SectionTitle>Guest Information</SectionTitle>
            <Row label="Full Name" value={guestName} />
            <Row label="Phone Number" value={guestPhone ? `+91 ${guestPhone}` : '—'} />
            <Row
              label="Guests"
              value={`${adults} Adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''}`}
            />

            {/* Room Details */}
            <SectionTitle>Room Details</SectionTitle>
            {type === 'room' && room && (
              <>
                <Row label="Room" value={`${ROOM_META[room.id]?.emoji || ''} ${room.name}`} />
                <Row label="Check-in" value={checkIn ? format(parseISO(checkIn), 'd MMM yyyy') : '—'} />
                <Row label="Check-out" value={checkOut ? format(parseISO(checkOut), 'd MMM yyyy') : '—'} />
                <Row label="Duration" value={`${nights} Night${nights !== 1 ? 's' : ''}`} />
                <Row label="Nightly Rate" value={`₹${formatINR(room.nightlyRate)}`} />
                <Row label="Room Charge" value={`₹${formatINR(roomCharge)}`} bold />
              </>
            )}
            {type === 'booking' && booking && (
              <>
                {booking.roomIds.map(rid => (
                  <Row
                    key={rid}
                    label={`${ROOM_META[rid]?.emoji || ''} ${ROOM_META[rid]?.label || rid}`}
                    value={`${booking.nights} nights × ₹${formatINR(booking.roomRates[rid] ?? 0)}`}
                  />
                ))}
                <Row label="Check-in" value={checkIn ? format(parseISO(checkIn), 'd MMM yyyy') : '—'} />
                <Row label="Check-out" value={checkOut ? format(parseISO(checkOut), 'd MMM yyyy') : '—'} />
                <Row label="Duration" value={`${nights} Night${nights !== 1 ? 's' : ''}`} />
                <Row label="Room Charges" value={`₹${formatINR(roomCharge)}`} bold />
              </>
            )}

            {/* Meals & Services */}
            {items.length > 0 && (
              <>
                <SectionTitle>Meals &amp; Services</SectionTitle>
                {items.map(item => (
                  <Row
                    key={item.id}
                    label={`${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`}
                    value={`₹${formatINR(item.quantity * item.pricePerUnit)}`}
                  />
                ))}
                <div
                  className="flex items-center justify-between py-2 mt-1"
                  style={{ borderBottom: '1px solid rgba(28,58,42,0.07)' }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: '#5A5A52' }}>Subtotal</span>
                  <span className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>
                    ₹{formatINR(itemsTotal)}
                  </span>
                </div>
              </>
            )}

            {/* Payment Summary */}
            <SectionTitle>Payment Details</SectionTitle>
            <Row label="Room Charges" value={`₹${formatINR(roomCharge)}`} />
            {itemsTotal > 0 && <Row label="Meals & Services" value={`₹${formatINR(itemsTotal)}`} />}

            {/* Total divider */}
            <div className="mt-3 mb-1">
              <div style={{ borderTop: '2px solid #1C3A2A' }} />
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[14px] font-bold" style={{ color: '#1C3A2A' }}>Grand Total</span>
              <span className="text-[16px] font-bold" style={{ color: '#1C3A2A', fontFamily: 'var(--font-playfair)' }}>
                ₹{formatINR(grandTotal)}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(28,58,42,0.12)' }} className="mb-1" />

            <Row label="Amount Paid" value={`₹${formatINR(amountPaid)}`} color="#3E6B47" />
            <div
              className="flex items-center justify-between py-3 px-4 rounded-xl mt-2"
              style={{
                background: balance > 0 ? 'rgba(192,83,58,0.08)' : 'rgba(62,107,71,0.1)',
                border: `1px solid ${balance > 0 ? 'rgba(192,83,58,0.25)' : 'rgba(62,107,71,0.25)'}`,
              }}
            >
              <span className="text-[13px] font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                {balance > 0 ? 'Balance Due' : '✓ Fully Paid'}
              </span>
              <span className="text-[15px] font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                ₹{formatINR(balance)}
              </span>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="w-12 h-0.5 rounded-full mx-auto mb-3" style={{ background: 'rgba(28,58,42,0.15)' }} />
              <p className="text-[11px]" style={{ color: '#7A7A6E' }}>Thank you for staying with us 🌲</p>
              <p className="text-[10px] mt-1" style={{ color: '#AAAAAA' }}>The Pahadi Ghar · Tirthan Valley, Himachal Pradesh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
