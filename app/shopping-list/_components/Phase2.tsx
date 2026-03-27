'use client';

import { useState, useMemo } from 'react';
import { Plus, Check, X, Minus, RotateCcw, ChevronDown, ChevronRight, BookmarkPlus } from 'lucide-react';
import { ShoppingItem, ShoppingCategory, CATEGORIES, CATEGORY_ICONS, URGENCY_CONFIG, sortItems } from '../_lib/types';
import AddItemSheet from './AddItemSheet';

interface Props {
  items: ShoppingItem[];
  shopkeeperName?: string;
  shopkeeperPhone?: string;
  listCategory?: string;
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>) => void;
  onUpdateItem: (id: string, changes: Partial<ShoppingItem>) => void;
  onDeleteItem: (id: string) => void;
  onFinalize: () => void;
}

export default function Phase2({ items, shopkeeperName, shopkeeperPhone, listCategory, onAddItem, onUpdateItem, onDeleteItem, onFinalize }: Props) {
  const [showSheet, setShowSheet]       = useState(false);
  const [editQtyId, setEditQtyId]       = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [showRemoved, setShowRemoved]   = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const pendingItems = useMemo(() => items.filter(i => i.status === 'pending'), [items]);
  const removedItems = useMemo(() => items.filter(i => i.status === 'removed'), [items]);
  const futureItems  = useMemo(() => pendingItems.filter(i => i.addToFuture), [pendingItems]);

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

  const removeItem   = (item: ShoppingItem) => onUpdateItem(item.id, { status: 'removed' });
  const restoreItem  = (item: ShoppingItem) => onUpdateItem(item.id, { status: 'pending' });
  const toggleFuture = (item: ShoppingItem) => onUpdateItem(item.id, { addToFuture: !item.addToFuture });

  const changeQty = (item: ShoppingItem, delta: number) => {
    const current = item.approvedQuantity ?? item.quantity;
    onUpdateItem(item.id, { approvedQuantity: Math.max(1, current + delta) });
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-32">

      {/* Shopkeeper info chip */}
      {(shopkeeperName || listCategory) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {shopkeeperName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(62,107,71,0.1)', color: '#3E6B47', border: '1px solid rgba(62,107,71,0.2)' }}>
              🏪 {shopkeeperName}{shopkeeperPhone ? ` · ${shopkeeperPhone}` : ''}
            </div>
          )}
          {listCategory && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(212,135,58,0.1)', color: '#A36520' }}>
              {listCategory}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Review & Finalise</h2>
          <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>Edit quantities · remove items · mark for future list</p>
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
                  const isEditing  = editQtyId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="px-4 py-3.5"
                      style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(28,58,42,0.06)', opacity: item.addToFuture ? 0.65 : 1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{item.name}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.dot} {cfg.label}
                            </span>
                            {item.addToFuture && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                                📌 Future List
                              </span>
                            )}
                            {item.addedInReview && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212,135,58,0.15)', color: '#D4873A' }}>
                                + Review
                              </span>
                            )}
                          </div>
                          {item.notes && <p className="text-[11px] italic mt-0.5" style={{ color: 'rgba(28,58,42,0.4)' }}>{item.notes}</p>}
                          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(28,58,42,0.4)' }}>by {item.addedBy}</p>
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isEditing ? (
                            <>
                              <button onClick={() => changeQty(item, -1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(28,58,42,0.1)' }}>
                                <Minus size={12} style={{ color: '#1C3A2A' }} />
                              </button>
                              <span className="w-12 text-center text-sm font-bold" style={{ color: '#1C3A2A' }}>
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
                        </div>
                      </div>

                      {/* Action row */}
                      <div className="flex items-center gap-2 mt-2.5">
                        {/* Add to Future toggle */}
                        <button
                          onClick={() => toggleFuture(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{
                            background: item.addToFuture ? 'rgba(59,130,246,0.12)' : 'rgba(28,58,42,0.06)',
                            color: item.addToFuture ? '#3B82F6' : 'rgba(28,58,42,0.5)',
                            border: `1px solid ${item.addToFuture ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                          }}
                        >
                          <BookmarkPlus size={11} />
                          {item.addToFuture ? 'In Future List' : 'Add to Future'}
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                        >
                          <X size={11} /> Remove
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
            Removed ({removedItems.length}) — tap to restore
          </button>
          {showRemoved && (
            <div className="space-y-2">
              {removedItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl opacity-50" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
                  <span className="flex-1 text-sm line-through" style={{ color: '#1C3A2A' }}>
                    {item.name} — {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => restoreItem(item)}
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

      {futureItems.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-2xl" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#3B82F6' }}>
            📌 {futureItems.length} item{futureItems.length !== 1 ? 's' : ''} marked for future list — will be saved separately
          </p>
        </div>
      )}

      {showSheet && (
        <AddItemSheet
          onAdd={onAddItem}
          onClose={() => setShowSheet(false)}
          addedInReview
        />
      )}

      {/* Finalize footer */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 px-4 py-3 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(28,58,42,0.1)' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto md:max-w-2xl">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,58,42,0.6)' }}>
            {pendingItems.length - futureItems.length} to send · {futureItems.length} future · {removedItems.length} removed
          </span>
          <button
            onClick={() => setConfirmFinalize(true)}
            disabled={pendingItems.length - futureItems.length < 1}
            className="px-5 py-3 rounded-2xl text-sm font-bold disabled:opacity-40"
            style={{ background: '#1C3A2A', color: '#FFFDF9', minHeight: 48 }}
          >
            Finalise List →
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9' }}>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Finalise {pendingItems.length - futureItems.length} items?
            </h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(28,58,42,0.6)' }}>
              {removedItems.length > 0 && `${removedItems.length} removed item${removedItems.length !== 1 ? 's' : ''} will be discarded. `}
              {futureItems.length > 0 && `${futureItems.length} item${futureItems.length !== 1 ? 's' : ''} will be saved for a future list. `}
              Ready to download and send to the shopkeeper.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmFinalize(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                Cancel
              </button>
              <button
                onClick={() => { setConfirmFinalize(false); onFinalize(); }}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold"
                style={{ background: '#1C3A2A', color: '#FFFDF9' }}
              >
                Finalise ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
