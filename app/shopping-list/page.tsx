'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
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
  const [listName, setListName]   = useState(generateListTitle());
  const [category, setCategory]  = useState('');
  const [skName, setSkName]       = useState('');
  const [skPhone, setSkPhone]     = useState('');

  const handleCreate = () => {
    if (!listName.trim()) { toast.error('List name is required'); return; }
    onCreate({
      title: listName.trim(),
      listCategory: category as any || undefined,
      shopkeeperName: skName.trim() || undefined,
      shopkeeperPhone: skPhone.trim() || undefined,
    });
    onClose();
  };

  const inputCls = "w-full px-3 py-3 rounded-xl border text-sm focus:outline-none transition-all";
  const inputStyle = { borderColor: 'rgba(28,58,42,0.18)', background: '#fff' };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: '#FFFDF9', boxShadow: '0 20px 60px rgba(28,58,42,0.3)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(28,58,42,0.08)' }}>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>New Shopping List</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(28,58,42,0.08)' }}>
            <X size={14} style={{ color: '#1C3A2A' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* List name */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#7A7A6E' }}>List Name *</label>
            <input
              type="text"
              value={listName}
              onChange={e => setListName(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="e.g. Weekly Grocery Run"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: '#7A7A6E' }}>Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? '' : cat)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                  style={{
                    background: category === cat ? 'rgba(28,58,42,0.1)' : 'rgba(28,58,42,0.04)',
                    color: category === cat ? '#1C3A2A' : '#7A7A6E',
                    border: `1.5px solid ${category === cat ? 'rgba(28,58,42,0.3)' : 'transparent'}`,
                  }}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="leading-tight">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shopkeeper */}
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
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(28,58,42,0.07)', color: '#1C3A2A' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  const [lists,    setLists]    = useState<ShoppingList[]>(loadLists);
  const [allItems, setAllItems] = useState<ShoppingItem[]>(loadItems);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Active = most recent list that is still being worked on (not archived/sent)
  const activeList = useMemo(
    () => [...lists]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find(l => l.status === 'open' || l.status === 'under_review')
      ?? null,
    [lists]
  );

  const activeItems = useMemo(
    () => (activeList ? allItems.filter(i => i.listId === activeList.id) : []),
    [allItems, activeList]
  );

  const pastLists = useMemo(
    () => lists
      .filter(l => l.status !== 'open' && l.status !== 'under_review')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists]
  );

  // ── List CRUD ──────────────────────────────────────────────────────────────

  const createList = (data: Omit<ShoppingList, 'id' | 'createdAt' | 'phase' | 'status'>): ShoppingList => {
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
    return newList;
  };

  const updateList = (changes: Partial<ShoppingList>) => {
    if (!activeList) return;
    const updated = lists.map(l => (l.id === activeList.id ? { ...l, ...changes } : l));
    setLists(updated);
    saveLists(updated);
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────────

  const addItem = (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>, listId?: string) => {
    const targetId = listId ?? activeList?.id;
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
    updateList({ phase: 2, status: 'under_review', reviewedAt: new Date().toISOString() });
    toast.success('List sent for manager review ✓');
  };

  const finalizeList = () => {
    // Items marked "addToFuture" stay as pending, others move to 'approved' conceptually (status stays pending for Phase 3 display)
    // Remove items that are "removed"
    const updated = allItems.map(i => {
      if (i.listId !== activeList?.id) return i;
      if (i.status === 'removed') return i; // keep removed for audit
      return i;
    });
    setAllItems(updated);
    saveItems(updated);
    updateList({ phase: 3 });
    toast.success('List finalised ✓');
  };

  const markSent = () => {
    updateList({ status: 'sent', sentAt: new Date().toISOString() });
    toast.success('Shopping list marked as sent ✓');
  };

  const updateShopkeeperPhone = (phone: string) => {
    updateList({ shopkeeperPhone: phone });
    toast.success('Shopkeeper number saved ✓');
  };

  const currentPhase = (activeList?.phase ?? 1) as 1 | 2 | 3;

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30"
        style={{ background: 'rgba(247,243,238,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        <div className="px-4 md:px-8 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Shopping List</h1>
              <p className="text-xs" style={{ color: 'rgba(28,58,42,0.45)' }}>
                {activeList
                  ? `${activeList.title}${activeList.shopkeeperName ? ` · ${activeList.shopkeeperName}` : ''}`
                  : 'No active list'}
              </p>
            </div>
            {(!activeList || activeList.status === 'sent') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#1C3A2A', color: '#FFFDF9' }}
              >
                + New List
              </button>
            )}
          </div>
          {activeList && <PhaseStrip phase={currentPhase} />}
        </div>
      </div>

      {/* No active list — prompt */}
      {!activeList && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="text-5xl mb-4">🛒</div>
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

      {/* Phase content */}
      {activeList && (
        <>
          {currentPhase === 1 && (
            <Phase1
              items={activeItems}
              listTitle={activeList.title}
              shopkeeperName={activeList.shopkeeperName}
              listCategory={activeList.listCategory}
              onAddItem={(item) => addItem(item)}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onSendForReview={sendForReview}
              listExists
              onCreateList={() => setShowCreateModal(true)}
            />
          )}
          {currentPhase === 2 && (
            <Phase2
              items={activeItems}
              shopkeeperName={activeList.shopkeeperName}
              shopkeeperPhone={activeList.shopkeeperPhone}
              listCategory={activeList.listCategory}
              onAddItem={(item) => addItem({ ...item, addedInReview: true })}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onFinalize={finalizeList}
            />
          )}
          {currentPhase === 3 && (
            <Phase3
              items={activeItems}
              listTitle={activeList.title}
              listCategory={activeList.listCategory}
              shopkeeperName={activeList.shopkeeperName}
              shopkeeperPhone={activeList.shopkeeperPhone}
              onUpdatePhone={updateShopkeeperPhone}
              onMarkSent={markSent}
            />
          )}
        </>
      )}

      {/* Past lists */}
      <PastLists
        lists={pastLists}
        allItems={allItems}
        shopkeepers={[]}
        onStartSimilar={(items) => {
          setShowCreateModal(true);
          // After modal creates, user can add items — for now just show modal
          toast('Create a new list first, then items will be copied', { icon: '📋' });
        }}
      />

      {/* Create list modal */}
      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => {
            createList(data);
            toast.success('List created! Add items below ✓');
          }}
        />
      )}
    </div>
  );
}
