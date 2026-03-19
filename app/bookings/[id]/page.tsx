'use client';

import { use, useState, useRef } from 'react';
import { useHomestay, calculateGroupTotal } from '@/context/HomestayContext';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Users, ShoppingBag, Receipt, CreditCard,
  Plus, Trash2, Camera, Moon, IndianRupee,
  CheckCircle, Clock, AlertCircle, ToggleLeft, X
} from 'lucide-react';
import { OrderItem, AadharEntry } from '@/types';
import toast from 'react-hot-toast';

type Tab = 'info' | 'food' | 'ids' | 'billing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'info',    label: 'Info',    icon: <Users size={15} /> },
  { id: 'food',    label: 'Food',    icon: <ShoppingBag size={15} /> },
  { id: 'ids',     label: 'IDs',     icon: <CreditCard size={15} /> },
  { id: 'billing', label: 'Billing', icon: <Receipt size={15} /> },
];

const ROOM_META: Record<string, { emoji: string; label: string; color: string }> = {
  'room-gushaini':    { emoji: '🏡', label: 'Room (Gushaini)',         color: '#3E6B47' },
  'room-banjar':      { emoji: '🌄', label: 'Room (Banjar)',           color: '#2563EB' },
  'rooftop-gushaini': { emoji: '🏔️', label: 'RooftopCottage (Gushaini)', color: '#D4873A' },
  'rooftop-banjar':   { emoji: '⛺', label: 'RooftopCottage (Banjar)',   color: '#1C3A2A' },
};

