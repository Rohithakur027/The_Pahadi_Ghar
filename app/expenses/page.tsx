'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Plus, Trash2, ChevronLeft, ChevronRight, Filter, TrendingDown, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
}

const EXPENSE_CATEGORIES = ['Utilities', 'Maintenance', 'Food & Supplies', 'Staff', 'Marketing', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  'Utilities':       '#3B82F6',
  'Maintenance':     '#EF4444',
  'Food & Supplies': '#F59E0B',
  'Staff':           '#8B5CF6',
  'Marketing':       '#EC4899',
  'Other':           '#6B7280',
};

function loadExpenses(): Expense[] {
  try { return JSON.parse(localStorage.getItem('homestay_expenses') || '[]'); } catch { return []; }
}

function saveExpenses(list: Expense[]) {
  localStorage.setItem('homestay_expenses', JSON.stringify(list));
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [allTime, setAllTime] = useState(false);

  const emptyForm = { category: 'Utilities', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter by month
  const periodExpenses = useMemo(() => {
    if (allTime) return expenses;
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return expenses.filter(e => {
      try { return isWithinInterval(parseISO(e.date), { start, end }); } catch { return false; }
    });
  }, [expenses, viewMonth, allTime]);

  // Filter by category
  const filtered = useMemo(() =>
    filterCategory === 'All' ? periodExpenses : periodExpenses.filter(e => e.category === filterCategory),
    [periodExpenses, filterCategory]
  );

  // Sort newest first
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  // Category totals for summary
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of periodExpenses) {
      map[e.category] = (map[e.category] || 0) + e.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [periodExpenses]);

  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const handleSave = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.date) { toast.error('Select a date'); return; }
    const newExp: Expense = { id: crypto.randomUUID(), ...form, amount };
    const updated = [...expenses, newExp];
    setExpenses(updated);
    saveExpenses(updated);
    setShowModal(false);
    setForm(emptyForm);
    toast.success('Expense added');
  };

  const handleDelete = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
    setDeleteConfirm(null);
    toast.success('Expense deleted');
  };

  const prevMonth = () => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EE' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between gap-3"
        style={{ background: 'rgba(247,243,238,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(28,58,42,0.08)' }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>Expenses</h1>
          <p className="text-xs" style={{ color: 'rgba(28,58,42,0.5)' }}>Track your costs</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#1C3A2A', color: '#FFFDF9' }}
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      <div className="px-4 md:px-8 py-5 max-w-2xl mx-auto md:max-w-none md:mx-0 space-y-5">

        {/* Period selector */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllTime(v => !v)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: allTime ? '#1C3A2A' : 'rgba(28,58,42,0.08)',
                color: allTime ? '#FFFDF9' : '#1C3A2A',
              }}
            >
              All Time
            </button>
            {!allTime && (
              <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: 'rgba(28,58,42,0.06)' }}>
                <button onClick={prevMonth} className="p-0.5 rounded-lg hover:bg-black/10">
                  <ChevronLeft size={14} style={{ color: '#1C3A2A' }} />
                </button>
                <span className="text-xs font-semibold px-1" style={{ color: '#1C3A2A', minWidth: 90, textAlign: 'center' }}>
                  {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button onClick={nextMonth} className="p-0.5 rounded-lg hover:bg-black/10">
                  <ChevronRight size={14} style={{ color: '#1C3A2A' }} />
                </button>
              </div>
            )}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} style={{ color: 'rgba(28,58,42,0.4)' }} />
            {['All', ...EXPENSE_CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: filterCategory === cat ? '#D4873A' : 'rgba(28,58,42,0.07)',
                  color: filterCategory === cat ? '#fff' : '#1C3A2A',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1 rounded-2xl p-4" style={{ background: '#1C3A2A' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} style={{ color: '#D4873A' }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {allTime ? 'Total Spent' : format(viewMonth, 'MMM') + ' Total'}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#FFFDF9' }}>
              ₹{totalExpenses.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {periodExpenses.length} expense{periodExpenses.length !== 1 ? 's' : ''}
            </p>
          </div>

          {categoryTotals.slice(0, 3).map(([cat, amt]) => (
            <div key={cat} className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] || '#6B7280' }} />
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(28,58,42,0.5)' }}>{cat}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#1C3A2A' }}>₹{amt.toLocaleString('en-IN')}</p>
              <p className="text-[10px]" style={{ color: 'rgba(28,58,42,0.35)' }}>
                {totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0}% of total
              </p>
            </div>
          ))}
        </div>

        {/* Category breakdown bar */}
        {categoryTotals.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(28,58,42,0.5)' }}>Breakdown by Category</p>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
              {categoryTotals.map(([cat, amt]) => (
                <div
                  key={cat}
                  style={{
                    width: `${(amt / totalExpenses) * 100}%`,
                    background: CATEGORY_COLORS[cat] || '#6B7280',
                    minWidth: 4,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {categoryTotals.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] || '#6B7280' }} />
                  <span className="text-xs" style={{ color: '#1C3A2A' }}>{cat}</span>
                  <span className="text-xs font-semibold" style={{ color: '#1C3A2A' }}>₹{amt.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(28,58,42,0.5)' }}>
            {sorted.length} {filterCategory !== 'All' ? filterCategory + ' ' : ''}Expense{sorted.length !== 1 ? 's' : ''}
          </p>

          {sorted.length === 0 ? (
            <div className="rounded-2xl py-14 flex flex-col items-center gap-3" style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(28,58,42,0.07)' }}>
                <IndianRupee size={22} style={{ color: 'rgba(28,58,42,0.3)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'rgba(28,58,42,0.4)' }}>No expenses yet</p>
              <button
                onClick={() => { setForm(emptyForm); setShowModal(true); }}
                className="text-xs font-semibold px-4 py-2 rounded-xl"
                style={{ background: '#1C3A2A', color: '#FFFDF9' }}
              >
                Add first expense
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map(exp => (
                <div
                  key={exp.id}
                  className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  style={{ background: '#FFFDF9', border: '1px solid rgba(28,58,42,0.08)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${CATEGORY_COLORS[exp.category] || '#6B7280'}18` }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[exp.category] || '#6B7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{exp.category}</span>
                      {exp.notes && (
                        <span className="text-xs truncate" style={{ color: 'rgba(28,58,42,0.45)' }}>— {exp.notes}</span>
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color: 'rgba(28,58,42,0.4)' }}>
                      {format(parseISO(exp.date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: '#1C3A2A' }}>
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </span>
                    {deleteConfirm === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: '#EF4444', color: '#fff' }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(exp.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: 'rgba(28,58,42,0.3)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: '#FFFDF9' }}
          >
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#1C3A2A' }}>
              Add Expense
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(28,58,42,0.6)' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
                  style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(28,58,42,0.6)' }}>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
                  style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(28,58,42,0.6)' }}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
                  style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(28,58,42,0.6)' }}>Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Electricity bill, AC repair..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[44px]"
                  style={{ borderColor: 'rgba(28,58,42,0.2)', background: '#FFFDF9', color: '#1A1A1A' }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: '#1C3A2A', color: '#FFFDF9' }}
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB for mobile */}
      <button
        onClick={() => { setForm(emptyForm); setShowModal(true); }}
        className="fixed bottom-24 right-4 md:hidden w-14 h-14 rounded-2xl flex items-center justify-center z-40 shadow-lg"
        style={{ background: '#1C3A2A' }}
        aria-label="Add expense"
      >
        <Plus size={22} style={{ color: '#FFFDF9' }} />
      </button>
    </div>
  );
}
