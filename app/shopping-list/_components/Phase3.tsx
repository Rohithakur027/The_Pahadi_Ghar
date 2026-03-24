'use client';

import { useRef, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, Check, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShoppingItem, URGENCY_CONFIG, sortItems } from '../_lib/types';

interface Props {
  items: ShoppingItem[];
  listTitle: string;
  listCategory?: string;
  shopkeeperName?: string;
  shopkeeperPhone?: string;
  onUpdatePhone: (phone: string) => void;
  onMarkSent: () => void;
}

export default function Phase3({
  items, listTitle, listCategory, shopkeeperName, shopkeeperPhone, onUpdatePhone, onMarkSent,
}: Props) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating]       = useState(false);
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [phoneInput, setPhoneInput]         = useState(shopkeeperPhone ?? '');
  const [sent, setSent]                     = useState(false);

  const approved = useMemo(() => sortItems(items.filter(i => i.status === 'pending')), [items]);
  const dateStr  = format(new Date(), 'd MMMM yyyy');

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const doWhatsApp = (phone: string) => {
    const itemLines = approved.map((item, i) => {
      const qty = item.approvedQuantity ?? item.quantity;
      return `${i + 1}. ${item.name} — ${qty} ${item.unit}`;
    }).join('\n');

    const message =
      `Namaskar ${shopkeeperName ? shopkeeperName.split(' ')[0] + ' ji' : 'ji'} 🙏\n\n` +
      `*The Pahadi Ghar — Shopping List*\n_${dateStr}_\n` +
      (listCategory ? `_Category: ${listCategory}_\n` : '') +
      `\n${itemLines}\n\nKripya jaldi bhej dena 🙏\n— Pahadi Ghar, Tirthan Valley`;

    const clean      = phone.replace(/\D/g, '');
    const normalized = clean.startsWith('91') ? clean : `91${clean}`;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!shopkeeperPhone?.trim()) {
      setPhoneInput('');
      setShowPhonePopup(true);
    } else {
      doWhatsApp(shopkeeperPhone);
    }
  };

  const handleSavePhone = () => {
    if (!phoneInput.trim() || phoneInput.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid 10-digit number');
      return;
    }
    onUpdatePhone(phoneInput.trim());
    setShowPhonePopup(false);
    doWhatsApp(phoneInput.trim());
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const downloadPdf = async () => {
    if (!pdfRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFMod    = await import('jspdf');
      const jsPDF       = (jsPDFMod as any).jsPDF ?? jsPDFMod.default;

      const el     = pdfRef.current;
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: el.scrollWidth, height: el.scrollHeight,
        windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
        x: 0, y: 0, scrollX: 0, scrollY: 0,
      });

      const pdf           = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W          = 210;
      const A4_H          = 297;
      const margin        = 10;
      const imgW          = A4_W - margin * 2;
      const pageHeightPx  = Math.floor(((A4_H - margin * 2) / imgW) * canvas.width);

      let yOffset = 0, page = 0;
      while (yOffset < canvas.height) {
        const sliceH      = Math.min(pageHeightPx, canvas.height - yOffset);
        const pageCanvas  = document.createElement('canvas');
        pageCanvas.width  = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (page > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, (sliceH / canvas.width) * imgW);
        yOffset += sliceH;
        page++;
      }
      pdf.save(`ShoppingList_${listTitle.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.pdf`);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-32">

      {/* Shopkeeper card */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: '#FFFDF9', border: '1px solid rgba(62,107,71,0.2)' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Shopkeeper</p>
        {shopkeeperName ? (
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{shopkeeperName}</p>
            {shopkeeperPhone
              ? <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>📱 {shopkeeperPhone}</p>
              : (
                <button
                  onClick={() => { setPhoneInput(''); setShowPhonePopup(true); }}
                  className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold"
                  style={{ color: '#D4873A' }}
                >
                  <Phone size={11} /> Add WhatsApp number
                </button>
              )
            }
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#7A7A6E' }}>No shopkeeper assigned</p>
        )}
      </div>

      {/* List preview */}
      <div className="rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid rgba(28,58,42,0.1)' }}>
        <div className="px-4 py-3" style={{ background: 'rgba(28,58,42,0.05)' }}>
          <p className="text-sm font-bold" style={{ color: '#1C3A2A' }}>{listTitle}</p>
          <p className="text-xs" style={{ color: '#7A7A6E' }}>{dateStr} · {approved.length} items{listCategory ? ` · ${listCategory}` : ''}</p>
        </div>
        {approved.map((item, idx) => {
          const cfg = URGENCY_CONFIG[item.urgency];
          const qty = item.approvedQuantity ?? item.quantity;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(28,58,42,0.06)', background: '#FFFDF9' }}
            >
              <span className="text-sm flex-1 font-medium" style={{ color: '#1C3A2A' }}>{item.name}</span>
              <span className="text-xs" style={{ color: cfg.color }}>{cfg.dot}</span>
              <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{qty} {item.unit}</span>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="space-y-3 mb-5">
        <button
          onClick={downloadPdf}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)', color: '#fff', boxShadow: '0 4px 16px rgba(212,135,58,0.3)' }}
        >
          <Download size={18} />
          {generating ? 'Generating PDF…' : 'Download PDF'}
        </button>

        <button
          onClick={handleWhatsApp}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Send on WhatsApp
        </button>
      </div>

      {/* Mark as sent */}
      <button
        onClick={() => { setSent(true); onMarkSent(); }}
        disabled={sent}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60"
        style={{
          background: sent ? 'rgba(34,197,94,0.1)' : 'rgba(28,58,42,0.07)',
          color: sent ? '#22C55E' : '#1C3A2A',
          border: `1px solid ${sent ? 'rgba(34,197,94,0.3)' : 'rgba(28,58,42,0.12)'}`,
        }}
      >
        <Check size={16} />
        {sent ? 'List Marked as Sent ✓' : 'Mark as Sent'}
      </button>

      {/* ── Hidden PDF div ── */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <div ref={pdfRef} style={{ width: 595, background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ background: 'linear-gradient(160deg, #1C3A2A 0%, #2D5C40 100%)', padding: '32px 40px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#D4873A', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>The Pahadi Ghar · Tirthan Valley</div>
                <div style={{ color: '#FFFDF9', fontSize: 22, fontWeight: 700 }}>Shopping List</div>
                {listCategory && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 }}>{listCategory}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{dateStr}</div>
                <div style={{ color: '#FFFDF9', fontSize: 13, fontWeight: 600, marginTop: 4 }}>{listTitle}</div>
              </div>
            </div>
            {shopkeeperName && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>For Shopkeeper</div>
                <div style={{ color: '#FFFDF9', fontSize: 15, fontWeight: 600 }}>{shopkeeperName}{shopkeeperPhone ? ` · ${shopkeeperPhone}` : ''}</div>
              </div>
            )}
          </div>
          <div style={{ padding: '0 40px 36px' }}>
            <div style={{ marginTop: 24, marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #1C3A2A', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A' }}>Item</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1C3A2A' }}>Quantity</span>
            </div>
            {approved.map((item) => {
              const qty = item.approvedQuantity ?? item.quantity;
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F0EDE8' }}>
                  <div>
                    <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{item.category}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C3A2A' }}>{qty} {item.unit}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #E8E4DF', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#1C3A2A', fontWeight: 600 }}>Kripya jaldi bhej dena 🙏</div>
              <div style={{ fontSize: 11, color: '#9A9A92', marginTop: 4 }}>The Pahadi Ghar · Tirthan Valley, Himachal Pradesh</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Phone popup ── */}
      {showPhonePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                Add WhatsApp Number
              </h3>
              <button onClick={() => setShowPhonePopup(false)} className="p-1.5 rounded-lg" style={{ background: 'rgba(28,58,42,0.08)' }}>
                <X size={14} style={{ color: '#1C3A2A' }} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: '#7A7A6E' }}>
              {shopkeeperName
                ? `Please add ${shopkeeperName}'s WhatsApp number to send the list.`
                : "Please add the shopkeeper's WhatsApp number to send the list."}
            </p>

            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#7A7A6E' }}>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none"
                style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#fff' }}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPhonePopup(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhone}
                className="flex-1 py-3 rounded-2xl text-sm font-bold"
                style={{ background: '#25D366', color: '#fff' }}
              >
                Save &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
