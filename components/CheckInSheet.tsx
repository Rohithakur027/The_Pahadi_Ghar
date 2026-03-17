'use client';

import { useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { format, differenceInCalendarDays } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Camera, Plus, Trash2, Check } from 'lucide-react';
import { useHomestay } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { AadharEntry, OrderItem } from '@/types';
import toast from 'react-hot-toast';

const ROOMS = [
  { id: 'room-gushaini',    emoji: '🏡', label: 'Room (Gushaini)',         defaultRate: 2500 },
  { id: 'room-banjar',      emoji: '🌄', label: 'Room (Banjar)',           defaultRate: 2500 },
  { id: 'rooftop-gushaini', emoji: '🏔️', label: 'RooftopCottage (Gushaini)', defaultRate: 3500 },
  { id: 'rooftop-banjar',   emoji: '⛺', label: 'RooftopCottage (Banjar)',   defaultRate: 3500 },
];

type Step = 1 | 2 | 3 | 4 | 'confirm';

interface ItemDraft { name: string; qty: string; price: string }
interface AadharDraft extends Omit<AadharEntry, 'id'> {}

function formatINR(n: number) { return new Intl.NumberFormat('en-IN').format(n); }

export default function CheckInSheet({ onClose }: { onClose: () => void }) {
  const { rooms, createGroupBooking, addGroupItem, addGroupAadhar } = useHomestay();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — rooms
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomRates, setRoomRates] = useState<Record<string, string>>({});

  // Step 2 — dates & guests
  const [checkInDate, setCheckInDate] = useState<Date | null>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Step 3 — documentation
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [aadharCards, setAadharCards] = useState<AadharDraft[]>([]);
  const [showAadharForm, setShowAadharForm] = useState(false);
  const [aName, setAName] = useState('');
  const [aNum, setANum] = useState('');
  const [aImg, setAImg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 4 — food / items
  const [items, setItems] = useState<{ name: string; qty: number; price: number }[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [iName, setIName] = useState('');
  const [iQty, setIQty] = useState('1');
  const [iPrice, setIPrice] = useState('');

  const nights = checkInDate && checkOutDate
    ? Math.max(0, differenceInCalendarDays(checkOutDate, checkInDate))
    : 0;

  const occupiedIds = new Set(rooms.filter(r => r.status === 'occupied').map(r => r.id));

  const toggleRoom = (id: string) => {
    if (occupiedIds.has(id)) return;
    setSelectedRooms(prev => {
      if (prev.includes(id)) {
        setRoomRates(r => { const c = { ...r }; delete c[id]; return c; });
        return prev.filter(r => r !== id);
      }
      const meta = ROOMS.find(r => r.id === id);
      setRoomRates(r => ({ ...r, [id]: String(meta?.defaultRate || 2500) }));
      return [...prev, id];
    });
  };

  const totalRoomCharge = selectedRooms.reduce((s, id) => {
    const rate = parseFloat(roomRates[id] || '0') || 0;
    return s + rate * nights;
  }, 0);
  const totalItems = items.reduce((s, i) => s + i.qty * i.price, 0);
  const grandTotal = totalRoomCharge + totalItems;

  const canStep1 = selectedRooms.length > 0;
  const canStep2 = !!(checkInDate && checkOutDate && nights > 0);
  const canStep3 = guestName.trim().length > 0;
  const canConfirm = canStep1 && canStep2 && canStep3;

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
    return true;
  };

  const addAadhar = () => {
    if (!aName.trim() || !aNum.trim()) { toast.error('Enter name and Aadhar number'); return; }
    setAadharCards(prev => [...prev, { holderName: aName.trim(), number: aNum.trim(), imageBase64: aImg || undefined }]);
    setAName(''); setANum(''); setAImg('');
    setShowAadharForm(false);
  };

  const addItem = () => {
    if (!iName.trim() || !iPrice || parseFloat(iPrice) <= 0) { toast.error('Fill item name and price'); return; }
    setItems(prev => [...prev, { name: iName.trim(), qty: parseInt(iQty) || 1, price: parseFloat(iPrice) }]);
    setIName(''); setIQty('1'); setIPrice('');
    setShowItemForm(false);
  };

  const handleCheckIn = () => {
    if (!canConfirm || !checkInDate || !checkOutDate) return;
    const rRates: Record<string, number> = {};
    selectedRooms.forEach(id => { rRates[id] = parseFloat(roomRates[id] || '0') || 2500; });

    const gbId = createGroupBooking({
      roomIds: selectedRooms, roomRates: rRates,
      guestName: guestName.trim(), phone: phone.trim() || undefined,
      adults, children,
      checkInDate: format(checkInDate, 'yyyy-MM-dd'),
      checkOutDate: format(checkOutDate, 'yyyy-MM-dd'),
      nights, specialRequests: specialRequests.trim() || undefined,
    });

    items.forEach(it => addGroupItem(gbId, { name: it.name, quantity: it.qty, pricePerUnit: it.price }));
    aadharCards.forEach(a => addGroupAadhar(gbId, a));

    toast.success(`✓ ${guestName} checked in — ${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''}`);
    onClose();
    router.push(`/bookings/${gbId}`);
  };

  const stepNum = step === 'confirm' ? 4 : Number(step);
  const stepLabels: Record<string, string> = { '1': 'Select Rooms', '2': 'Dates & Guests', '3': 'Documentation', '4': 'Food & Items' };

  const inp = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none";
  const inpStyle = { background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 fade-overlay" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 40 }} onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 slide-up mx-auto"
        style={{ maxWidth: '512px', borderRadius: '24px 24px 0 0', background: '#FFFDF9', maxHeight: '92vh', display: 'flex', flexDirection: 'column', zIndex: 50, boxShadow: '0 -8px 40px rgba(28,58,42,0.18)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(28,58,42,0.2)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(28,58,42,0.08)' }}>
          <p className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>New Check-In</p>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(28,58,42,0.06)' }}>
            <X size={14} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        {/* Progress */}
        {step !== 'confirm' && (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: '#7A7A6E' }}>Step {stepNum} of 4</p>
              <p className="text-xs font-semibold" style={{ color: '#1C3A2A' }}>{stepLabels[String(stepNum)]}</p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(28,58,42,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ background: 'linear-gradient(90deg, #D4873A, #E8A55A)', width: `${(stepNum / 4) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 pt-3">

          {/* ── STEP 1: Select Rooms ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs mb-1" style={{ color: '#7A7A6E' }}>Select rooms · multiple allowed</p>
              {ROOMS.map(rm => {
                const isSelected = selectedRooms.includes(rm.id);
                const isOccupied = occupiedIds.has(rm.id);
                return (
                  <div key={rm.id}>
                    <button
                      onClick={() => toggleRoom(rm.id)}
                      disabled={isOccupied}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                      style={{
                        background: isSelected ? 'rgba(212,135,58,0.1)' : 'rgba(28,58,42,0.04)',
                        border: `2px solid ${isSelected ? 'rgba(212,135,58,0.55)' : 'rgba(28,58,42,0.1)'}`,
                        opacity: isOccupied ? 0.45 : 1,
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      }}
                    >
                      <span className="text-2xl">{rm.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{rm.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: isOccupied ? '#C0533A' : '#3E6B47' }}>
                          {isOccupied ? 'Already occupied' : '● Available'}
                        </p>
                      </div>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: isSelected ? '#D4873A' : 'rgba(28,58,42,0.1)', transform: isSelected ? 'scale(1.15)' : 'scale(1)' }}
                      >
                        {isSelected && (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Per-room rate input when selected */}
                    {isSelected && (
                      <div className="relative mt-1.5 ml-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                        <input
                          type="number"
                          placeholder="Rate per night"
                          value={roomRates[rm.id] || ''}
                          onChange={e => setRoomRates(r => ({ ...r, [rm.id]: e.target.value }))}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                          style={{ background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── STEP 2: Dates & Guests ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Check-in</label>
                  <DatePicker
                    selected={checkInDate}
                    onChange={(d: Date | null) => { setCheckInDate(d); if (checkOutDate && d && checkOutDate <= d) setCheckOutDate(null); }}
                    dateFormat="d MMM yyyy"
                    minDate={new Date()}
                    className="block-datepicker"
                    placeholderText="Pick date"
                    popperPlacement="bottom-start"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Check-out</label>
                  <DatePicker
                    selected={checkOutDate}
                    onChange={(d: Date | null) => setCheckOutDate(d)}
                    dateFormat="d MMM yyyy"
                    minDate={checkInDate ? new Date(checkInDate.getTime() + 86400000) : new Date()}
                    className="block-datepicker"
                    placeholderText="Pick date"
                    disabled={!checkInDate}
                    popperPlacement="bottom-end"
                  />
                </div>
              </div>

              {nights > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(212,135,58,0.1)', border: '1px solid rgba(212,135,58,0.3)' }}>
                  <span className="text-sm font-semibold" style={{ color: '#A36520' }}>🌙 {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold" style={{ color: '#D4873A' }}>₹{formatINR(totalRoomCharge)} rooms total</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Adults</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAdults(a => Math.max(1, a - 1))} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>−</button>
                    <span className="flex-1 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{adults}</span>
                    <button onClick={() => setAdults(a => a + 1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A7A6E' }}>Children</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setChildren(c => Math.max(0, c - 1))} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>−</button>
                    <span className="flex-1 text-center text-sm font-bold" style={{ color: '#1A1A1A' }}>{children}</span>
                    <button onClick={() => setChildren(c => c + 1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Documentation ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>Guest Name *</label>
                <input type="text" placeholder="Full name" value={guestName} onChange={e => setGuestName(e.target.value)} className={inp} style={inpStyle} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>Phone (optional)</label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 py-3 rounded-xl border text-sm font-semibold flex-shrink-0" style={{ background: 'rgba(28,58,42,0.06)', borderColor: 'rgba(28,58,42,0.2)', color: '#7A7A6E' }}>+91</div>
                  <input type="tel" inputMode="numeric" placeholder="10-digit number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`flex-1 ${inp}`} style={inpStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7A7A6E' }}>Special Requests</label>
                <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Dietary needs, early check-in…" rows={2} className={`${inp} resize-none`} style={inpStyle} />
              </div>

              {/* Aadhar cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>
                    Aadhar Cards {aadharCards.length > 0 ? `(${aadharCards.length})` : ''}
                  </label>
                  <button
                    onClick={() => setShowAadharForm(v => !v)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: showAadharForm ? 'rgba(192,83,58,0.1)' : 'rgba(28,58,42,0.08)', color: showAadharForm ? '#C0533A' : '#1C3A2A' }}
                  >
                    {showAadharForm ? <X size={12} /> : <Plus size={12} />}
                    {showAadharForm ? 'Cancel' : '+ Add'}
                  </button>
                </div>

                {showAadharForm && (
                  <div className="rounded-2xl p-4 space-y-3 mb-3" style={{ background: 'rgba(28,58,42,0.03)', border: '1px solid rgba(28,58,42,0.1)' }}>
                    <input type="text" placeholder="Cardholder name" value={aName} onChange={e => setAName(e.target.value)} className={inp} style={inpStyle} />
                    <input type="text" inputMode="numeric" placeholder="XXXX XXXX XXXX" maxLength={14} value={aNum} onChange={e => setANum(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim())} className={inp} style={inpStyle} />
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setAImg(r.result as string); r.readAsDataURL(f); }} className="hidden" />
                    {aImg ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={aImg} alt="Aadhar" className="w-full h-28 object-cover rounded-xl" />
                        <button onClick={() => setAImg('')} className="absolute top-2 right-2 p-1 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}><X size={11} color="white" /></button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-dashed border-2 text-sm font-medium" style={{ borderColor: 'rgba(28,58,42,0.2)', color: '#7A7A6E' }}>
                        <Camera size={14} /> Capture / Upload
                      </button>
                    )}
                    <button onClick={addAadhar} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
                      <Check size={14} className="inline mr-1.5" />Save Aadhar
                    </button>
                  </div>
                )}

                {aadharCards.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.08)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: '#1A1A1A' }}>{c.holderName}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: '#7A7A6E' }}>{c.number}</p>
                    </div>
                    {c.imageBase64 && <span className="text-xs" style={{ color: '#3E6B47' }}>📷</span>}
                    <button onClick={() => setAadharCards(prev => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-lg" style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {aadharCards.length > 0 && !showAadharForm && (
                  <button onClick={() => setShowAadharForm(true)} className="w-full py-2.5 rounded-xl text-xs font-bold border-dashed border-2 transition-all" style={{ borderColor: 'rgba(28,58,42,0.2)', color: '#1C3A2A' }}>
                    + Add Another Aadhar Card
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: Food & Items ── */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs mb-1" style={{ color: '#7A7A6E' }}>Optional — add food or services at check-in</p>

              <button
                onClick={() => setShowItemForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: showItemForm ? 'rgba(192,83,58,0.1)' : 'rgba(212,135,58,0.12)', color: showItemForm ? '#C0533A' : '#A36520', border: `1px solid ${showItemForm ? 'rgba(192,83,58,0.25)' : 'rgba(212,135,58,0.3)'}` }}
              >
                {showItemForm ? <X size={15} /> : <Plus size={15} />}
                {showItemForm ? 'Cancel' : 'Add Item / Food'}
              </button>

              {showItemForm && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.2)' }}>
                  <input type="text" placeholder="Item name (Maggi, Chai, Blanket…)" value={iName} onChange={e => setIName(e.target.value)} className={inp} style={inpStyle} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Qty</label>
                      <input type="number" min="1" value={iQty} onChange={e => setIQty(e.target.value)} className={inp} style={inpStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Price (₹)</label>
                      <input type="number" placeholder="0" value={iPrice} onChange={e => setIPrice(e.target.value)} className={inp} style={inpStyle} />
                    </div>
                  </div>
                  <button onClick={addItem} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}>
                    Add Item
                  </button>
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🍽️</p>
                  <p className="text-sm" style={{ color: '#7A7A6E' }}>No items — you can add them later too</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{it.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{it.qty} × ₹{formatINR(it.price)}</p>
                      </div>
                      <p className="text-sm font-semibold mr-2" style={{ color: '#1A1A1A' }}>₹{formatINR(it.qty * it.price)}</p>
                      <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-lg" style={{ color: '#C0533A', background: 'rgba(192,83,58,0.08)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.08)', border: '1px solid rgba(212,135,58,0.2)' }}>
                    <span className="text-sm font-medium" style={{ color: '#7A7A6E' }}>Items Subtotal</span>
                    <span className="text-sm font-bold" style={{ color: '#D4873A' }}>₹{formatINR(totalItems)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.12)' }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7A6E' }}>Rooms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRooms.map(id => {
                      const rm = ROOMS.find(r => r.id === id);
                      return (
                        <span key={id} className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                          {rm?.emoji} {rm?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7A7A6E' }}>Dates</p>
                  <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                    {checkInDate && format(checkInDate, 'd MMM yyyy')} → {checkOutDate && format(checkOutDate, 'd MMM yyyy')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>

                <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7A7A6E' }}>Guest</p>
                  <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{guestName}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                    {phone ? `+91 ${phone} · ` : ''}{adults} adult{adults !== 1 ? 's' : ''}
                    {children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                    {aadharCards.length > 0 ? ` · ${aadharCards.length} Aadhar` : ''}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }} className="pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7A6E' }}>Total</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Rooms', value: totalRoomCharge },
                      { label: 'Items', value: totalItems },
                      { label: 'Grand Total', value: grandTotal },
                    ].map(f => (
                      <div key={f.label} className="rounded-xl px-2 py-2 text-center" style={{ background: 'rgba(28,58,42,0.06)' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>{f.label}</p>
                        <p className="text-xs font-bold mt-0.5" style={{ color: '#1C3A2A' }}>₹{formatINR(f.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckIn}
                disabled={!canConfirm}
                className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
                style={{ background: canConfirm ? 'linear-gradient(135deg, #1C3A2A, #2A5A40)' : 'rgba(28,58,42,0.12)', color: canConfirm ? 'white' : '#7A7A6E' }}
              >
                ✓ Check In Now
              </button>

              <button onClick={goBack} className="w-full py-2 text-sm font-medium" style={{ color: '#7A7A6E' }}>
                ← Edit Details
              </button>
            </div>
          )}

          {/* Navigation */}
          {step !== 'confirm' && (
            <div className="flex gap-3 mt-6 pb-2">
              {step > 1 && (
                <button onClick={goBack} className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!canGoNext()}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: canGoNext() ? 'linear-gradient(135deg, #1C3A2A, #2A5A40)' : 'rgba(28,58,42,0.12)', color: canGoNext() ? 'white' : '#7A7A6E' }}
              >
                {step === 4 ? 'Review →' : <>Next <ChevronRight size={16} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
