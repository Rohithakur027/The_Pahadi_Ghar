'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import {
  ShoppingItem, ShoppingCategory, UrgencyLevel, AddedByRole,
  CATEGORIES, CATEGORY_ICONS, UNITS, URGENCY_CONFIG, QUICK_ITEMS, ROLES,
  loadAddedBy, saveAddedBy,
} from '../_lib/types';

type NewItem = Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>;

interface Props {
  onAdd: (item: NewItem) => void;
  onClose: () => void;
  defaultAddedByRole?: AddedByRole;
  addedInReview?: boolean;
}

export default function AddItemSheet({ onAdd, onClose, defaultAddedByRole, addedInReview }: Props) {
  const saved = loadAddedBy();
  const [name, setName]         = useState('');
  const [qty, setQty]           = useState(1);
  const [unit, setUnit]         = useState('pieces');
  const [category, setCategory] = useState<ShoppingCategory>('Grocery & Dry');
  const [urgency, setUrgency]   = useState<UrgencyLevel>('normal');
  const [role, setRole]         = useState<AddedByRole>(defaultAddedByRole ?? saved.role);
  const [byName, setByName]     = useState(saved.name);
  const [notes, setNotes]       = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 120); }, []);

  const handleAdd = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    const addedBy = byName.trim() ? `${ROLES.find(r => r.value === role)?.label} - ${byName.trim()}` : ROLES.find(r => r.value === role)?.label ?? role;
    saveAddedBy({ name: byName.trim(), role });
    onAdd({
      name: name.trim(), quantity: qty, unit, category,
      urgency, addedBy, addedByRole: role,
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
        className="w-full max-w-lg rounded-t-3xl px-5 pt-5 pb-8 space-y-4"
        style={{ background: '#FFFDF9', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
            Add Item {addedInReview && <span className="text-xs font-normal ml-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,135,58,0.15)', color: '#D4873A' }}>In Review</span>}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <X size={16} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        {/* Item name */}
        <div>
          <input
            ref={nameRef}
            type="text"
            placeholder="Item name…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className="w-full px-4 py-3 rounded-2xl border text-base font-medium"
            style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 52 }}
          />
          {/* Quick chips */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {QUICK_ITEMS.map(chip => (
              <button
                key={chip}
                onClick={() => setName(chip)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                style={{ background: name === chip ? '#D4873A' : 'rgba(28,58,42,0.08)', color: name === chip ? '#fff' : '#1C3A2A' }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                style={{ background: category === cat ? '#1C3A2A' : 'rgba(28,58,42,0.07)', color: category === cat ? '#FFFDF9' : '#1C3A2A' }}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Unit */}
        <div className="flex gap-3">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Quantity</p>
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(28,58,42,0.07)' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1C3A2A' }}>
                <Minus size={13} style={{ color: '#FFFDF9' }} />
              </button>
              <span className="w-10 text-center text-base font-bold" style={{ color: '#1C3A2A' }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1C3A2A' }}>
                <Plus size={13} style={{ color: '#FFFDF9' }} />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Unit</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {UNITS.map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{ background: unit === u ? '#D4873A' : 'rgba(28,58,42,0.07)', color: unit === u ? '#fff' : '#1C3A2A' }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Urgency</p>
          <div className="flex gap-2">
            {(['urgent', 'normal', 'whenever'] as UrgencyLevel[]).map(u => {
              const cfg = URGENCY_CONFIG[u];
              return (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                  style={{
                    background: urgency === u ? cfg.color : 'rgba(28,58,42,0.07)',
                    color: urgency === u ? '#fff' : '#1C3A2A',
                  }}
                >
                  {cfg.dot} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Added by */}
        <div className="flex gap-3">
          <div className="w-32">
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Role</p>
            <select
              value={role}
              onChange={e => setRole(e.target.value as AddedByRole)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 44 }}
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>Your name</p>
            <input
              type="text"
              placeholder="e.g. Ramesh"
              value={byName}
              onChange={e => setByName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 44 }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <input
            type="text"
            placeholder="Any specific brand or store? (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border text-sm"
            style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }}
          />
        </div>

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
            style={{ background: name.trim() ? '#1C3A2A' : 'rgba(28,58,42,0.3)', color: '#FFFDF9' }}
          >
            Add to List ✓
          </button>
        </div>
      </div>
    </div>
  );
}
