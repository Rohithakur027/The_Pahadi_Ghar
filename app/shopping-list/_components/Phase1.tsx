'use client';

import { useState } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShoppingItem, URGENCY_CONFIG, CATEGORY_ICONS, sortItems } from '../_lib/types';
import AddItemSheet from './AddItemSheet';

interface Props {
  items: ShoppingItem[];
  listTitle?: string;
  shopkeeperName?: string;
  listCategory?: string;
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>) => void;
  onUpdateItem: (id: string, changes: Partial<ShoppingItem>) => void;
  onDeleteItem: (id: string) => void;
  onSendForReview: () => void;
  listExists: boolean;
  onCreateList: () => void;
}

export default function Phase1({ items, listTitle, shopkeeperName, listCategory, onAddItem, onUpdateItem, onDeleteItem, onSendForReview, listExists, onCreateList }: Props) {
  const [showSheet, setShowSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmReview, setConfirmReview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = sortItems(items.filter(i => i.status !== 'removed'));

  const handleSendReview = () => {
    if (sorted.length < 1) { toast.error('Add at least one item first'); return; }
    setConfirmReview(true);
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-8">
      {/* Shopkeeper / category info */}
      {(shopkeeperName || listCategory) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {shopkeeperName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(62,107,71,0.1)', color: '#3E6B47', border: '1px solid rgba(62,107,71,0.2)' }}>
              🏪 For: {shopkeeperName}
            </div>
          )}
          {listCategory && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(212,135,58,0.1)', color: '#A36520' }}>
              {listCategory}
            </div>
          )}
        </div>
      )}

      {/* Add button at top */}
      <button
        onClick={() => { if (!listExists) onCreateList(); setShowSheet(true); }}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-base font-semibold mb-5"
        style={{ background: '#D4873A', color: '#fff', minHeight: 56 }}
      >
        <Plus size={20} />
        Add Item
      </button>

      {sorted.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(28,58,42,0.07)' }}>
            <ShoppingCart size={28} style={{ color: 'rgba(28,58,42,0.3)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Nothing needed yet</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(28,58,42,0.45)' }}>Add groceries, supplies, anything the property needs</p>
          </div>
          <button
            onClick={() => { if (!listExists) onCreateList(); setShowSheet(true); }}
            className="px-6 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: '#1C3A2A', color: '#FFFDF9' }}
          >
            Add First Item
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(28,58,42,0.45)' }}>
            {sorted.length} item{sorted.length !== 1 ? 's' : ''} · Sorted by urgency
          </p>

          <div className="space-y-2.5">
            {sorted.map(item => {
              const cfg = URGENCY_CONFIG[item.urgency];
              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)', borderLeft: `4px solid ${cfg.color}` }}
                >
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold" style={{ color: '#1C3A2A' }}>{item.name}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.dot} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: '#D4873A' }}>
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(28,58,42,0.45)' }}>
                        Added by {item.addedBy}
                      </p>
                      {item.notes && (
                        <p className="text-[11px] italic mt-0.5" style={{ color: 'rgba(28,58,42,0.4)' }}>{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xl">{CATEGORY_ICONS[item.category]}</span>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                          className="p-1.5 rounded-xl"
                          style={{ color: 'rgba(28,58,42,0.4)' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpen === item.id && (
                          <div
                            className="absolute right-0 top-8 rounded-2xl shadow-xl z-10 overflow-hidden"
                            style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.1)', minWidth: 140 }}
                          >
                            <button
                              onClick={() => { setEditId(item.id); setMenuOpen(null); setShowSheet(true); }}
                              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium"
                              style={{ color: '#1C3A2A' }}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(item.id); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium"
                              style={{ color: '#EF4444', borderTop: '1px solid rgba(28,58,42,0.06)' }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FAB */}
      {sorted.length > 0 && (
        <button
          onClick={() => setShowSheet(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-40 shadow-lg"
          style={{ background: '#1C3A2A' }}
        >
          <Plus size={22} style={{ color: '#FFFDF9' }} />
        </button>
      )}

      {/* Send for review footer */}
      {sorted.length >= 1 && (
        <div
          className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 px-4 py-3 z-30"
          style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(28,58,42,0.1)' }}
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto md:max-w-2xl">
            <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>
              {sorted.length} item{sorted.length !== 1 ? 's' : ''} added
            </span>
            <button
              onClick={handleSendReview}
              className="px-5 py-3 rounded-2xl text-sm font-bold"
              style={{ background: '#1C3A2A', color: '#FFFDF9', minHeight: 48 }}
            >
              Send for Review →
            </button>
          </div>
        </div>
      )}

      {/* Confirm review modal */}
      {confirmReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9' }}>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Lock list for review?
            </h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(28,58,42,0.6)' }}>
              You won't be able to add more items. The manager will review and approve this list.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReview(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmReview(false); onSendForReview(); }} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: '#1C3A2A', color: '#FFFDF9' }}>
                Yes, Send for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9' }}>
            <p className="text-base font-bold mb-4" style={{ color: '#1C3A2A' }}>Remove this item?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>Cancel</button>
              <button onClick={() => { onDeleteItem(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: '#EF4444', color: '#fff' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit sheet */}
      {showSheet && (
        <AddItemSheet
          onAdd={onAddItem}
          onClose={() => { setShowSheet(false); setEditId(null); }}
        />
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
