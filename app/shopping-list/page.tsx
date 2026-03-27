'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { X, ArrowLeft, ChevronRight, ShoppingCart, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  ShoppingItem, ShoppingList,
  loadLists, saveLists, loadItems, saveItems,
  CATEGORIES, CATEGORY_ICONS,
  generateListTitle,
} from './_lib/types';
import PhaseStrip from './_components/PhaseStrip';
import Phase1 from './_components/Phase1';
import Phase2 from './_components/Phase2';
import Phase3 from './_components/Phase3';
import PastLists from './_components/PastLists';

// ── Create-list modal ──────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreate: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'phase' | 'status'>) => void;
}

function CreateListModal({ onClose, onCreate }: CreateModalProps) {
  const [listName, setListName] = useState(generateListTitle());
  const [skName, setSkName]     = useState('');
  const [skPhone, setSkPhone]   = useState('');

  const handleCreate = () => {
    if (!listName.trim()) { toast.error('List name is required'); return; }
    onCreate({
      title: listName.trim(),
      shopkeeperName: skName.trim() || undefined,
      shopkeeperPhone: skPhone.trim() || undefined,
    });
    onClose();
  };

  const inputCls   = "w-full px-3 py-3 rounded-xl border text-sm focus:outline-none";
  const inputStyle = { borderColor: 'rgba(28,58,42,0.18)', background: '#fff', color: '#1A1A1A' };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: '#FFFDF9', boxShadow: '0 20px 60px rgba(28,58,42,0.3)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.08)' }}>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>New Shopping List</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <X size={14} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#7A7A6E' }}>List Name *</label>
            <input
              type="text"
              value={listName}
              onChange={e => setListName(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. Weekly Grocery Run"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#7A7A6E' }}>Shopkeeper Name</label>
            <input
              type="text"
              value={skName}
              onChange={e => setSkName(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. Ramesh ji, Sharma Store"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#7A7A6E' }}>
              WhatsApp Number <span style={{ color: '#AAAAAA', fontWeight: 400 }}>(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#7A7A6E' }}>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={skPhone}
                onChange={e => setSkPhone(e.target.value.replace(/\D/g, ''))}
                className={inputCls}
                style={{ ...inputStyle, paddingLeft: '3rem' }}
                placeholder="10-digit mobile number"
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A' }}>
            Cancel
          </button>
          <button onClick={handleCreate} className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}>
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Phase label helper ─────────────────────────────────────────────────────────

function phaseLabel(list: ShoppingList) {
  if (list.phase === 1) return { text: 'Adding Items', icon: '📝', color: '#3E6B47', bg: 'rgba(62,107,71,0.1)' };
  if (list.phase === 2) return { text: 'Under Review', icon: '🔍', color: '#D4873A', bg: 'rgba(212,135,58,0.1)' };
  return { text: 'Ready to Send', icon: '📤', color: '#1C3A2A', bg: 'rgba(28,58,42,0.1)' };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  const [lists,    setLists]    = useState<ShoppingList[]>(loadLists);
  const [allItems, setAllItems] = useState<ShoppingItem[]>(loadItems);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListId, setSelectedListId]   = useState<string | null>(null);

  const activeLists = useMemo(
    () => [...lists]
      .filter(l => l.status === 'open' || l.status === 'under_review')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists]
  );

  const pastLists = useMemo(
    () => lists
      .filter(l => l.status !== 'open' && l.status !== 'under_review')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists]
  );

  const selectedList  = selectedListId ? (lists.find(l => l.id === selectedListId) ?? null) : null;
  const selectedItems = selectedList ? allItems.filter(i => i.listId === selectedList.id) : [];
  const currentPhase  = (selectedList?.phase ?? 1) as 1 | 2 | 3;

  // ── List CRUD ──────────────────────────────────────────────────────────────

  const createList = (data: Omit<ShoppingList, 'id' | 'createdAt' | 'phase' | 'status'>): void => {
    const newList: ShoppingList = {
      ...data,
      id: crypto.randomUUID(),
      phase: 1,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const updated = [...lists, newList];
    setLists(updated);
    saveLists(updated);
    setSelectedListId(newList.id);
  };

  const updateList = (listId: string, changes: Partial<ShoppingList>) => {
    const updated = lists.map(l => (l.id === listId ? { ...l, ...changes } : l));
    setLists(updated);
    saveLists(updated);
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────────

  const addItem = (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>, listId?: string) => {
    const targetId = listId ?? selectedList?.id;
    if (!targetId) return;
    const newItem: ShoppingItem = {
      ...item,
      id: crypto.randomUUID(),
      listId: targetId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const updated = [...allItems, newItem];
    setAllItems(updated);
    saveItems(updated);
  };

  const updateItem = (id: string, changes: Partial<ShoppingItem>) => {
    const updated = allItems.map(i => (i.id === id ? { ...i, ...changes } : i));
    setAllItems(updated);
    saveItems(updated);
  };

  const deleteItem = (id: string) => {
    const updated = allItems.filter(i => i.id !== id);
    setAllItems(updated);
    saveItems(updated);
  };

  // ── Phase transitions ──────────────────────────────────────────────────────

  const sendForReview = () => {
    if (!selectedList) return;
    updateList(selectedList.id, { phase: 2, status: 'under_review', reviewedAt: new Date().toISOString() });
    toast.success('List sent for manager review ✓');
  };

  const finalizeList = () => {
    if (!selectedList) return;
    updateList(selectedList.id, { phase: 3 });
    toast.success('List finalised ✓');
  };

  const markSent = () => {
    if (!selectedList) return;
    updateList(selectedList.id, { status: 'sent', sentAt: new Date().toISOString() });
    toast.success('Shopping list marked as sent ✓');
    setSelectedListId(null);
  };

  const updateShopkeeperPhone = (phone: string) => {
    if (!selectedList) return;
    updateList(selectedList.id, { shopkeeperPhone: phone });
    toast.success('Shopkeeper number saved ✓');
  };

  // ── Render: phase management view ─────────────────────────────────────────

  if (selectedList) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
        {/* Sticky header */}
        <div
          className="sticky top-0 z-30"
          style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
        >
          <div className="px-4 md:px-8 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setSelectedListId(null)}
                className="p-2 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold truncate" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                  {selectedList.title}
                </h1>
                {selectedList.shopkeeperName && (
                  <p className="text-xs truncate" style={{ color: 'rgba(28,58,42,0.45)' }}>
                    For: {selectedList.shopkeeperName}
                  </p>
                )}
              </div>
            </div>
            <PhaseStrip phase={currentPhase} />
          </div>
        </div>

        {/* Phase content */}
        {currentPhase === 1 && (
          <Phase1
            items={selectedItems}
            listTitle={selectedList.title}
            shopkeeperName={selectedList.shopkeeperName}
            listCategory={selectedList.listCategory}
            onAddItem={item => addItem(item)}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onSendForReview={sendForReview}
            listExists
            onCreateList={() => setShowCreateModal(true)}
          />
        )}
        {currentPhase === 2 && (
          <Phase2
            items={selectedItems}
            shopkeeperName={selectedList.shopkeeperName}
            shopkeeperPhone={selectedList.shopkeeperPhone}
            listCategory={selectedList.listCategory}
            onAddItem={item => addItem({ ...item, addedInReview: true })}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onFinalize={finalizeList}
          />
        )}
        {currentPhase === 3 && (
          <Phase3
            items={selectedItems}
            listTitle={selectedList.title}
            listCategory={selectedList.listCategory}
            shopkeeperName={selectedList.shopkeeperName}
            shopkeeperPhone={selectedList.shopkeeperPhone}
            onUpdatePhone={updateShopkeeperPhone}
            onMarkSent={markSent}
          />
        )}
      </div>
    );
  }

  // ── Render: main landing page ──────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Shopping Lists</h1>
            <p className="text-xs" style={{ color: 'rgba(28,58,42,0.45)' }}>
              {activeLists.length > 0 ? `${activeLists.length} active` : 'No active lists'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1C3A2A', color: '#FFFDF9' }}
          >
            + New List
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 pt-4 pb-8 space-y-6">

        {/* Active lists */}
        {activeLists.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(28,58,42,0.45)' }}>
              Active
            </p>
            <div className="space-y-3">
              {activeLists.map(list => {
                const phase = phaseLabel(list);
                const itemCount = allItems.filter(i => i.listId === list.id && i.status !== 'removed').length;
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className="w-full text-left rounded-2xl px-4 py-4 flex items-center gap-3 transition-all active:scale-[0.99]"
                    style={{
                      background: '#FFFDF9',
                      border: '1.5px solid rgba(28,58,42,0.1)',
                      borderLeft: '4px solid #3E6B47',
                      boxShadow: '0 2px 8px rgba(28,58,42,0.06)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(28,58,42,0.07)' }}>
                      <ShoppingCart size={18} style={{ color: '#1C3A2A' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#1C3A2A' }}>{list.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: phase.bg, color: phase.color }}>
                          {phase.icon} {phase.text}
                        </span>
                        <span className="text-[11px]" style={{ color: 'rgba(28,58,42,0.45)' }}>
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                        {list.shopkeeperName && (
                          <span className="text-[11px]" style={{ color: 'rgba(28,58,42,0.45)' }}>
                            · {list.shopkeeperName}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'rgba(28,58,42,0.3)', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'rgba(28,58,42,0.07)' }}>
              <ShoppingCart size={28} style={{ color: 'rgba(28,58,42,0.3)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              No active shopping list
            </p>
            <p className="text-sm mb-5" style={{ color: 'rgba(28,58,42,0.5)' }}>Create a new list to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
            >
              + Create New List
            </button>
          </div>
        )}

        {/* Past lists */}
        {pastLists.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(28,58,42,0.45)' }}>
              Past Lists
            </p>
            <PastLists
              lists={pastLists}
              allItems={allItems}
              shopkeepers={[]}
              onStartSimilar={() => {
                setShowCreateModal(true);
                toast('Create a new list first, then add items', { icon: '📋' });
              }}
            />
          </div>
        )}
      </div>

      {/* Create list modal */}
      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreate={data => {
            createList(data);
            toast.success('List created! Add items below ✓');
          }}
        />
      )}
    </div>
  );
}
