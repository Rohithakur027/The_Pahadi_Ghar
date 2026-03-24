// ── Types ────────────────────────────────────────────────────────────────────

export type ShoppingCategory =
  | 'Grocery & Dry'
  | 'Vegetables & Fruits'
  | 'Housekeeping'
  | 'Maintenance & Hardware'
  | 'Kitchen Supplies'
  | 'Other';

export type UrgencyLevel = 'urgent' | 'normal' | 'whenever';
export type ItemStatus = 'pending' | 'approved' | 'removed' | 'bought';
export type AddedByRole = 'chef' | 'manager' | 'staff' | 'owner';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  urgency: UrgencyLevel;
  addedBy: string;
  addedByRole: AddedByRole;
  notes?: string;
  status: ItemStatus;
  approvedQuantity?: number;
  shopkeeperId?: string;
  listId: string;
  createdAt: string;
  addedInReview?: boolean;
  addToFuture?: boolean;
}

export interface ShoppingList {
  id: string;
  title: string;
  listCategory?: ShoppingCategory;
  shopkeeperName?: string;
  shopkeeperPhone?: string;
  phase: 1 | 2 | 3;
  status: 'open' | 'under_review' | 'sent';
  createdAt: string;
  reviewedAt?: string;
  sentAt?: string;
}

export interface Shopkeeper {
  id: string;
  name: string;
  phone: string;
  specialty?: string;
  notes?: string;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const LISTS_KEY = 'pahadi_shopping_lists';
const ITEMS_KEY = 'pahadi_shopping_items';
const SK_KEY    = 'pahadi_shopkeepers';
const AB_KEY    = 'pahadi_shopping_addedby';

const VALID_STATUSES = new Set(['open', 'under_review', 'sent']);
const VALID_PHASES   = new Set([1, 2, 3]);

export const loadLists = (): ShoppingList[] => {
  try {
    const raw: any[] = JSON.parse(localStorage.getItem(LISTS_KEY) || '[]');
    return raw.map(l => ({
      ...l,
      // Migrate old 'approved' status or any unknown status → 'sent' (archived)
      status: VALID_STATUSES.has(l.status) ? l.status : 'sent',
      // Migrate phase 4 (old final phase) → 3; any other unknown phase → 1
      phase: VALID_PHASES.has(l.phase) ? l.phase : (l.phase === 4 ? 3 : 1),
    }));
  } catch { return []; }
};
export const saveLists       = (d: ShoppingList[]) => localStorage.setItem(LISTS_KEY, JSON.stringify(d));
export const loadItems = (): ShoppingItem[] => { try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch { return []; } };
export const saveItems       = (d: ShoppingItem[]) => localStorage.setItem(ITEMS_KEY, JSON.stringify(d));
export const loadShopkeepers = (): Shopkeeper[]    => { try { return JSON.parse(localStorage.getItem(SK_KEY)    || '[]'); } catch { return []; } };
export const saveShopkeepers = (d: Shopkeeper[])   => localStorage.setItem(SK_KEY, JSON.stringify(d));
export const loadAddedBy     = (): { name: string; role: AddedByRole } => { try { return JSON.parse(localStorage.getItem(AB_KEY) || '{"name":"","role":"staff"}'); } catch { return { name: '', role: 'staff' }; } };
export const saveAddedBy     = (d: { name: string; role: AddedByRole }) => localStorage.setItem(AB_KEY, JSON.stringify(d));

// ── Constants ─────────────────────────────────────────────────────────────────

export const CATEGORIES: ShoppingCategory[] = [
  'Grocery & Dry', 'Vegetables & Fruits', 'Housekeeping',
  'Maintenance & Hardware', 'Kitchen Supplies', 'Other',
];

export const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  'Grocery & Dry':        '🛒',
  'Vegetables & Fruits':  '🥦',
  'Housekeeping':         '🧹',
  'Maintenance & Hardware': '🔧',
  'Kitchen Supplies':     '🍳',
  'Other':                '📦',
};

export const UNITS = ['kg', 'g', 'pieces', 'packets', 'litres', 'bottles', 'cylinders', 'bags', 'dozens', 'boxes', 'rolls'];

export const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; bg: string; dot: string; border: string }> = {
  urgent:   { label: 'Urgent',   color: '#EF4444', bg: '#FEF2F2', dot: '🔴', border: '#EF4444' },
  normal:   { label: 'Normal',   color: '#D4873A', bg: '#FFFBEB', dot: '🟡', border: '#D4873A' },
  whenever: { label: 'Whenever', color: '#22C55E', bg: '#F0FDF4', dot: '🟢', border: '#22C55E' },
};

export const QUICK_ITEMS = [
  'Atta', 'Rice', 'Dal', 'Oil', 'Gas Cylinder', 'Chai Patti',
  'Sugar', 'Eggs', 'Sabzi', 'Toilet Paper', 'Soap', 'Detergent',
  'Bedsheet', 'Onions', 'Tomatoes', 'Salt', 'Biscuits',
];

export const ROLES: { value: AddedByRole; label: string }[] = [
  { value: 'chef',    label: 'Chef' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner',   label: 'Owner' },
  { value: 'staff',   label: 'Staff' },
];

export function generateListTitle(): string {
  const now = new Date();
  return `Weekly List - ${now.getDate()} ${now.toLocaleString('en-IN', { month: 'long' })}`;
}

export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  const order: Record<UrgencyLevel, number> = { urgent: 0, normal: 1, whenever: 2 };
  return [...items].sort((a, b) => {
    const od = order[a.urgency] - order[b.urgency];
    if (od !== 0) return od;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
