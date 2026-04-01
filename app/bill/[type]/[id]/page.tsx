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
  const pdfRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

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

  const handleWhatsApp = async () => {
    setSendingWa(true);
    // Download the bill PDF first so guest gets the file
    await handleDownload();
    // Build WhatsApp URL with simple message
    const phone = guestPhone.replace(/\D/g, '');
    const normalizedPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const text =
      `Dear ${guestName},\n\n` +
      `Your bill from The Pahadi Ghar, Tirthan Valley is ready.\n\n` +
      `Please check your bill receipt.`;
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`, '_blank');
    setSendingWa(false);
  };

  const handleDownload = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFMod = await import('jspdf');
      const jsPDF = (jsPDFMod as any).jsPDF ?? jsPDFMod.default;

      const el = pdfRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        x: 0, y: 0, scrollX: 0, scrollY: 0,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210;
      const A4_H = 297;
      const margin = 10;
      const imgW = A4_W - margin * 2;
      const pageHeightMm = A4_H - margin * 2;
      // How many canvas pixels fit in one page height
      const pageHeightPx = Math.floor((pageHeightMm / imgW) * canvas.width);

      let yOffset = 0;
      let pageIndex = 0;
      while (yOffset < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceImgH = (sliceH / canvas.width) * imgW;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, sliceImgH);
        yOffset += sliceH;
        pageIndex++;
      }
      pdf.save(`Bill_${guestName.replace(/\s+/g, '_')}_${bookingId}.pdf`);
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
          {/* Edit */}
          <button
            onClick={() => router.push(editHref)}
            title="Edit"
            className="p-2.5 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(28,58,42,0.08)' }}
          >
            <Pencil size={17} style={{ color: '#1C3A2A' }} />
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download PDF"
            className="p-2.5 rounded-xl transition-all active:scale-90"
            style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}
          >
            {downloading
              ? <Loader2 size={17} className="animate-spin text-white" />
              : <Download size={17} className="text-white" />}
          </button>
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            disabled={sendingWa}
            title="Send on WhatsApp"
            className="p-2.5 rounded-xl transition-all active:scale-90"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            {sendingWa
              ? <Loader2 size={17} className="animate-spin text-white" />
              : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
          </button>
        </div>
      </div>

      {/* ── Hidden PDF capture div (off-screen) ── */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <div ref={pdfRef} style={{ width: 595, background: '#ffffff', fontFamily: 'Georgia, serif' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(160deg, #1C3A2A 0%, #2D5C40 100%)', padding: '36px 48px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#D4873A', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>
                  Tirthan Valley, Himachal Pradesh
                </div>
                <div style={{ color: '#FFFDF9', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  The Pahadi Ghar
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4, fontFamily: 'Arial, sans-serif' }}>
                  Your Himalayan Homestay
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                  {format(new Date(), 'd MMM yyyy')}
                </div>
                <div style={{ display: 'inline-block', background: 'rgba(212,135,58,0.25)', border: '1px solid rgba(212,135,58,0.5)', borderRadius: 4, padding: '4px 10px', color: '#D4873A', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>
                  ID #{bookingId}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                Bill For
              </div>
              <div style={{ color: '#FFFDF9', fontSize: 20, fontWeight: 600 }}>{guestName}</div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '0 48px 40px' }}>
            {/* Guest Information */}
            <div style={{ marginTop: 28, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #1C3A2A' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Guest Information</span>
            </div>
            {[
              { label: 'Full Name', value: guestName },
              { label: 'Phone', value: guestPhone ? `+91 ${guestPhone}` : '-' },
              { label: 'Guests', value: `${adults} Adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 13, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 160 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Room Details */}
            <div style={{ marginTop: 24, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #1C3A2A' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Room Details</span>
            </div>
            {type === 'room' && room && [
              { label: 'Room', value: room.name },
              { label: 'Check-in', value: checkIn ? format(parseISO(checkIn), 'd MMMM yyyy, EEEE') : '-' },
              { label: 'Check-out', value: checkOut ? format(parseISO(checkOut), 'd MMMM yyyy, EEEE') : '-' },
              { label: 'Duration', value: `${nights} Night${nights !== 1 ? 's' : ''}` },
              { label: 'Nightly Rate', value: `Rs. ${formatINR(room.nightlyRate)}` },
              { label: 'Room Charge', value: `Rs. ${formatINR(roomCharge)}` },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 13, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 160 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}
            {type === 'booking' && booking && [
              ...booking.roomIds.map(rid => ({ label: ROOM_META[rid]?.label || rid, value: `${booking.nights} nights x Rs. ${formatINR(booking.roomRates[rid] ?? 0)}` })),
              { label: 'Check-in', value: checkIn ? format(parseISO(checkIn), 'd MMMM yyyy, EEEE') : '-' },
              { label: 'Check-out', value: checkOut ? format(parseISO(checkOut), 'd MMMM yyyy, EEEE') : '-' },
              { label: 'Duration', value: `${nights} Night${nights !== 1 ? 's' : ''}` },
              { label: 'Room Charges', value: `Rs. ${formatINR(roomCharge)}` },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 13, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 160 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Meals & Services */}
            {items.length > 0 && (
              <>
                <div style={{ marginTop: 24, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #1C3A2A' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Meals &amp; Services</span>
                </div>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                    <span style={{ fontSize: 13, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 160 }}>{item.name}{item.quantity > 1 ? ` x ${item.quantity}` : ''}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>Rs. {formatINR(item.quantity * item.pricePerUnit)}</span>
                  </div>
                ))}
              </>
            )}

            {/* Payment Details */}
            <div style={{ marginTop: 24, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #1C3A2A' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Payment Details</span>
            </div>
            {[
              { label: 'Room Charges', value: `Rs. ${formatINR(roomCharge)}` },
              ...(itemsTotal > 0 ? [{ label: 'Meals & Services', value: `Rs. ${formatINR(itemsTotal)}` }] : []),
              { label: 'Grand Total', value: `Rs. ${formatINR(grandTotal)}`, bold: true },
              { label: 'Amount Paid', value: `Rs. ${formatINR(amountPaid)}`, color: '#3E6B47' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 13, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 160 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: (row as any).bold ? 700 : 600, color: (row as any).color || '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Balance Due */}
            <div style={{ marginTop: 16, padding: '14px 20px', borderRadius: 6, background: balance > 0 ? '#FEF3F0' : '#F0FDF4', border: `1.5px solid ${balance > 0 ? '#C0533A' : '#3E6B47'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: balance > 0 ? '#C0533A' : '#3E6B47', fontFamily: 'Arial, sans-serif' }}>
                {balance > 0 ? 'Balance Due at Check-in' : 'Fully Paid'}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
                Rs. {formatINR(balance)}
              </span>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid #E8E4DF', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#1C3A2A', fontWeight: 600, marginBottom: 4 }}>Thank you for staying with us!</div>
              <div style={{ fontSize: 11, color: '#9A9A92', fontFamily: 'Arial, sans-serif' }}>The Pahadi Ghar · Tirthan Valley, Himachal Pradesh</div>
            </div>
          </div>
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
