// Local persistence layer — replaces the Express backend for the prototype.
// All data stays on the device via AsyncStorage. Items are stored as a single
// JSON array under one key; small enough that whole-array reads/writes are fine
// for the prototype scale (tens to low hundreds of items).
//
// When we want to ship to a real server later, switch this module's
// implementations to call the backend HTTP API — the rest of the app
// uses these functions through `lib/api.ts` and doesn't care.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { findShelfLife, type Location } from './shelfLifeData';
import { computeRecommendedAction, type EngineUser } from './engine';

const ITEMS_KEY = 'freshkeep:items:v1';
const USER_KEY  = 'freshkeep:user:v1';

// ─── Types (mirrors what the backend used to return) ─────────────

export type Status = 'active' | 'used' | 'tossed' | 'pending';

export type StoredItem = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  quantity: number;
  location: Location;
  opened: boolean;
  opened_at: string | null;
  expiry_date: string;            // YYYY-MM-DD
  status: Status;
  user_marked_fine_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrichedItem = StoredItem & {
  days_until_expiry: number;
  freezable: boolean | null;
  recommended_action: ReturnType<typeof computeRecommendedAction>['action'] | null;
  action_priority: number | null;
  action_reason: string | null;
};

export type StoredUser = {
  fridge_temp_setting: number;     // 32–50 °F
  onboarded_at: string | null;
  anthropic_api_key: string | null;// for direct Claude calls (recipes, vision)
};

const DEFAULT_USER: StoredUser = {
  fridge_temp_setting: 37,
  onboarded_at: null,
  anthropic_api_key: null,
};

// ─── Items ───────────────────────────────────────────────────────

async function loadAll(): Promise<StoredItem[]> {
  const raw = await AsyncStorage.getItem(ITEMS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as StoredItem[]; }
  catch { return []; }
}

async function saveAll(items: StoredItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

function uuid(): string {
  // Tiny RFC4122 v4 — good enough for local IDs. Don't use for security.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function todayISO(): string {
  return new Date().toISOString();
}

function dateOnlyDiff(expiryISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryISO + 'T00:00:00');
  return Math.round((exp.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function enrich(item: StoredItem, user: EngineUser): EnrichedItem {
  const days_until_expiry = dateOnlyDiff(item.expiry_date);
  const freezable = item.category
    ? findShelfLife(item.category, item.location, item.opened)?.freezable ?? null
    : null;
  const out = computeRecommendedAction(
    {
      location: item.location,
      category: item.category,
      days_until_expiry,
      freezable: freezable,
      user_marked_fine_at: item.user_marked_fine_at,
    },
    user,
  );
  return {
    ...item,
    days_until_expiry,
    freezable,
    recommended_action: out?.action ?? null,
    action_priority: out?.priority ?? null,
    action_reason: out?.reason ?? null,
  };
}

export async function listItems(filters: { status?: Status | 'all'; location?: Location; opened?: boolean } = {}): Promise<{ items: EnrichedItem[] }> {
  const [all, user] = await Promise.all([loadAll(), getMe()]);
  const status = filters.status ?? 'active';
  const filtered = all
    .filter(i => status === 'all' || i.status === status)
    .filter(i => filters.location === undefined || i.location === filters.location)
    .filter(i => filters.opened === undefined || i.opened === filters.opened)
    .map(i => enrich(i, user))
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date) || a.name.localeCompare(b.name));
  return { items: filtered };
}

export async function getItem(id: string): Promise<EnrichedItem> {
  const [all, user] = await Promise.all([loadAll(), getMe()]);
  const found = all.find(i => i.id === id);
  if (!found) throw new Error('item not found');
  return enrich(found, user);
}

export async function createItem(input: {
  name: string;
  expiry_date: string;
  barcode?: string | null;
  category?: string | null;
  quantity?: number;
  location?: Location;
  opened?: boolean;
}): Promise<EnrichedItem> {
  if (!input.name?.trim()) throw new Error('name is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry_date)) throw new Error('expiry_date must be YYYY-MM-DD');
  const all = await loadAll();
  const opened = !!input.opened;
  const now = todayISO();
  const created: StoredItem = {
    id: uuid(),
    name: input.name.trim(),
    barcode: input.barcode || null,
    category: input.category || null,
    quantity: input.quantity || 1,
    location: input.location || 'fridge',
    opened,
    opened_at: opened ? now : null,
    expiry_date: input.expiry_date,
    status: 'active',
    user_marked_fine_at: null,
    created_at: now,
    updated_at: now,
  };
  all.push(created);
  await saveAll(all);
  return getItem(created.id);
}

export async function updateItem(id: string, patch: Partial<Pick<StoredItem, 'name' | 'category' | 'quantity' | 'location' | 'expiry_date' | 'status'>>): Promise<EnrichedItem> {
  const all = await loadAll();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('item not found');
  all[idx] = { ...all[idx], ...patch, updated_at: todayISO() };
  await saveAll(all);
  return getItem(id);
}

export async function deleteItem(id: string): Promise<void> {
  const all = await loadAll();
  const filtered = all.filter(i => i.id !== id);
  if (filtered.length === all.length) throw new Error('item not found');
  await saveAll(filtered);
}

export async function markItemOpened(id: string): Promise<EnrichedItem> {
  const all = await loadAll();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('item not found');
  const item = all[idx];
  if (item.opened) return getItem(id);
  // Recompute expiry_date = LEAST(current, today + opened_days_typical) using shelf-life data
  const opened = findShelfLife(item.category, item.location, true);
  let newExpiry = item.expiry_date;
  if (opened) {
    const cand = new Date();
    cand.setDate(cand.getDate() + opened.days_typical);
    const candStr = cand.toISOString().slice(0, 10);
    if (candStr < newExpiry) newExpiry = candStr;
  }
  all[idx] = {
    ...item,
    opened: true,
    opened_at: todayISO(),
    expiry_date: newExpiry,
    updated_at: todayISO(),
  };
  await saveAll(all);
  return getItem(id);
}

export async function markItemStillFine(id: string): Promise<EnrichedItem> {
  const all = await loadAll();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('item not found');
  all[idx] = { ...all[idx], user_marked_fine_at: todayISO(), updated_at: todayISO() };
  await saveAll(all);
  return getItem(id);
}

// ─── User ────────────────────────────────────────────────────────

export async function getMe(): Promise<StoredUser> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return DEFAULT_USER;
  try { return { ...DEFAULT_USER, ...(JSON.parse(raw) as Partial<StoredUser>) }; }
  catch { return DEFAULT_USER; }
}

export async function updateMe(patch: Partial<StoredUser>): Promise<StoredUser> {
  const current = await getMe();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

// ─── Reset (debug helper) ────────────────────────────────────────

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove([ITEMS_KEY, USER_KEY]);
}
