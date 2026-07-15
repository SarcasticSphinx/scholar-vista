"use client";

/**
 * Client-side hook backing the scholarship comparison cart.
 *
 * The cart is a small, ordered list of scholarships the user has marked
 * for side-by-side comparison. It is persisted in `localStorage` under the
 * key {@link STORAGE_KEY} so the selection survives navigation and page
 * reloads, and is rehydrated lazily on the client to avoid hydration
 * mismatches against the server-rendered HTML.
 *
 * State lives in a module-level store (not per-component `useState`) so
 * every `CompareButton`, the floating tray, and the `/compare` page stay
 * in sync when the cart changes.
 *
 * Invariants enforced by the store:
 *   - At most {@link MAX_COMPARE} items at any time (Req 15.1, 15.2).
 *   - No duplicate items by `id` (set semantics keyed on scholarshipId).
 *   - Persistence round-trips identity: the items returned after a reload
 *     equal the items written before it (Req 15.3).
 *   - Removal updates state synchronously and writes to storage (Req 15.4).
 *
 * The hook intentionally exposes a `count` and `isFull` flag so consumers
 * such as the comparison tray (visible iff `count >= MIN_COMPARE`) and the
 * compare button (disabled when `isFull` and the item isn't already in the
 * cart) can render without recomputing.
 *
 * Storage errors (private mode, quota exceeded, disabled storage) are
 * tolerated: serialization is wrapped in try/catch and the hook falls back
 * to in-memory state. This keeps the UI working even when persistence
 * isn't available.
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import * as React from "react";
import { useSyncExternalStore } from "react";

/** Minimum number of scholarships required to launch a comparison. */
export const MIN_COMPARE = 2;

/** Maximum number of scholarships that can be compared at once. */
export const MAX_COMPARE = 3;

/** Versioned localStorage key. Bump the suffix when the shape changes. */
export const STORAGE_KEY = "sv:compare:v1";

/**
 * The minimal payload stored per scholarship — just enough to render the
 * comparison tray and link back to the detail page. Heavier fields used
 * by the `/compare` page are fetched on demand.
 */
export interface ComparisonItem {
  id: string;
  title: string;
  universityName: string;
}

export interface UseComparisonResult {
  /** Current cart contents. Order reflects insertion order. */
  items: ComparisonItem[];
  /** Append `item` to the cart. No-op when full or already present. */
  add: (item: ComparisonItem) => void;
  /** Remove the item with the given scholarship id, if present. */
  remove: (scholarshipId: string) => void;
  /** Empty the cart and clear the persisted entry. */
  clear: () => void;
  /** True when the cart already contains {@link MAX_COMPARE} items. */
  isFull: boolean;
  /** True when an item with the given id is already in the cart. */
  has: (scholarshipId: string) => boolean;
  /** Number of items currently in the cart. */
  count: number;
  /**
   * False until the client has read `localStorage`. Use this to avoid
   * flashing empty-state UI before the persisted cart is available.
   */
  hydrated: boolean;
}

/**
 * Read the persisted cart from localStorage. Returns an empty array if the
 * entry is missing, malformed, or storage is unavailable. The function
 * also enforces the invariants on read so a tampered storage value can
 * never break runtime: items missing required fields are dropped, and
 * the result is truncated to {@link MAX_COMPARE}.
 */
function readFromStorage(): ComparisonItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const items: ComparisonItem[] = [];
    for (const candidate of parsed) {
      if (
        candidate !== null &&
        typeof candidate === "object" &&
        typeof (candidate as ComparisonItem).id === "string" &&
        typeof (candidate as ComparisonItem).title === "string" &&
        typeof (candidate as ComparisonItem).universityName === "string"
      ) {
        const item = candidate as ComparisonItem;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push({
          id: item.id,
          title: item.title,
          universityName: item.universityName,
        });
        if (items.length >= MAX_COMPARE) break;
      }
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Persist the cart to localStorage. Failures (quota, disabled storage,
 * SecurityError in private mode) are swallowed: in-memory state remains
 * authoritative for the session and we re-attempt on the next change.
 */
function writeToStorage(items: ComparisonItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // intentionally ignored — see fn doc
  }
}

/* ------------------------------------------------------------------ */
/*                         module-level store                          */
/* ------------------------------------------------------------------ */

type Listener = () => void;

let itemsState: ComparisonItem[] = [];
let hydratedState = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setItems(next: ComparisonItem[]): void {
  itemsState = next;
  writeToStorage(next);
  emit();
}

function hydrateOnce(): void {
  if (hydratedState || typeof window === "undefined") return;
  itemsState = readFromStorage();
  hydratedState = true;
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getItemsSnapshot(): ComparisonItem[] {
  return itemsState;
}

function getHydratedSnapshot(): boolean {
  return hydratedState;
}

function getServerItemsSnapshot(): ComparisonItem[] {
  return EMPTY_ITEMS;
}

function getServerHydratedSnapshot(): boolean {
  return false;
}

const EMPTY_ITEMS: ComparisonItem[] = [];

function addItem(item: ComparisonItem): void {
  hydrateOnce();
  if (itemsState.some((p) => p.id === item.id)) return;
  if (itemsState.length >= MAX_COMPARE) return;
  setItems([
    ...itemsState,
    {
      id: item.id,
      title: item.title,
      universityName: item.universityName,
    },
  ]);
}

function removeItem(scholarshipId: string): void {
  hydrateOnce();
  if (!itemsState.some((p) => p.id === scholarshipId)) return;
  setItems(itemsState.filter((p) => p.id !== scholarshipId));
}

function clearItems(): void {
  hydrateOnce();
  if (itemsState.length === 0) return;
  setItems([]);
}

/**
 * React hook returning the current comparison cart along with mutators.
 *
 * Backed by a shared module store so every consumer observes the same cart.
 * SSR and the first client paint use an empty cart; hydration from
 * `localStorage` lands in a follow-up commit via `useSyncExternalStore`.
 */
export function useComparison(): UseComparisonResult {
  const items = useSyncExternalStore(
    subscribe,
    getItemsSnapshot,
    getServerItemsSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  // Lazy hydration after mount keeps the first client paint aligned with
  // the SSR HTML (empty cart), then applies the persisted cart.
  React.useEffect(() => {
    hydrateOnce();
  }, []);

  const add = React.useCallback((item: ComparisonItem) => {
    addItem(item);
  }, []);

  const remove = React.useCallback((scholarshipId: string) => {
    removeItem(scholarshipId);
  }, []);

  const clear = React.useCallback(() => {
    clearItems();
  }, []);

  const has = React.useCallback(
    (scholarshipId: string) => items.some((p) => p.id === scholarshipId),
    [items],
  );

  return {
    items,
    add,
    remove,
    clear,
    isFull: items.length >= MAX_COMPARE,
    has,
    count: items.length,
    hydrated,
  };
}
