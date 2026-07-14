// @vitest-environment jsdom

/**
 * Unit tests for the typed toast helpers (`lib/toast.ts`).
 *
 * These verify the platform "Toast Conventions":
 *   - `toastSuccess` dispatches `toast.success` with a 3s duration, manual
 *     dismiss, and a close button.
 *   - `toastError` dispatches `toast.error` with a 5s duration, manual
 *     dismiss, and a close button.
 *   - `toastError` additionally announces the message through a visually
 *     hidden `aria-live="assertive"` / `role="alert"` region so screen
 *     readers interrupt (Req 27.6).
 *   - Caller-supplied options are forwarded but cannot override the enforced
 *     duration/dismiss semantics... (they can, however, add description etc.).
 *
 * Sonner's `toast` API is mocked so the tests observe the exact options the
 * helpers pass through, without rendering the Toaster.
 *
 * Validates: Requirements 27.6, 28.3, 28.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExternalToast } from "sonner";

const { successMock, errorMock, dismissMock } = vi.hoisted(() => ({
  successMock: vi.fn(
    (_message: string, _options?: ExternalToast): string | number =>
      "success-id",
  ),
  errorMock: vi.fn(
    (_message: string, _options?: ExternalToast): string | number => "error-id",
  ),
  dismissMock: vi.fn((_id?: string | number): string | number => "dismiss-id"),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(
    () => "base-id",
    {
      success: successMock,
      error: errorMock,
      dismiss: dismissMock,
    },
  ),
}));

import {
  ASSERTIVE_REGION_ID,
  TOAST_DURATIONS,
  dismissToast,
  toastError,
  toastSuccess,
} from "./toast";

beforeEach(() => {
  successMock.mockClear();
  errorMock.mockClear();
  dismissMock.mockClear();
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("toastSuccess", () => {
  it("dispatches toast.success with a 3s duration and manual dismiss", () => {
    toastSuccess("Profile updated");

    expect(successMock).toHaveBeenCalledTimes(1);
    const [message, options] = successMock.mock.calls[0];
    expect(message).toBe("Profile updated");
    expect(options).toMatchObject({
      duration: 3000,
      dismissible: true,
      closeButton: true,
    });
    expect(options?.duration).toBe(TOAST_DURATIONS.success);
  });

  it("forwards extra options such as description", () => {
    toastSuccess("Saved", { description: "Your changes were stored." });

    const [, options] = successMock.mock.calls[0];
    expect(options?.description).toBe("Your changes were stored.");
    // Enforced semantics remain intact.
    expect(options?.duration).toBe(3000);
    expect(options?.closeButton).toBe(true);
  });

  it("returns the Sonner toast id", () => {
    expect(toastSuccess("ok")).toBe("success-id");
  });

  it("does not create an assertive live region", () => {
    toastSuccess("ok");
    expect(document.getElementById(ASSERTIVE_REGION_ID)).toBeNull();
  });
});

describe("toastError", () => {
  it("dispatches toast.error with a 5s duration and manual dismiss", () => {
    toastError("Failed to load scholarships");

    expect(errorMock).toHaveBeenCalledTimes(1);
    const [message, options] = errorMock.mock.calls[0];
    expect(message).toBe("Failed to load scholarships");
    expect(options).toMatchObject({
      duration: 5000,
      dismissible: true,
      closeButton: true,
    });
    expect(options?.duration).toBe(TOAST_DURATIONS.error);
  });

  it("announces the message via an assertive role=alert live region", () => {
    toastError("Something went wrong");

    const region = document.getElementById(ASSERTIVE_REGION_ID);
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-live")).toBe("assertive");
    expect(region?.getAttribute("role")).toBe("alert");
    expect(region?.getAttribute("aria-atomic")).toBe("true");
    expect(region?.className).toContain("sr-only");
    expect(region?.textContent).toBe("Something went wrong");
  });

  it("reuses a single assertive region across multiple errors", () => {
    toastError("First failure");
    toastError("Second failure");

    const regions = document.querySelectorAll(`#${ASSERTIVE_REGION_ID}`);
    expect(regions).toHaveLength(1);
    expect(regions[0].textContent).toBe("Second failure");
  });

  it("returns the Sonner toast id", () => {
    expect(toastError("boom")).toBe("error-id");
  });
});

describe("dismissToast", () => {
  it("passes the id through to toast.dismiss", () => {
    dismissToast("error-id");
    expect(dismissMock).toHaveBeenCalledWith("error-id");
  });

  it("dismisses all toasts when no id is given", () => {
    dismissToast();
    expect(dismissMock).toHaveBeenCalledWith(undefined);
  });
});
