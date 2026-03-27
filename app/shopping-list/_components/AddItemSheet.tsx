'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import {
  ShoppingItem, ShoppingCategory, UrgencyLevel,
  UNITS, URGENCY_CONFIG, QUICK_ITEMS,
} from '../_lib/types';

type NewItem = Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>;

interface Props {
  onAdd: (item: NewItem) => void;
  onClose: () => void;
  addedInReview?: boolean;
}

// Auto-detect category from item name
function guessCategory(name: string): ShoppingCategory {
  const n = name.toLowerCase();
  if (['atta', 'rice', 'dal', 'oil', 'sugar', 'salt', 'chai', 'tea', 'biscuit', 'maida', 'besan', 'masala', 'spice', 'poha', 'suji'].some(k => n.includes(k))) return 'Grocery & Dry';
  if (['onion', 'tomato', 'potato', 'sabzi', 'vegetable', 'fruit', 'banana', 'apple', 'lemon', 'garlic', 'ginger', 'carrot', 'cabbage'].some(k => n.includes(k))) return 'Vegetables & Fruits';
  if (['soap', 'detergent', 'toilet', 'bedsheet', 'mop', 'broom', 'dustbin', 'towel', 'napkin', 'tissue'].some(k => n.includes(k))) return 'Housekeeping';
  if (['gas', 'cylinder', 'bulb', 'wire', 'screw', 'paint', 'pipe', 'lock', 'battery', 'tape'].some(k => n.includes(k))) return 'Maintenance & Hardware';
  if (['plate', 'bowl', 'spoon', 'pan', 'vessel', 'glass', 'knife', 'ladle', 'tray', 'lid'].some(k => n.includes(k))) return 'Kitchen Supplies';
  return 'Grocery & Dry';
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function AddItemSheet({ onAdd, onClose, addedInReview }: Props) {
  const [name, setName]     = useState('');
  const [qty, setQty]       = useState(1);
  const [unit, setUnit]     = useState('pieces');
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [notes, setNotes]   = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 120); }, []);

  const suggestions = name.trim()
    ? QUICK_ITEMS.filter(i => i.toLowerCase().includes(name.toLowerCase()))
    : QUICK_ITEMS;

  const handleAdd = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    onAdd({
      name: name.trim(),
      quantity: qty,
      unit,
      category: guessCategory(name),
      urgency,
      addedBy: 'Staff',
      addedByRole: 'staff',
      notes: notes.trim() || undefined,
      addedInReview,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-8 space-y-4 slide-up"
        style={{ background: '#FFFDF9', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Add Item{addedInReview && (
              <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,135,58,0.15)', color: '#D4873A' }}>
                In Review
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <X size={16} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        {/* Item name with autocomplete */}
        <div className="relative">
          <input
            ref={nameRef}
            type="text"
            placeholder="Type item name…"
            value={name}
            onChange={e => { setName(e.target.value); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') { setShowSugg(false); handleAdd(); }
              if (e.key === 'Escape') setShowSugg(false);
            }}
            className="w-full px-4 py-3.5 rounded-2xl border text-base font-medium focus:outline-none"
            style={{ borderColor: name.trim() ? 'rgba(28,58,42,0.4)' : 'rgba(28,58,42,0.18)', background: '#F7F3EE', color: '#1A1A1A' }}
          />
          {showSugg && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 rounded-2xl overflow-hidden z-20"
              style={{
                background: '#FFFDF9',
                border: '1px solid rgba(28,58,42,0.15)',
                boxShadow: '0 8px 28px rgba(28,58,42,0.14)',
                maxHeight: 192,
                overflowY: 'auto',
              }}
            >
              {suggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={e => { e.preventDefault(); setName(s); setShowSugg(false); nameRef.current?.focus(); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all"
                  style={{ color: '#1C3A2A', borderBottom: '1px solid rgba(28,58,42,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(28,58,42,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <HighlightedText text={s} query={name} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity + Unit */}
        <div className="flex gap-3 items-end">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Quantity</p>
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(28,58,42,0.07)' }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: '#1C3A2A' }}
              >
                <Minus size={13} style={{ color: '#FFFDF9' }} />
              </button>
              <span className="w-10 text-center text-base font-bold" style={{ color: '#1C3A2A' }}>{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: '#1C3A2A' }}
              >
                <Plus size={13} style={{ color: '#FFFDF9' }} />
              </button>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Unit</p>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: 'rgba(28,58,42,0.18)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }}
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Urgency</p>
          <select
            value={urgency}
            onChange={e => setUrgency(e.target.value as UrgencyLevel)}
            className="w-full px-3 py-3 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: 'rgba(28,58,42,0.18)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }}
          >
            {(['urgent', 'normal', 'whenever'] as UrgencyLevel[]).map(u => (
              <option key={u} value={u}>
                {URGENCY_CONFIG[u].dot} {URGENCY_CONFIG[u].label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <input
          type="text"
          placeholder="Any specific brand or note? (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          className="w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none"
          style={{ borderColor: 'rgba(28,58,42,0.18)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: name.trim() ? '#1C3A2A' : 'rgba(28,58,42,0.25)', color: '#FFFDF9' }}
          >
            Add to List ✓
          </button>
        </div>
      </div>
    </div>
  );
}