const STATUS_CONFIG = {
  paid:    { label: 'Paid',         icon: CheckCircle,  color: '#3E6B47', bg: 'rgba(62,107,71,0.12)',   border: 'rgba(62,107,71,0.25)' },
  partial: { label: 'Partially Paid', icon: Clock,      color: '#A36520', bg: 'rgba(212,135,58,0.12)', border: 'rgba(212,135,58,0.3)' },
  unpaid:  { label: 'Unpaid',       icon: AlertCircle,  color: '#C0533A', bg: 'rgba(192,83,58,0.1)',   border: 'rgba(192,83,58,0.25)' },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default function GroupBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { groupBookings, rooms, addGroupItem, removeGroupItem, addGroupAadhar, removeGroupAadhar, recordGroupPayment, checkOutGroup } = useHomestay();

  const booking = groupBookings.find(b => b.id === id);
  const [tab, setTab] = useState<Tab>('info');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddAadhar, setShowAddAadhar] = useState(false);
  const [showPayInput, setShowPayInput] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add item form
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  // Add aadhar form
  const [aName, setAName] = useState('');
  const [aNumber, setANumber] = useState('');
  const [aImage, setAImage] = useState('');

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-lg font-semibold" style={{ color: '#1C3A2A' }}>Booking not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm underline" style={{ color: '#D4873A' }}>Go back</button>
      </div>
    );
  }

  const total = calculateGroupTotal(booking);
  const balance = Math.max(0, total - booking.amountPaid);
  const roomsCharge = Object.entries(booking.roomRates).reduce((s, [, r]) => s + r * booking.nights, 0);
  const itemsTotal = booking.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  const statusConf = STATUS_CONFIG[booking.paymentStatus];
  const StatusIcon = statusConf.icon;
  const isActive = booking.status === 'active';

  const handleAddItem = () => {
    if (!itemName.trim() || !itemPrice || parseFloat(itemPrice) <= 0) {
      toast.error('Fill item name and price');
      return;
    }
    addGroupItem(id, { name: itemName.trim(), quantity: parseInt(itemQty) || 1, pricePerUnit: parseFloat(itemPrice) });
    setItemName(''); setItemQty('1'); setItemPrice('');
    setShowAddItem(false);
    toast.success('Item added');
  };

  const handleAddAadhar = () => {
    if (!aName.trim() || !aNumber.trim()) {
      toast.error('Enter name and Aadhar number');
      return;
    }
    addGroupAadhar(id, { holderName: aName.trim(), number: aNumber.trim(), imageBase64: aImage || undefined });
    setAName(''); setANumber(''); setAImage('');
    setShowAddAadhar(false);
    toast.success('Aadhar added');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePay = () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter valid amount'); return; }
    if (amount > balance) { toast.error(`Exceeds balance ₹${formatINR(balance)}`); return; }
    recordGroupPayment(id, amount);
    setPayAmount(''); setShowPayInput(false);
    toast.success(`₹${formatINR(amount)} recorded`);
  };

  const handleCheckOut = () => {
    if (!confirm(`Check out ${booking.guestName} and free all ${booking.roomIds.length} rooms?`)) return;
    checkOutGroup(id);
    toast.success(`${booking.guestName} checked out`);
    router.push('/');
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none";
  const inputStyle = { background: '#FFFDF9', borderColor: 'rgba(28,58,42,0.2)', color: '#1A1A1A' };

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 pt-5 pb-3"
        style={{ background: 'rgba(247,243,238,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <ArrowLeft size={18} style={{ color: '#1C3A2A' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              {booking.guestName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: isActive ? 'rgba(212,135,58,0.15)' : 'rgba(62,107,71,0.12)', color: isActive ? '#A36520' : '#2D5235' }}
              >
                {isActive ? `${booking.roomIds.length} Rooms` : 'Checked Out'}
              </span>
              <span className="text-xs" style={{ color: '#7A7A6E' }}>
                {format(parseISO(booking.checkInDate), 'd MMM')} → {format(parseISO(booking.checkOutDate), 'd MMM')}
              </span>
            </div>
          </div>
          {isActive && (
            <span className="text-sm font-bold flex-shrink-0" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
              ₹{formatINR(balance)} due
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(28,58,42,0.06)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? '#FFFDF9' : 'transparent',
                color: tab === t.id ? '#1C3A2A' : '#7A7A6E',
                boxShadow: tab === t.id ? '0 1px 4px rgba(28,58,42,0.12)' : 'none',
              }}
            >
              {t.icon}
              <span className="hidden xs:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-6 space-y-4">

        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <div className="space-y-4 page-enter">
            {/* Rooms */}
            <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#7A7A6E' }}>Rooms</p>
              <div className="space-y-2">
                {booking.roomIds.map(roomId => {
                  const meta = ROOM_META[roomId];
                  const rate = booking.roomRates[roomId] || 0;
                  const room = rooms.find(r => r.id === roomId);
                  return (
                    <div key={roomId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(28,58,42,0.04)', border: '1px solid rgba(28,58,42,0.08)' }}>
                      <span className="text-lg">{meta?.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{meta?.label || roomId}</p>
                        <p className="text-xs" style={{ color: '#7A7A6E' }}>₹{formatINR(rate)}/night · {booking.nights} nights = ₹{formatINR(rate * booking.nights)}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: room?.status === 'occupied' ? 'rgba(212,135,58,0.15)' : 'rgba(62,107,71,0.12)', color: room?.status === 'occupied' ? '#A36520' : '#3E6B47' }}>
                        {room?.status === 'occupied' ? 'Occupied' : 'Free'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guest details */}
            <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#7A7A6E' }}>Guest</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>Name</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{booking.guestName}</p>
                </div>
                {booking.phone && (
                  <div>
                    <p className="text-xs" style={{ color: '#7A7A6E' }}>Phone</p>
                    <a href={`tel:+91${booking.phone}`} className="font-semibold" style={{ color: '#D4873A' }}>+91 {booking.phone}</a>
                  </div>
                )}
                <div>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>Guests</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
                    {booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>Nights</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{booking.nights}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>Check-in</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{format(parseISO(booking.checkInDate), 'd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#7A7A6E' }}>Check-out</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{format(parseISO(booking.checkOutDate), 'd MMM yyyy')}</p>
                </div>
                {booking.specialRequests && (
                  <div className="col-span-2">
                    <p className="text-xs" style={{ color: '#7A7A6E' }}>Special Requests</p>
                    <p className="font-medium" style={{ color: '#1A1A1A' }}>{booking.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Check out button */}
            {isActive && (
              <button
                onClick={handleCheckOut}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A', border: '1px solid rgba(192,83,58,0.25)' }}
              >
                <ToggleLeft size={18} />
                Check Out All Rooms
              </button>
            )}
          </div>
        )}

        {/* ── FOOD TAB ── */}
        {tab === 'food' && (
          <div className="space-y-3 page-enter">
            {!isActive && (
              <div className="rounded-xl px-4 py-2.5 text-xs font-medium" style={{ background: 'rgba(28,58,42,0.06)', color: '#7A7A6E' }}>
                Booking is checked out — read only
              </div>
            )}

            {isActive && (
              <button
                onClick={() => setShowAddItem(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: showAddItem ? 'rgba(192,83,58,0.1)' : 'rgba(212,135,58,0.12)', color: showAddItem ? '#C0533A' : '#A36520', border: `1px solid ${showAddItem ? 'rgba(192,83,58,0.25)' : 'rgba(212,135,58,0.3)'}` }}
              >
                {showAddItem ? <X size={15} /> : <Plus size={15} />}
                {showAddItem ? 'Cancel' : 'Add Item / Food'}
              </button>
            )}

            {showAddItem && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.2)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>New Item</p>
                <input type="text" placeholder="Item name (Maggi, Chai, Blanket…)" value={itemName} onChange={e => setItemName(e.target.value)} className={inputCls} style={inputStyle} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Qty</label>
                    <input type="number" min="1" value={itemQty} onChange={e => setItemQty(e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Price (₹)</label>
                    <input type="number" placeholder="0" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <button onClick={handleAddItem} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}>
                  Add Item
                </button>
              </div>
            )}

            {booking.items.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingBag size={36} className="mx-auto mb-2 opacity-20" style={{ color: '#7A7A6E' }} />
                <p className="text-sm" style={{ color: '#7A7A6E' }}>No items yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {booking.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{item.quantity} × ₹{formatINR(item.pricePerUnit)}</p>
                    </div>
                    <p className="text-sm font-semibold mr-2" style={{ color: '#1A1A1A' }}>₹{formatINR(item.quantity * item.pricePerUnit)}</p>
                    {isActive && (
                      <button onClick={() => removeGroupItem(id, item.id)} className="p-1.5 rounded-lg" style={{ color: '#C0533A', background: 'rgba(192,83,58,0.08)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(212,135,58,0.08)', border: '1px solid rgba(212,135,58,0.2)' }}>
                  <span className="text-sm font-medium" style={{ color: '#7A7A6E' }}>Items Subtotal</span>
                  <span className="text-sm font-bold" style={{ color: '#D4873A' }}>₹{formatINR(itemsTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IDs TAB ── */}
        {tab === 'ids' && (
          <div className="space-y-3 page-enter">
            {isActive && (
              <button
                onClick={() => setShowAddAadhar(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: showAddAadhar ? 'rgba(192,83,58,0.1)' : 'rgba(28,58,42,0.08)', color: showAddAadhar ? '#C0533A' : '#1C3A2A', border: `1px solid ${showAddAadhar ? 'rgba(192,83,58,0.2)' : 'rgba(28,58,42,0.15)'}` }}
              >
                {showAddAadhar ? <X size={15} /> : <Plus size={15} />}
                {showAddAadhar ? 'Cancel' : '+ Add Aadhar Card'}
              </button>
            )}

            {showAddAadhar && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.1)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#7A7A6E' }}>New Aadhar Entry</p>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7A7A6E' }}>Cardholder Name *</label>
                  <input type="text" placeholder="As on Aadhar card" value={aName} onChange={e => setAName(e.target.value)} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7A7A6E' }}>Aadhar Number *</label>
                  <input type="text" inputMode="numeric" placeholder="XXXX XXXX XXXX" maxLength={14} value={aNumber} onChange={e => setANumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim())} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7A7A6E' }}>Photo (optional)</label>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  {aImage ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={aImage} alt="Aadhar" className="w-full h-32 object-cover rounded-xl" />
                      <button onClick={() => setAImage('')} className="absolute top-2 right-2 p-1 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <X size={12} color="white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-dashed border-2 text-sm font-medium transition-all"
                      style={{ borderColor: 'rgba(28,58,42,0.2)', color: '#7A7A6E' }}
                    >
                      <Camera size={16} />
                      Capture / Upload
                    </button>
                  )}
                </div>
                <button onClick={handleAddAadhar} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
                  Save Aadhar
                </button>
              </div>
            )}

            {booking.aadharCards.length === 0 ? (
              <div className="text-center py-10">
                <CreditCard size={36} className="mx-auto mb-2 opacity-20" style={{ color: '#7A7A6E' }} />
                <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>No IDs added yet</p>
                <p className="text-xs mt-1" style={{ color: '#7A7A6E' }}>Add Aadhar cards for all guests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {booking.aadharCards.map((card, idx) => (
                  <div key={card.id} className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.1)' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: card.imageBase64 ? '1px solid rgba(28,58,42,0.06)' : 'none' }}>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#7A7A6E' }}>Guest {idx + 1}</p>
                        <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{card.holderName}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: '#7A7A6E' }}>{card.number}</p>
                      </div>
                      {isActive && (
                        <button onClick={() => removeGroupAadhar(id, card.id)} className="p-2 rounded-xl" style={{ background: 'rgba(192,83,58,0.1)', color: '#C0533A' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {card.imageBase64 && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={card.imageBase64} alt="Aadhar" className="w-full max-h-40 object-cover" />
                    )}
                  </div>
                ))}
                {isActive && (
                  <button
                    onClick={() => { setShowAddAadhar(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all active:scale-95"
                    style={{ borderColor: 'rgba(28,58,42,0.2)', color: '#1C3A2A' }}
                  >
                    <Plus size={15} />
                    Add Another Aadhar Card
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {tab === 'billing' && (
          <div className="space-y-4 page-enter">
            {/* View Bill Button */}
            <button
              onClick={() => router.push(`/bill/booking/${id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)', boxShadow: '0 3px 12px rgba(212,135,58,0.3)' }}
            >
              <Receipt size={16} />
              View &amp; Download Bill
            </button>

            {/* Status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit" style={{ background: statusConf.bg, border: `1px solid ${statusConf.border}` }}>
              <StatusIcon size={14} style={{ color: statusConf.color }} />
              <span className="text-sm font-semibold" style={{ color: statusConf.color }}>{statusConf.label}</span>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.1)' }}>
              {/* Per-room charges */}
              {booking.roomIds.map(roomId => {
                const meta = ROOM_META[roomId];
                const rate = booking.roomRates[roomId] || 0;
                return (
                  <div key={roomId} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{meta?.emoji} {meta?.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{booking.nights} nights × ₹{formatINR(rate)}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>₹{formatINR(rate * booking.nights)}</span>
                  </div>
                );
              })}
              {/* Items */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(28,58,42,0.06)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Items & Services</p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>{booking.items.length} item{booking.items.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>₹{formatINR(itemsTotal)}</span>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between px-4 py-4" style={{ background: 'rgba(28,58,42,0.03)' }}>
                <span className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>Total</span>
                <span className="text-xl font-bold" style={{ color: '#1C3A2A', fontFamily: 'var(--font-playfair)' }}>₹{formatINR(total)}</span>
              </div>
            </div>

            {/* Paid / Balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(62,107,71,0.1)', border: '1px solid rgba(62,107,71,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>Paid</p>
                <p className="text-base font-bold" style={{ color: '#3E6B47' }}>₹{formatINR(booking.amountPaid)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: balance > 0 ? 'rgba(192,83,58,0.08)' : 'rgba(62,107,71,0.08)', border: `1px solid ${balance > 0 ? 'rgba(192,83,58,0.2)' : 'rgba(62,107,71,0.2)'}` }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>Balance</p>
                <p className="text-base font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>{balance > 0 ? `₹${formatINR(balance)}` : 'Settled ✓'}</p>
              </div>
            </div>

            {/* Record payment */}
            {isActive && booking.paymentStatus !== 'paid' && (
              !showPayInput ? (
                <button onClick={() => setShowPayInput(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
                  <IndianRupee size={17} /> Record Payment
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                      <input type="number" placeholder={`Max ${formatINR(balance)}`} value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full pl-8 pr-3 py-3 rounded-xl border text-sm focus:outline-none bg-white" style={{ borderColor: 'rgba(28,58,42,0.2)' }} autoFocus />
                    </div>
                    <button onClick={() => setPayAmount(balance.toString())} className="px-3 py-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520' }}>Full</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPayInput(false); setPayAmount(''); }} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(28,58,42,0.06)', color: '#7A7A6E' }}>Cancel</button>
                    <button onClick={handlePay} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
                      Confirm ₹{payAmount ? formatINR(parseFloat(payAmount) || 0) : '—'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Nights summary */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(212,135,58,0.08)', border: '1px solid rgba(212,135,58,0.2)' }}>
              <Moon size={14} style={{ color: '#D4873A' }} />
              <span className="text-sm" style={{ color: '#A36520' }}>
                {booking.nights} night{booking.nights !== 1 ? 's' : ''} · {booking.roomIds.length} room{booking.roomIds.length !== 1 ? 's' : ''} · Room charges ₹{formatINR(roomsCharge)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
