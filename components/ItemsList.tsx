'use client';

import { useState } from 'react';
import { OrderItem } from '@/types';
import { Plus, Trash2, ShoppingBag, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ItemsListProps {
  items: OrderItem[];
  onAdd: (item: Omit<OrderItem, 'id' | 'addedAt'>) => void;
  onRemove: (itemId: string) => void;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default function ItemsList({ items, onAdd, onRemove }: ItemsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  const totalItems = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const handleAdd = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Required';
    if (!price || parseFloat(price) <= 0) errs.price = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    onAdd({ name: name.trim(), quantity: parseInt(qty) || 1, pricePerUnit: parseFloat(price) });
    setName(''); setQty('1'); setPrice('');
    setShowForm(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-warmamber/40 focus:border-warmamber transition-all";

  return (
    <div className="space-y-3">
      {/* Add Item Button */}
      <button
        onClick={() => setShowForm(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
        style={{
          background: showForm ? 'rgba(192,83,58,0.1)' : 'rgba(212,135,58,0.12)',
          color: showForm ? '#C0533A' : '#A36520',
          border: `1px solid ${showForm ? 'rgba(192,83,58,0.25)' : 'rgba(212,135,58,0.3)'}`,
        }}
      >
        {showForm ? <X size={16} /> : <Plus size={16} />}
        {showForm ? 'Cancel' : 'Add Item / Food'}
      </button>

      {/* Inline Add Form */}
      {showForm && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: '#FFFDF9', border: '1px solid rgba(212,135,58,0.2)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A7A6E' }}>New Item</p>
          <div>
            <input
              type="text"
              placeholder="Item name (e.g. Maggi, Chai, Blanket)"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
              className={inputClass}
              style={{ borderColor: errors.name ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
            />
            {errors.name && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>Item name is required</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Qty</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className={inputClass}
                style={{ borderColor: 'rgba(28,58,42,0.15)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#7A7A6E' }}>Price (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={price}
                onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: undefined })); }}
                className={inputClass}
                style={{ borderColor: errors.price ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
              />
              {errors.price && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>Required</p>}
            </div>
          </div>
          {name && price && (
            <p className="text-xs" style={{ color: '#7A7A6E' }}>
              Subtotal: ₹{formatINR((parseInt(qty) || 1) * parseFloat(price || '0'))}
            </p>
          )}
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #D4873A, #E8A55A)' }}
          >
            <Check size={16} />
            Add Item
          </button>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" style={{ color: '#7A7A6E' }} />
          <p className="text-sm" style={{ color: '#7A7A6E' }}>No items ordered yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                  {item.quantity} × ₹{formatINR(item.pricePerUnit)} •{' '}
                  {format(parseISO(item.addedAt), 'h:mm a')}
                </p>
              </div>
              <div className="text-right mr-2">
                <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                  ₹{formatINR(item.quantity * item.pricePerUnit)}
                </p>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="p-1.5 rounded-lg transition-all active:scale-90"
                style={{ color: '#C0533A', background: 'rgba(192,83,58,0.08)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Items total */}
          <div
            className="flex justify-between items-center px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(212,135,58,0.08)', border: '1px solid rgba(212,135,58,0.2)' }}
          >
            <span className="text-sm font-medium" style={{ color: '#7A7A6E' }}>Items Subtotal</span>
            <span className="text-sm font-bold" style={{ color: '#D4873A' }}>
              ₹{formatINR(totalItems)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
