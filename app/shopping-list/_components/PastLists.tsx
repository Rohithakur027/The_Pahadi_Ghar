'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ShoppingList, ShoppingItem, Shopkeeper } from '../_lib/types';

interface Props {
  lists: ShoppingList[];
  allItems: ShoppingItem[];
  shopkeepers: Shopkeeper[];
  onStartSimilar: (items: ShoppingItem[]) => void;
}

export default function PastLists({ lists, allItems, shopkeepers, onStartSimilar }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (lists.length === 0) return null;

  return (
    <div className="px-4 md:px-8 mt-8 mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold mb-3"
        style={{ color: 'rgba(28,58,42,0.6)' }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Past Lists ({lists.length})
      </button>

      {open && (
        <div className="space-y-2">
          {lists.map(list => {
            const listItems = allItems.filter(i => i.listId === list.id && i.status !== 'removed');
            const approvedCount = listItems.filter(i => i.status === 'approved' || i.status === 'bought').length;
            const isExpanded = expandedId === list.id;

            return (
              <div key={list.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(28,58,42,0.1)', background: '#FFFDF9' }}>
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : list.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1C3A2A' }}>{list.title}</p>
                    <p className="text-xs" style={{ color: 'rgba(28,58,42,0.45)' }}>
                      {list.createdAt ? format(new Date(list.createdAt), 'd MMM yyyy') : ''}
                      {' · '}{approvedCount} item{approvedCount !== 1 ? 's' : ''}
                      {' · '}
                      <span style={{ color: '#22C55E', fontWeight: 600 }}>Sent ✓</span>
                    </p>
                  </div>
                  {isExpanded ? <ChevronDown size={16} style={{ color: 'rgba(28,58,42,0.4)' }} /> : <ChevronRight size={16} style={{ color: 'rgba(28,58,42,0.4)' }} />}
                </button>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(28,58,42,0.08)' }}>
                    {/* Items */}
                    <div className="px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto">
                      {listItems.map(item => {
                        const sk = shopkeepers.find(s => s.id === item.shopkeeperId);
                        const qty = item.approvedQuantity ?? item.quantity;
                        return (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span style={{ color: '#1C3A2A' }}>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#D4873A', fontWeight: 600 }}>{qty} {item.unit}</span>
                              {sk && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(28,58,42,0.08)', color: 'rgba(28,58,42,0.6)' }}>{sk.name}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Start similar */}
                    <div className="px-4 pb-4 pt-2">
                      <button
                        onClick={() => onStartSimilar(listItems)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold w-full justify-center"
                        style={{ background: 'rgba(28,58,42,0.08)', color: '#1C3A2A' }}
                      >
                        <RefreshCw size={14} />
                        Start Similar List ({listItems.length} items)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
