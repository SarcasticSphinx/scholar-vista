"use client";

/**
 * Typed toast helpers wrapping Sonner's `toast` API.
 *
 * These helpers centralise the platform's "Toast Conventions" (design doc):
 *   - Success: 3s auto-dismiss, manual close button, announced politely.
 *   - Error:   5s auto-dismiss, manual close button, announced assertively.
 *
 * ARIA live semantics (Req 27.6):
 *   Sonner renders its toast container as a single `aria-live="polite"`
 *   region, which is the correct semantics for success/informational toasts.
 *   For errors the platform requires `aria-live="assertive"` so screen
 *   readers interrupt and announce the failure immediately. Sonner does not
 *   expose a per-toast live politeness setting, so `toastError` additionally
 *   writes the message into a dedicated, visually hidden
 *   `aria-live="assertive"` / `role="alert"` region. Visual presentation is
 *   still handled entirely by the Sonner toast.
 *
 * The `<Toaster richColors position="top-right" closeButton />` instance is
 * mounted once in `app/layout.tsx`; these helpers only dispatch toasts.
 *
 * Validates: Requirements 27.6, 28.3, 28.4
 */

import { toast, type ExternalToast } from "sonner";

/**
 * Auto-dismiss durations (in milliseconds) mandated by the design:
 * success toasts clear after 3 seconds, error toasts after 5 seconds.
 */
export const TOAST_DURATIONS = {
  success: 3000,
  error: 5000,
} as const;

/** DOM id of the singleton assertive live region used for error toasts. */
export const ASSERTIVE_REGION_ID = "sv-toast-assertive-region";

/**
 * Options forwarded to the underlying Sonner toast. `duration`,
 * `dismissible`, and `closeButton` are managed by these helpers to enforce
 * the platform conventions, so they are omitted from the public surface.
 * Callers may still pass `description`, `action`, `id`, `onDismiss`, etc.
 */
export type ToastOptions = Omit<
  ExternalToast,
  "duration" | "dismissible" | "closeButton"
>;

/**
 * Lazily create (or reuse) the visually hidden assertive live region that
 * mirrors error toast text for assistive technologies. Returns `null` during
 * server rendering, where there is no `document`.
 */
function ensureAssertiveRegion(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  let region = document.getElementById(ASSERTIVE_REGION_ID);
  if (!region) {
    region = document.createElement("div");
    region.id = ASSERTIVE_REGION_ID;
    region.setAttribute("role", "alert");
    region.setAttribute("aria-live", "assertive");
    region.setAttribute("aria-atomic", "true");
    // `sr-only` keeps the region out of the visual layout while leaving it
    // available to screen readers (Tailwind utility).
    region.className = "sr-only";
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Announce a message via the assertive live region so screen readers
 * interrupt and read it immediately. No-op on the server.
 */
function announceAssertive(message: string): void {
  const region = ensureAssertiveRegion();
  if (!region) return;
  region.textContent = message;
}

/**
 * Show a success toast: green/rich-colored, auto-dismisses after 3 seconds,
 * with a manual close button. Announced politely via Sonner's live region.
 *
 * @param message - Human-readable success message.
 * @param options - Optional Sonner toast options (description, action, ...).
 * @returns The Sonner toast id (useful for programmatic dismissal).
 */
export function toastSuccess(
  message: string,
  options?: ToastOptions,
): string | number {
  return toast.success(message, {
    duration: TOAST_DURATIONS.success,
    dismissible: true,
    closeButton: true,
    ...options,
  });
}

/**
 * Show an error toast: red/rich-colored, auto-dismisses after 5 seconds, with
 * a manual close button. Announced assertively so assistive technologies
 * interrupt and read the failure immediately.
 *
 * @param message - Human-readable error message (e.g. "Failed to load scholarships").
 * @param options - Optional Sonner toast options (description, action, ...).
 * @returns The Sonner toast id (useful for programmatic dismissal).
 */
export function toastError(
  message: string,
  options?: ToastOptions,
): string | number {
  announceAssertive(message);
  return toast.error(message, {
    duration: TOAST_DURATIONS.error,
    dismissible: true,
    closeButton: true,
    ...options,
  });
}

/**
 * Programmatically dismiss a toast by id, or all toasts when no id is given.
 * Thin pass-through to Sonner's `toast.dismiss` for callers that own a toast
 * id returned by {@link toastSuccess} / {@link toastError}.
 */
export function dismissToast(id?: string | number): string | number {
  return toast.dismiss(id);
}
