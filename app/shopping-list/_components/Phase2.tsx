'use client';

import { useState, useMemo } from 'react';
import { Plus, Check, X, Minus, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { ShoppingItem, ShoppingCategory, CATEGORIES, CATEGORY_ICONS, URGENCY_CONFIG, sortItems } from '../_lib/types';
import AddItemSheet from './AddItemSheet';

interface Props {
  items: ShoppingItem[];
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>) => void;
  onUpdateItem: (id: string, changes: Partial<ShoppingItem>) => void;
  onDeleteItem: (id: string) => void;
  onApprove: () => void;
  approvedCount: number;
  removedCount: number;
}

export default function Phase2({ items, onAddItem, onUpdateItem, onDeleteItem, onApprove, approvedCount, removedCount }: Props) {
  const [showSheet, setShowSheet] = useState(false);
  const [editQtyId, setEditQtyId] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [showRemoved, setShowRemoved] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  const pendingItems  = useMemo(() => items.filter(i => i.status === 'pending'),  [items]);
  const removedItems  = useMemo(() => items.filter(i => i.status === 'removed'),  [items]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<ShoppingCategory, ShoppingItem[]>();
    for (const cat of CATEGORIES) {
      const catItems = sortItems(pendingItems.filter(i => i.category === cat));
      if (catItems.length > 0) map.set(cat, catItems);
    }
    return map;
  }, [pendingItems]);

  const toggleCat = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleApprove = (item: ShoppingItem) => {
    onUpdateItem(item.id, { status: item.status === 'pending' ? 'removed' : 'pending' });
  };

  const changeQty = (item: ShoppingItem, delta: number) => {
    const current = item.approvedQuantity ?? item.quantity;
    const next = Math.max(1, current + delta);
    onUpdateItem(item.id, { approvedQuantity: next });
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-32">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Review & Approve</h2>
          <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>Edit quantities, remove items, then approve</p>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
        >
          <Plus size={13} /> Add Item
        </button>
      </div>

      {/* Category groups */}
      {[...grouped.entries()].map(([cat, catItems]) => {
        const collapsed = collapsedCats.has(cat);
        return (
          <div key={cat} className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(28,58,42,0.1)' }}>
            {/* Category header */}
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: 'rgba(28,58,42,0.05)' }}
            >
              <span className="flex items-center gap-2 text-sm font-bold" style={{ color: '#1C3A2A' }}>
                {CATEGORY_ICONS[cat]} {cat}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(28,58,42,0.1)', color: 'rgba(28,58,42,0.6)' }}>
                  {catItems.length}
                </span>
              </span>
              {collapsed ? <ChevronRight size={16} style={{ color: 'rgba(28,58,42,0.4)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(28,58,42,0.4)' }} />}
            </button>

            {!collapsed && (
              <div style={{ background: '#FFFDF9' }}>
                {catItems.map((item, idx) => {
                  const cfg = URGENCY_CONFIG[item.urgency];
                  const displayQty = item.approvedQuantity ?? item.quantity;
                  const isEditing = editQtyId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3.5"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(28,58,42,0.06)' }}
                    >
                      {/* Approve/Remove checkbox */}
                      <button
                        onClick={() => toggleApprove(item)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#22C55E', color: '#fff' }}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{item.name}</span>
                          {item.addedInReview && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212,135,58,0.15)', color: '#D4873A' }}>
                              + Review
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.dot}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>{item.addedBy}</p>
                        {item.notes && <p className="text-[11px] italic" style={{ color: 'rgba(28,58,42,0.4)' }}>{item.notes}</p>}
                      </div>

                      {/* Inline qty edit */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => changeQty(item, -1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(28,58,42,0.1)' }}>
                              <Minus size={12} style={{ color: '#1C3A2A' }} />
                            </button>
                            <span className="w-10 text-center text-sm font-bold" style={{ color: '#1C3A2A' }}>
                              {displayQty} {item.unit}
                            </span>
                            <button onClick={() => changeQty(item, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(28,58,42,0.1)' }}>
                              <Plus size={12} style={{ color: '#1C3A2A' }} />
                            </button>
                            <button onClick={() => setEditQtyId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center ml-1" style={{ background: '#22C55E' }}>
                              <Check size={12} style={{ color: '#fff' }} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditQtyId(item.id)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                          >
                            {displayQty} {item.unit}
                            {item.approvedQuantity && item.approvedQuantity !== item.quantity && (
                              <span className="ml-1 line-through text-[10px]" style={{ color: 'rgba(28,58,42,0.35)' }}>
                                {item.quantity}
                              </span>
                            )}
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={() => toggleApprove(item)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center ml-1"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Removed items */}
      {removedItems.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowRemoved(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold mb-2"
            style={{ color: 'rgba(28,58,42,0.5)' }}
          >
            {showRemoved ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Removed Items ({removedItems.length}) — tap to restore
          </button>
          {showRemoved && (
            <div className="space-y-2">
              {removedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl opacity-50"
                  style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
                >
                  <span className="flex-1 text-sm line-through" style={{ color: '#1C3A2A' }}>
                    {item.name} — {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => onUpdateItem(item.id, { status: 'pending' })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(28,58,42,0.1)', color: '#1C3A2A', opacity: 1 }}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add item sheet */}
      {showSheet && (
        <AddItemSheet
          onAdd={onAddItem}
          onClose={() => setShowSheet(false)}
          defaultAddedByRole="manager"
          addedInReview
        />
      )}

      {/* Approve footer */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 px-4 py-3 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(28,58,42,0.1)' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto md:max-w-2xl">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,58,42,0.6)' }}>
            {pendingItems.length} pending · {removedItems.length} removed
          </span>
          <button
            onClick={() => setConfirmApprove(true)}
            className="px-5 py-3 rounded-2xl text-sm font-bold"
            style={{ background: '#22C55E', color: '#fff', minHeight: 48 }}
          >
            Approve &amp; Assign →
          </button>
        </div>
      </div>

      {/* Confirm approve modal */}
      {confirmApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9' }}>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Approve {pendingItems.length} items?
            </h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(28,58,42,0.6)' }}>
              {removedItems.length > 0 && `${removedItems.length} removed item${removedItems.length !== 1 ? 's' : ''} will be discarded. `}
              You'll assign items to shopkeepers next.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmApprove(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmApprove(false); onApprove(); }} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: '#22C55E', color: '#fff' }}>
                Approve ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
