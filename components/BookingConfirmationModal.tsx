 'use client';

import { useRef, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { MealPlan, PaymentMethod } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmedBookingData {
  bookingRef: string;
  guestName: string;
  phone: string;
  adults: number;
  children: number;
  roomIds: string[];
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  mealPlan: MealPlan;
  specialRequests?: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_META: Record<string, { emoji: string; label: string }> = {
  'room-gushaini':    { emoji: '🏡', label: 'Room (Gushaini)' },
  'room-banjar':      { emoji: '🌄', label: 'Room (Banjar)' },
  'rooftop-gushaini': { emoji: '🏔️', label: 'RooftopCottage (Gushaini)' },
  'rooftop-banjar':   { emoji: '⛺', label: 'RooftopCottage (Banjar)' },
};

const MEAL_LABELS: Record<MealPlan, string> = {
  room_only:        'Room Only',
  breakfast:        'Breakfast Included',
  breakfast_dinner: 'Breakfast & Dinner',
  all_meals:        'All Meals Included',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:          'Cash',
  upi:           'UPI',
  bank_transfer: 'Bank Transfer',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

// ── PDF Row helper ─────────────────────────────────────────────────────────────

function PDFRow({
  label, value, bold, color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '7px 0',
      borderBottom: '1px solid rgba(28,58,42,0.07)',
    }}>
      <span style={{ fontSize: 12, color: '#5A5A52', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 12,
        fontWeight: bold ? 700 : 500,
        color: color || '#1A1A1A',
        maxWidth: '60%',
        textAlign: 'right',
        wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  );
}

function PDFSection({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: '2px solid #1C3A2A', paddingTop: 16, paddingBottom: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#1C3A2A' }}>
        {title}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  data: ConfirmedBookingData;
  onClose: () => void;
}

export default function BookingConfirmationModal({ data, onClose }: Props) {
  const pdfRef    = useRef<HTMLDivElement>(null);
  const blobCache = useRef<Blob | null>(null);
  const [loading, setLoading] = useState<'download' | null>(null);

  const rooms = data.roomIds
    .map(id => `${ROOM_META[id]?.emoji || ''} ${ROOM_META[id]?.label || id}`)
    .join(', ');

  const checkInFormatted  = format(parseISO(data.checkInDate),  'd MMM yyyy, EEEE');
  const checkOutFormatted = format(parseISO(data.checkOutDate), 'd MMM yyyy, EEEE');
  const guestCount = `${data.adults} Adult${data.adults !== 1 ? 's' : ''}${
    data.children > 0 ? ` + ${data.children} Child${data.children !== 1 ? 'ren' : ''}` : ''
  }`;

  // Pre-generate PDF blob on mount. Always completes — failure is silent and
  // the WhatsApp button still works (falls back to text message).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await new Promise(r => setTimeout(r, 400)); // wait for hidden div to render
        if (cancelled || !pdfRef.current) return;
        const blob = await generateBlob();
        if (!cancelled && blob) {
          blobCache.current = blob;
        }
      } catch {
        // PDF gen failed — WhatsApp text fallback will handle it
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PDF generation ────────────────────────────────────────────────────────

  const generateBlob = async (): Promise<Blob | null> => {
    if (!pdfRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    const jsPDFMod    = await import('jspdf');
    const jsPDF       = (jsPDFMod as any).jsPDF ?? jsPDFMod.default;

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
    return pdf.output('blob');
  };

  const fileName = `Booking_${data.guestName.replace(/\s+/g, '_')}_${data.bookingRef}.pdf`;

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setLoading('download');
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  // ── WhatsApp ──────────────────────────────────────────────────────────────

  const buildWaUrl = () => {
    const phone = data.phone.replace(/\D/g, '');
    const normalizedPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const text =
      `Dear ${data.guestName},\n\n` +
      `Your booking at The Pahadi Ghar, Tirthan Valley is confirmed!\n\n` +
      `Please check your booking receipt.`;
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleWhatsApp = () => {
    const blob = blobCache.current;
    const waUrl = buildWaUrl();

    // Step 1 — Download the PDF (if ready). This gives the manager the file
    // in their downloads so they can manually attach it in WhatsApp.
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }

    // Step 2 — Open WhatsApp with booking details pre-filled as text.
    // window.open is called synchronously inside the click handler so it is
    // never blocked by pop-up blockers.
    window.open(waUrl, '_blank');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal sheet */}
      <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm rounded-3xl pointer-events-auto slide-up"
          style={{
            background: '#FFFDF9',
            boxShadow: '0 20px 60px rgba(28,58,42,0.3)',
            maxHeight: '90vh',
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          {/* ── Header ── */}
          <div
            className="relative px-6 pt-6 pb-4 text-center"
            style={{ borderBottom: '1px solid rgba(28,58,42,0.08)' }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A' }}
              aria-label="Close"
            >
              <X size={14} />
            </button>

            {/* Checkmark circle */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(62,107,71,0.12)', border: '2px solid rgba(62,107,71,0.4)' }}
            >
              <Check size={26} style={{ color: '#3E6B47' }} strokeWidth={3} />
            </div>

            <h2
              className="text-[22px] font-bold mb-1"
              style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}
            >
              Booking Confirmed!
            </h2>
            <p className="text-xs" style={{ color: '#7A7A6E' }}>
              Ref #{data.bookingRef} · {format(new Date(), 'd MMM yyyy')}
            </p>
          </div>

          {/* ── Quick Summary ── */}
          <div className="px-5 py-4 space-y-2.5">
            {[
              { label: 'Guest',      value: data.guestName },
              { label: 'Rooms',      value: rooms },
              { label: 'Check-in',   value: checkInFormatted },
              { label: 'Check-out',  value: checkOutFormatted },
              { label: 'Duration',   value: `${data.nights} Night${data.nights !== 1 ? 's' : ''}` },
              { label: 'Guests',     value: guestCount },
              { label: 'Meal Plan',  value: MEAL_LABELS[data.mealPlan] },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-start gap-3">
                <span className="text-xs flex-shrink-0 pt-0.5" style={{ color: '#7A7A6E' }}>{row.label}</span>
                <span className="text-xs font-semibold text-right" style={{ color: '#1C3A2A' }}>{row.value}</span>
              </div>
            ))}

            {/* Financial pill */}
            <div
              className="rounded-2xl p-3.5 mt-2"
              style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.1)' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs" style={{ color: '#7A7A6E' }}>Total Amount</span>
                <span
                  className="text-[17px] font-bold"
                  style={{ color: '#1C3A2A', fontFamily: 'var(--font-playfair)' }}
                >
                  ₹{formatINR(data.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs" style={{ color: '#7A7A6E' }}>Advance Paid</span>
                <span className="text-sm font-semibold" style={{ color: '#3E6B47' }}>
                  ₹{formatINR(data.advancePaid)}
                </span>
              </div>
              <div
                className="flex justify-between items-center pt-2.5"
                style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: data.balanceDue > 0 ? '#C0533A' : '#3E6B47' }}
                >
                  {data.balanceDue > 0 ? 'Balance Due at Check-in' : '✓ Fully Paid'}
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: data.balanceDue > 0 ? '#C0533A' : '#3E6B47' }}
                >
                  ₹{formatINR(data.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="px-5 pb-10 space-y-2.5">
            {/* WhatsApp — primary */}
            <button
              onClick={handleWhatsApp}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 min-h-[52px] transition-all active:scale-[0.98]"
              style={{ background: '#25D366', color: '#FFFDF9', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send on WhatsApp
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={!!loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 min-h-[48px] transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'rgba(28,58,42,0.07)',
                color: '#1C3A2A',
                border: '1px solid rgba(28,58,42,0.12)',
              }}
            >
              {loading === 'download' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {loading === 'download' ? 'Generating PDF…' : 'Download PDF'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-medium transition-all"
              style={{ color: '#7A7A6E' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden PDF capture div (off-screen) ── */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <div
          ref={pdfRef}
          style={{ width: 595, background: '#ffffff', fontFamily: 'Georgia, serif' }}
        >
          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(160deg, #1C3A2A 0%, #2D5C40 100%)',
            padding: '22px 40px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#D4873A', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>
                  Tirthan Valley, Himachal Pradesh
                </div>
                <div style={{ color: '#FFFDF9', fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  The Pahadi Ghar
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3, fontFamily: 'Arial, sans-serif' }}>
                  Your Himalayan Homestay
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                  {format(new Date(), 'd MMM yyyy')}
                </div>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(212,135,58,0.25)',
                  border: '1px solid rgba(212,135,58,0.5)',
                  borderRadius: 4,
                  padding: '4px 10px',
                  color: '#D4873A',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontFamily: 'Arial, sans-serif',
                }}>
                  Ref #{data.bookingRef}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', marginBottom: 3 }}>
                Booking Confirmation
              </div>
              <div style={{ color: '#FFFDF9', fontSize: 17, fontWeight: 600 }}>
                {data.guestName}
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '0 40px 24px' }}>

            {/* Section helper */}
            {/* Guest Information */}
            <div style={{ marginTop: 18, marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid #1C3A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Guest Information</span>
            </div>

            {[
              { label: 'Full Name',     value: data.guestName },
              { label: 'Phone',         value: `+91 ${data.phone}` },
              { label: 'Guests',        value: guestCount },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 12, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 150 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Booking Details */}
            <div style={{ marginTop: 16, marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid #1C3A2A' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Booking Details</span>
            </div>

            {[
              ...data.roomIds.map(id => ({ label: 'Room', value: ROOM_META[id]?.label || id })),
              { label: 'Check-in',  value: format(parseISO(data.checkInDate),  'd MMMM yyyy, EEEE') },
              { label: 'Check-out', value: format(parseISO(data.checkOutDate), 'd MMMM yyyy, EEEE') },
              { label: 'Duration',  value: `${data.nights} Night${data.nights !== 1 ? 's' : ''}` },
              { label: 'Meal Plan', value: MEAL_LABELS[data.mealPlan] },
              ...(data.specialRequests ? [{ label: 'Special Requests', value: data.specialRequests }] : []),
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 12, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 150 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Payment Details */}
            <div style={{ marginTop: 16, marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid #1C3A2A' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A', fontFamily: 'Arial, sans-serif' }}>Payment Details</span>
            </div>

            {[
              { label: 'Total Amount',    value: `Rs. ${formatINR(data.totalAmount)}`,  bold: true },
              { label: 'Advance Paid',    value: `Rs. ${formatINR(data.advancePaid)}`,  color: '#3E6B47' },
              { label: 'Payment Method',  value: METHOD_LABELS[data.paymentMethod] },
              ...(data.transactionId ? [{ label: 'Transaction ID', value: data.transactionId }] : []),
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 12, color: '#5A5A52', fontFamily: 'Arial, sans-serif', minWidth: 150 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: (row as any).bold ? 700 : 600, color: (row as any).color || '#1A1A1A', textAlign: 'right', flex: 1 }}>{row.value}</span>
              </div>
            ))}

            {/* Balance Due */}
            <div style={{
              marginTop: 12,
              padding: '10px 16px',
              borderRadius: 6,
              background: data.balanceDue > 0 ? '#FEF3F0' : '#F0FDF4',
              border: `1.5px solid ${data.balanceDue > 0 ? '#C0533A' : '#3E6B47'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: data.balanceDue > 0 ? '#C0533A' : '#3E6B47', fontFamily: 'Arial, sans-serif' }}>
                {data.balanceDue > 0 ? 'Balance Due at Check-in' : 'Fully Paid'}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: data.balanceDue > 0 ? '#C0533A' : '#3E6B47' }}>
                Rs. {formatINR(data.balanceDue)}
              </span>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #E8E4DF', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#1C3A2A', fontWeight: 600, marginBottom: 3 }}>
                We look forward to welcoming you!
              </div>
              <div style={{ fontSize: 10, color: '#9A9A92', fontFamily: 'Arial, sans-serif' }}>
                The Pahadi Ghar · Tirthan Valley, Himachal Pradesh
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
