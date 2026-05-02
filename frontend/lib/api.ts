// API client for the FreshKeep backend.
//
// Base URL precedence:
//   1. EXPO_PUBLIC_API_URL env var (set in .env or shell)
//   2. http://10.0.2.2:3000 on Android emulator (the host's localhost)
//   3. http://localhost:3000 elsewhere
//
// On a physical device, set EXPO_PUBLIC_API_URL to your LAN IP (e.g.
// http://192.168.1.42:3000) before `npm start`. expo-router picks up
// EXPO_PUBLIC_*  vars from a .env file in the frontend folder.

import { Platform } from 'react-native';

function defaultBaseUrl() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl();

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const msg = body?.message || `${res.status} ${res.statusText}`;
    const err = new Error(msg) as Error & { status: number; code?: string };
    err.status = res.status;
    err.code = body?.error;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ───────── Scan ─────────
export type ShelfLife = {
  days_min: number;
  days_typical: number;
  days_max: number;
  freezable: boolean;
  source: string;
  based_on: { location: string; opened: boolean };
};

export type ScanResult =
  | {
      found: true;
      barcode: string;
      name: string | null;
      brand: string | null;
      category: string | null;
      shelf_life: ShelfLife | null;
      cached: boolean;
      manual_entry_required: boolean;
    }
  | {
      found: false;
      barcode: string;
      manual_entry_required: true;
    };

export function scanBarcode(barcode: string) {
  return http<ScanResult>('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ barcode }),
  });
}

// ───────── Items ─────────
export type ItemLocation = 'fridge' | 'freezer' | 'counter' | 'pantry';

export type Item = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  quantity: number;
  location: ItemLocation;
  opened: boolean;
  opened_at: string | null;
  expiry_date: string;
  status: 'active' | 'used' | 'tossed' | 'pending';
  recommended_action:
    | 'eat_now' | 'eat_soon' | 'freeze_now' | 'use_in_recipe'
    | 'compost' | 'monitor' | 'safe' | null;
  action_priority: number | null;
  action_reason: string | null;
  user_marked_fine_at: string | null;
  days_until_expiry: number;
  freezable: boolean | null;
};

export function listItems(filters: { status?: string; location?: ItemLocation; opened?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.location) qs.set('location', filters.location);
  if (filters.opened !== undefined) qs.set('opened', String(filters.opened));
  const suffix = qs.toString() ? `?${qs}` : '';
  return http<{ items: Item[] }>(`/api/items${suffix}`);
}

export function createItem(input: {
  name: string;
  expiry_date: string;
  barcode?: string | null;
  category?: string | null;
  quantity?: number;
  location?: ItemLocation;
  opened?: boolean;
}) {
  return http<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateItem(id: string, patch: Partial<Pick<Item, 'name' | 'category' | 'quantity' | 'location' | 'expiry_date' | 'status'>>) {
  return http<Item>(`/api/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function getItem(id: string) {
  return http<Item>(`/api/items/${id}`);
}

export function markItemOpened(id: string) {
  return http<Item>(`/api/items/${id}/open`, { method: 'PATCH' });
}

export function markItemStillFine(id: string) {
  return http<Item>(`/api/items/${id}/mark-fine`, { method: 'PATCH' });
}

export function deleteItem(id: string) {
  return http<void>(`/api/items/${id}`, { method: 'DELETE' });
}

// ───────── Users ─────────
export type Me = {
  id: string;
  email: string | null;
  fridge_temp_setting: number;
  onboarded_at: string | null;
};

export function getMe() {
  return http<Me>('/api/users/me');
}

export function updateMe(patch: { fridge_temp_setting?: number; onboarded?: boolean }) {
  return http<Me>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
