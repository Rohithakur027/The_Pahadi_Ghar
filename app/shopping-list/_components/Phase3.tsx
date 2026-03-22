'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShoppingItem, Shopkeeper, ShoppingCategory, CATEGORIES, CATEGORY_ICONS } from '../_lib/types';

interface Props {
  items: ShoppingItem[];
  shopkeepers: Shopkeeper[];
  onUpdateItem: (id: string, changes: Partial<ShoppingItem>) => void;
  onCreateFinalLists: () => void;
  onAddShopkeeper: (sk: Omit<Shopkeeper, 'id'>) => void;
  onUpdateShopkeeper: (id: string, changes: Partial<Shopkeeper>) => void;
  onDeleteShopkeeper: (id: string) => void;
}

const emptyForm = { name: '', phone: '', specialty: '', notes: '' };

export default function Phase3({
  items, shopkeepers, onUpdateItem, onCreateFinalLists,
  onAddShopkeeper, onUpdateShopkeeper, onDeleteShopkeeper,
}: Props) {
  const [showSkForm, setShowSkForm] = useState(false);
  const [skForm, setSkForm]         = useState(emptyForm);
  const [editSkId, setEditSkId]     = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);

  const approvedItems = useMemo(() => items.filter(i => i.status === 'approved'), [items]);

  const grouped = useMemo(() => {
    const map = new Map<ShoppingCategory, ShoppingItem[]>();
    for (const cat of CATEGORIES) {
      const catItems = approvedItems.filter(i => i.category === cat);
      if (catItems.length > 0) map.set(cat, catItems);
    }
    return map;
  }, [approvedItems]);

  const unassignedCount = approvedItems.filter(i => !i.shopkeeperId).length;
  const allAssigned = unassignedCount === 0 && approvedItems.length > 0;

  const assignItem = (itemId: string, skId: string | undefined) => {
    onUpdateItem(itemId, { shopkeeperId: skId });
  };

  const assignCategoryToSk = (cat: ShoppingCategory, skId: string) => {
    const catItems = grouped.get(cat) || [];
    catItems.forEach(item => assignItem(item.id, skId));
    toast.success(`All ${cat} items assigned`);
  };

  const saveShopkeeper = () => {
    if (!skForm.name.trim()) { toast.error('Enter a name'); return; }
    if (editSkId) {
      onUpdateShopkeeper(editSkId, { name: skForm.name.trim(), phone: skForm.phone.trim(), specialty: skForm.specialty.trim() || undefined, notes: skForm.notes.trim() || undefined });
      toast.success('Shopkeeper updated');
    } else {
      onAddShopkeeper({ name: skForm.name.trim(), phone: skForm.phone.trim(), specialty: skForm.specialty.trim() || undefined, notes: skForm.notes.trim() || undefined });
      toast.success('Shopkeeper added');
    }
    setSkForm(emptyForm);
    setShowSkForm(false);
    setEditSkId(null);
  };

  return (
    <div className="px-4 md:px-8 pt-4 pb-32">
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Assign to Shopkeepers</h2>
        <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>
          {approvedItems.length} approved items · {unassignedCount > 0 ? `${unassignedCount} unassigned` : 'All assigned ✓'}
        </p>
      </div>

      {/* Shopkeeper chips management */}
      <div className="mb-5 rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.1)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold" style={{ color: 'rgba(28,58,42,0.6)' }}>YOUR SHOPKEEPERS</p>
          <button
            onClick={() => { setSkForm(emptyForm); setEditSkId(null); setShowSkForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: '#1C3A2A', color: '#FFFDF9' }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {shopkeepers.length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: 'rgba(28,58,42,0.4)' }}>
            No shopkeepers yet — add them to start assigning items
          </p>
        ) : (
          <div className="space-y-2">
            {shopkeepers.map(sk => (
              <div key={sk.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: '#D4873A', color: '#fff' }}
                >
                  {sk.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{sk.name}</p>
                  {sk.specialty && <p className="text-[11px]" style={{ color: 'rgba(28,58,42,0.45)' }}>{sk.specialty}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setSkForm({ name: sk.name, phone: sk.phone, specialty: sk.specialty || '', notes: sk.notes || '' }); setEditSkId(sk.id); setShowSkForm(true); }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { onDeleteShopkeeper(sk.id); approvedItems.filter(i => i.shopkeeperId === sk.id).forEach(i => assignItem(i.id, undefined)); }}
                    className="px-2 py-1.5 rounded-lg"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items by category */}
      {[...grouped.entries()].map(([cat, catItems]) => (
        <div key={cat} className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(28,58,42,0.1)' }}>
          {/* Category header + bulk assign */}
          <div className="px-4 py-3" style={{ background: 'rgba(28,58,42,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: '#1C3A2A' }}>
                {CATEGORY_ICONS[cat]} {cat}
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(28,58,42,0.1)', color: 'rgba(28,58,42,0.6)' }}>
                  {catItems.length}
                </span>
              </span>
            </div>
            {shopkeepers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(28,58,42,0.4)' }}>Assign all {cat} to:</p>
                <div className="flex gap-2 flex-wrap">
                  {shopkeepers.map(sk => (
                    <button
                      key={sk.id}
                      onClick={() => assignCategoryToSk(cat, sk.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: '#D4873A', color: '#fff' }}
                    >
                      {sk.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ background: '#FFFDF9' }}>
            {catItems.map((item, idx) => {
              const assignedSk = shopkeepers.find(s => s.id === item.shopkeeperId);
              return (
                <div
                  key={item.id}
                  className="px-4 py-3.5"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(28,58,42,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{item.name}</span>
                      <span className="text-xs ml-2" style={{ color: '#D4873A' }}>
                        {item.approvedQuantity ?? item.quantity} {item.unit}
                      </span>
                    </div>
                    {assignedSk && (
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-xl"
                          style={{ background: 'rgba(212,135,58,0.15)', color: '#D4873A' }}
                        >
                          {assignedSk.name}
                        </span>
                        <button
                          onClick={() => assignItem(item.id, undefined)}
                          className="p-1 rounded-lg"
                          style={{ color: 'rgba(28,58,42,0.4)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Shopkeeper pills */}
                  {!assignedSk && shopkeepers.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {shopkeepers.map(sk => (
                        <button
                          key={sk.id}
                          onClick={() => assignItem(item.id, sk.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >
                          {sk.name}
                        </button>
                      ))}
                      <button
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                        disabled
                      >
                        Unassigned
                      </button>
                    </div>
                  )}
                  {shopkeepers.length === 0 && (
                    <p className="text-xs" style={{ color: 'rgba(28,58,42,0.4)' }}>Add a shopkeeper above to assign</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {unassignedCount > 0 && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: '#EF4444' }}>
            ⚠️ {unassignedCount} item{unassignedCount !== 1 ? 's' : ''} have no shopkeeper assigned
          </span>
        </div>
      )}

      {/* Shopkeeper form modal */}
      {showSkForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowSkForm(false); } }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: '#FFFDF9' }}>
            <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              {editSkId ? 'Edit Shopkeeper' : 'Add Shopkeeper'}
            </h3>
            <input type="text" placeholder="Store / Person Name *" value={skForm.name} onChange={e => setSkForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border text-sm" style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }} />
            <input type="tel" placeholder="Phone number" value={skForm.phone} onChange={e => setSkForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border text-sm" style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }} />
            <input type="text" placeholder="What they supply (e.g. Grocery & Dry)" value={skForm.specialty} onChange={e => setSkForm(f => ({ ...f, specialty: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border text-sm" style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#F7F3EE', color: '#1A1A1A', minHeight: 48 }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowSkForm(false); setSkForm(emptyForm); setEditSkId(null); }}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                Cancel
              </button>
              <button onClick={saveShopkeeper} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: '#1C3A2A', color: '#FFFDF9' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 px-4 py-3 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(28,58,42,0.1)' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto md:max-w-2xl">
          <span className="text-xs font-semibold" style={{ color: 'rgba(28,58,42,0.6)' }}>
            {unassignedCount > 0 ? `${unassignedCount} items unassigned` : 'All items assigned ✓'}
          </span>
          <button
            onClick={() => allAssigned ? setConfirmCreate(true) : toast.error('Assign all items first')}
            className="px-5 py-3 rounded-2xl text-sm font-bold"
            style={{ background: allAssigned ? '#1C3A2A' : 'rgba(28,58,42,0.3)', color: '#FFFDF9', minHeight: 48 }}
          >
            Create Final Lists →
          </button>
        </div>
      </div>

      {confirmCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: '#FFFDF9' }}>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Create final lists?</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(28,58,42,0.6)' }}>
              Lists will be ready to send to {shopkeepers.length} shopkeeper{shopkeepers.length !== 1 ? 's' : ''} via WhatsApp or PDF.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCreate(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmCreate(false); onCreateFinalLists(); }} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: '#1C3A2A', color: '#FFFDF9' }}>
                Create Lists ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
