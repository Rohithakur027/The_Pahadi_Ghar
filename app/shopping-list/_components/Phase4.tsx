'use client';

import { useRef, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShoppingItem, Shopkeeper } from '../_lib/types';

interface Props {
  items: ShoppingItem[];
  shopkeepers: Shopkeeper[];
  listTitle: string;
  onMarkSent: () => void;
}

interface SkGroup {
  sk: Shopkeeper | null; // null = unassigned
  items: ShoppingItem[];
}

export default function Phase4({ items, shopkeepers, listTitle, onMarkSent }: Props) {
  const [generating, setGenerating] = useState<string | null>(null);
  const pdfRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fullPdfRef = useRef<HTMLDivElement | null>(null);

  const approvedItems = useMemo(() => items.filter(i => i.status === 'approved'), [items]);

  const groups = useMemo((): SkGroup[] => {
    const result: SkGroup[] = shopkeepers.map(sk => ({
      sk,
      items: approvedItems.filter(i => i.shopkeeperId === sk.id),
    })).filter(g => g.items.length > 0);

    const unassigned = approvedItems.filter(i => !i.shopkeeperId);
    if (unassigned.length > 0) result.push({ sk: null, items: unassigned });
    return result;
  }, [approvedItems, shopkeepers]);

  const dateStr = format(new Date(), 'd MMMM yyyy');
  const today = format(new Date(), 'dd-MMM-yyyy');

  const sendWhatsApp = (sk: Shopkeeper, skItems: ShoppingItem[]) => {
    const itemLines = skItems.map((item, i) => {
      const qty = item.approvedQuantity ?? item.quantity;
      return `${i + 1}. ${item.name} — ${qty} ${item.unit}`;
    }).join('\n');

    const message = `Namaskar ${sk.name.split(' ')[0]} ji 🙏\n\n*The Pahadi Ghar — Shopping List*\n_${dateStr}_\n\n${itemLines}\n\nKripya jaldi bhej dena 🙏\n— Pahadi Ghar, Tirthan Valley`;
    const phone = sk.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const downloadPdf = async (key: string, filename: string) => {
    const el = key === 'full' ? fullPdfRef.current : pdfRefs.current[key];
    if (!el) return;
    setGenerating(key);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFMod = await import('jspdf');
      const jsPDF = (jsPDFMod as any).jsPDF ?? jsPDFMod.default;

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH);
      } else {
        let yOffset = 0;
        while (yOffset < imgH) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, margin - yOffset, imgW, imgH);
          yOffset += pageH - margin * 2;
        }
      }
      pdf.save(filename);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-40">
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Send to Shopkeepers</h2>
        <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>
          {approvedItems.length} items · {groups.filter(g => g.sk).length} shopkeeper{groups.filter(g => g.sk).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Per-shopkeeper sections */}
      {groups.map(({ sk, items: skItems }) => {
        const key = sk?.id ?? 'unassigned';
        const skName = sk?.name ?? 'Unassigned';
        return (
          <div key={key} className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(28,58,42,0.12)' }}>
            {/* Header bar */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#1C3A2A' }}>
              <span className="text-base">📦</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#FFFDF9' }}>{skName.toUpperCase()}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {skItems.length} item{skItems.length !== 1 ? 's' : ''}
                  {sk?.phone && ` · ${sk.phone}`}
                </p>
              </div>
            </div>

            {/* Item list */}
            <div style={{ background: '#FFFDF9' }}>
              {skItems.map((item, idx) => {
                const qty = item.approvedQuantity ?? item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: idx < skItems.length - 1 ? '1px solid rgba(28,58,42,0.06)' : 'none' }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: '#1C3A2A' }}>{item.name}</span>
                      {item.notes && <span className="text-xs ml-2" style={{ color: 'rgba(28,58,42,0.45)' }}>({item.notes})</span>}
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#D4873A' }}>{qty} {item.unit}</span>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {sk && (
              <div className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(28,58,42,0.08)', background: '#FFFDF9' }}>
                <button
                  onClick={() => sendWhatsApp(sk, skItems)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
                  style={{ background: '#25D366', color: '#fff', minHeight: 48 }}
                >
                  <MessageCircle size={16} /> Send on WhatsApp
                </button>
                <button
                  onClick={() => downloadPdf(key, `ShoppingList_${skName.replace(/\s+/g, '_')}_${today}.pdf`)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A', minHeight: 48 }}
                  disabled={generating === key}
                >
                  {generating === key ? '…' : <><Download size={15} /> PDF</>}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Full list section */}
      <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(28,58,42,0.12)' }}>
        <div className="px-4 py-3" style={{ background: 'rgba(28,58,42,0.06)' }}>
          <p className="text-sm font-bold" style={{ color: '#1C3A2A' }}>📋 FULL LIST (All Items)</p>
          <p className="text-[11px]" style={{ color: 'rgba(28,58,42,0.5)' }}>For owner's records — includes all details</p>
        </div>
        <div className="flex gap-2 p-3" style={{ background: '#FFFDF9' }}>
          <button
            onClick={() => downloadPdf('full', `FullShoppingList_${today}.pdf`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
            style={{ background: '#1C3A2A', color: '#FFFDF9', minHeight: 48 }}
            disabled={generating === 'full'}
          >
            {generating === 'full' ? '…' : <><Download size={15} /> Download Full PDF</>}
          </button>
        </div>
      </div>

      {/* Mark as done */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 px-4 py-3 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(28,58,42,0.1)' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto md:max-w-2xl">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,58,42,0.6)' }}>
            All lists ready to send
          </span>
          <button
            onClick={onMarkSent}
            className="px-5 py-3 rounded-2xl text-sm font-bold"
            style={{ background: '#22C55E', color: '#fff', minHeight: 48 }}
          >
            Mark as Sent ✓
          </button>
        </div>
      </div>

      {/* Off-screen PDF render divs */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }}>
        {/* Per-shopkeeper PDFs */}
        {groups.filter(g => g.sk).map(({ sk, items: skItems }) => (
          <div
            key={sk!.id}
            ref={el => { pdfRefs.current[sk!.id] = el; }}
            style={{ width: 595, padding: 40, background: '#fff', fontFamily: 'sans-serif' }}
          >
            {/* Header */}
            <div style={{ background: '#1C3A2A', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
              <p style={{ color: '#D4873A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Tirthan Valley</p>
              <p style={{ color: '#FFFDF9', fontSize: 22, fontWeight: 700, margin: 0 }}>The Pahadi Ghar</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>Shopping List · {dateStr}</p>
            </div>
            {/* For */}
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1C3A2A', marginBottom: 16 }}>For: {sk!.name}</p>
            {/* Items */}
            {skItems.map((item, i) => {
              const qty = item.approvedQuantity ?? item.quantity;
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: 13, color: '#1A1A1A' }}>{i + 1}. {item.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C3A2A' }}>{qty} {item.unit}</span>
                </div>
              );
            })}
            {/* Footer */}
            <p style={{ fontSize: 11, color: '#888', marginTop: 24, textAlign: 'center' }}>
              The Pahadi Ghar, Tirthan Valley, Himachal Pradesh
            </p>
          </div>
        ))}

        {/* Full list PDF */}
        <div
          ref={fullPdfRef}
          style={{ width: 595, padding: 40, background: '#fff', fontFamily: 'sans-serif' }}
        >
          <div style={{ background: '#1C3A2A', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ color: '#D4873A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Tirthan Valley</p>
            <p style={{ color: '#FFFDF9', fontSize: 22, fontWeight: 700, margin: 0 }}>The Pahadi Ghar</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>Full Shopping List · {dateStr}</p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1C3A2A', marginBottom: 8 }}>{listTitle}</p>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 20 }}>
            {approvedItems.length} items · {shopkeepers.length} shopkeepers
          </p>
          {groups.map(({ sk, items: skItems }) => (
            <div key={sk?.id ?? 'unassigned'} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C3A2A', background: '#F7F3EE', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
                {sk ? sk.name.toUpperCase() : 'UNASSIGNED'}
              </p>
              {skItems.map((item, i) => {
                const qty = item.approvedQuantity ?? item.quantity;
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontSize: 12, color: '#1A1A1A' }}>
                      {i + 1}. {item.name}
                      {item.addedBy && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>({item.addedBy})</span>}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1C3A2A' }}>{qty} {item.unit}</span>
                      {item.approvedQuantity && item.approvedQuantity !== item.quantity && (
                        <span style={{ fontSize: 10, color: '#888', marginLeft: 6, textDecoration: 'line-through' }}>
                          was {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <p style={{ fontSize: 11, color: '#888', marginTop: 24, textAlign: 'center' }}>
            The Pahadi Ghar, Tirthan Valley, Himachal Pradesh
          </p>
        </div>
      </div>
    </div>
  );
}
