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
 * Invariants enforced by the hook:
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

/**
 * React hook returning the current comparison cart along with mutators.
 *
 * The hook initialises with an empty array on both server and client to
 * keep the SSR HTML deterministic, then rehydrates from localStorage in
 * a mount effect. Subsequent mutations update both in-memory state and
 * the persisted entry in the same render cycle so listeners cannot
 * observe divergence.
 */
export function useComparison(): UseComparisonResult {
  const [items, setItems] = React.useState<ComparisonItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Lazy hydration on mount avoids SSR/CSR mismatches; the first paint
  // matches the server (empty cart) and the persisted state is applied
  // in a follow-up commit.
  React.useEffect(() => {
    setItems(readFromStorage());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration. Skipping the pre-hydration
  // pass prevents the initial empty array from clobbering the stored
  // value before we've had a chance to read it.
  React.useEffect(() => {
    if (!hydrated) return;
    writeToStorage(items);
  }, [items, hydrated]);

  const add = React.useCallback((item: ComparisonItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [
        ...prev,
        {
          id: item.id,
          title: item.title,
          universityName: item.universityName,
        },
      ];
    });
  }, []);

  const remove = React.useCallback((scholarshipId: string) => {
    setItems((prev) => {
      if (!prev.some((p) => p.id === scholarshipId)) return prev;
      return prev.filter((p) => p.id !== scholarshipId);
    });
  }, []);

  const clear = React.useCallback(() => {
    setItems([]);
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
  };
}
