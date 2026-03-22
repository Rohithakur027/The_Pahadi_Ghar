'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingItem, ShoppingList, Shopkeeper,
  loadLists, saveLists, loadItems, saveItems,
  loadShopkeepers, saveShopkeepers,
  generateListTitle,
} from './_lib/types';
import PhaseStrip from './_components/PhaseStrip';
import Phase1 from './_components/Phase1';
import Phase2 from './_components/Phase2';
import Phase3 from './_components/Phase3';
import Phase4 from './_components/Phase4';
import PastLists from './_components/PastLists';

export default function ShoppingListPage() {
  const [lists,       setLists]       = useState<ShoppingList[]>(loadLists);
  const [allItems,    setAllItems]    = useState<ShoppingItem[]>(loadItems);
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>(loadShopkeepers);

  // Active = most recent non-sent list
  const activeList = useMemo(
    () => [...lists].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find(l => l.status !== 'sent') ?? null,
    [lists]
  );

  const activeItems = useMemo(
    () => (activeList ? allItems.filter(i => i.listId === activeList.id) : []),
    [allItems, activeList]
  );

  const pastLists = useMemo(
    () => lists.filter(l => l.status === 'sent').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lists]
  );

  // ── List creation ─────────────────────────────────────────────────────────

  const createList = (): ShoppingList => {
    const newList: ShoppingList = {
      id: crypto.randomUUID(),
      title: generateListTitle(),
      phase: 1,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const updated = [...lists, newList];
    setLists(updated);
    saveLists(updated);
    return newList;
  };

  const getOrCreateList = () => activeList ?? createList();

  // ── Item CRUD ─────────────────────────────────────────────────────────────

  const addItem = (item: Omit<ShoppingItem, 'id' | 'listId' | 'createdAt' | 'status'>) => {
    const list = getOrCreateList();
    const newItem: ShoppingItem = {
      ...item,
      id: crypto.randomUUID(),
      listId: list.id,
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

  // ── Phase transitions ─────────────────────────────────────────────────────

  const updateList = (changes: Partial<ShoppingList>) => {
    if (!activeList) return;
    const updated = lists.map(l => (l.id === activeList.id ? { ...l, ...changes } : l));
    setLists(updated);
    saveLists(updated);
  };

  const sendForReview = () => {
    updateList({ phase: 2, status: 'under_review', reviewedAt: new Date().toISOString() });
    toast.success('List sent for review ✓');
  };

  const approveList = () => {
    // Mark all pending items as approved
    const updated = allItems.map(i =>
      i.listId === activeList?.id && i.status === 'pending' ? { ...i, status: 'approved' as const } : i
    );
    setAllItems(updated);
    saveItems(updated);
    updateList({ phase: 3, status: 'approved', approvedAt: new Date().toISOString() });
    toast.success('List approved ✓');
  };

  const createFinalLists = () => {
    updateList({ phase: 4 });
    toast.success('Final lists created ✓');
  };

  const markSent = () => {
    updateList({ status: 'sent', sentAt: new Date().toISOString() });
    toast.success('Shopping lists sent ✓');
  };

  // ── Shopkeeper CRUD ───────────────────────────────────────────────────────

  const addShopkeeper = (sk: Omit<Shopkeeper, 'id'>) => {
    const newSk: Shopkeeper = { ...sk, id: crypto.randomUUID() };
    const updated = [...shopkeepers, newSk];
    setShopkeepers(updated);
    saveShopkeepers(updated);
  };

  const updateShopkeeper = (id: string, changes: Partial<Shopkeeper>) => {
    const updated = shopkeepers.map(s => (s.id === id ? { ...s, ...changes } : s));
    setShopkeepers(updated);
    saveShopkeepers(updated);
  };

  const deleteShopkeeper = (id: string) => {
    const updated = shopkeepers.filter(s => s.id !== id);
    setShopkeepers(updated);
    saveShopkeepers(updated);
  };

  // ── Counts ────────────────────────────────────────────────────────────────

  const pendingCount  = activeItems.filter(i => i.status === 'pending').length;
  const approvedCount = activeItems.filter(i => i.status === 'approved').length;
  const removedCount  = activeItems.filter(i => i.status === 'removed').length;

  const currentPhase = activeList?.phase ?? 1;

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
              <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
                Shopping List
              </h1>
              <p className="text-xs" style={{ color: 'rgba(28,58,42,0.45)' }}>
                {activeList ? activeList.title : 'No active list'}
              </p>
            </div>
            {activeList?.status === 'sent' || !activeList ? (
              <button
                onClick={createList}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#1C3A2A', color: '#FFFDF9' }}
              >
                + New List
              </button>
            ) : null}
          </div>
          <PhaseStrip phase={currentPhase as 1 | 2 | 3 | 4} />
        </div>
      </div>

      {/* Phase content */}
      <div>
        {currentPhase === 1 && (
          <Phase1
            items={activeItems}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onSendForReview={sendForReview}
            listExists={!!activeList}
            onCreateList={createList}
          />
        )}
        {currentPhase === 2 && (
          <Phase2
            items={activeItems}
            onAddItem={(item) => addItem({ ...item, addedInReview: true })}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onApprove={approveList}
            approvedCount={approvedCount}
            removedCount={removedCount}
          />
        )}
        {currentPhase === 3 && (
          <Phase3
            items={activeItems}
            shopkeepers={shopkeepers}
            onUpdateItem={updateItem}
            onCreateFinalLists={createFinalLists}
            onAddShopkeeper={addShopkeeper}
            onUpdateShopkeeper={updateShopkeeper}
            onDeleteShopkeeper={deleteShopkeeper}
          />
        )}
        {currentPhase === 4 && (
          <Phase4
            items={activeItems}
            shopkeepers={shopkeepers}
            listTitle={activeList?.title ?? ''}
            onMarkSent={markSent}
          />
        )}
      </div>

      {/* Past lists */}
      <PastLists
        lists={pastLists}
        allItems={allItems}
        shopkeepers={shopkeepers}
        onStartSimilar={(items) => {
          const newList = createList();
          const newItems: ShoppingItem[] = items.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            listId: newList.id,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            shopkeeperId: undefined,
            approvedQuantity: undefined,
            addedInReview: undefined,
          }));
          const updated = [...allItems, ...newItems];
          setAllItems(updated);
          saveItems(updated);
          toast.success(`${newItems.length} items copied to new list`);
        }}
      />
    </div>
  );
}
