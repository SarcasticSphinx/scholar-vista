"use client";

/**
 * Mock checkout form (client island).
 *
 * Renders the **Pay** and **Cancel** buttons for the dev-only placeholder
 * checkout page. Each button calls a Server Action via `useTransition`
 * so the UI stays responsive during the round-trip:
 *
 *   - **Pay**    → `confirmMockPayment(transactionId)` — on success the
 *                  user is redirected to `/my-applications`.
 *   - **Cancel** → `cancelMockPayment(transactionId)` — refreshes the
 *                  page so the parent server component re-renders the
 *                  status section (now `FAILED`).
 *
 * Errors surface via Sonner toasts so the placeholder does not need its
 * own error UI. The form is disabled while either action is in flight to
 * prevent double-submit and to make the loading state explicit.
 *
 * Validates: Requirements 30.3, 30.4.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cancelMockPayment, confirmMockPayment } from "@/actions/payment";
import { Button } from "@/components/ui/button";

interface MockCheckoutFormProps {
    transactionId: string;
}

export function MockCheckoutForm({ transactionId }: MockCheckoutFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const [activeAction, setActiveAction] = React.useState<
        "pay" | "cancel" | null
    >(null);

    const handlePay = React.useCallback(() => {
        setActiveAction("pay");
        startTransition(async () => {
            const result = await confirmMockPayment(transactionId);
            if (result.ok) {
                toast.success("Payment confirmed.");
                router.replace("/my-applications");
                router.refresh();
            } else {
                toast.error(result.error.message);
                router.refresh();
            }
            setActiveAction(null);
        });
    }, [router, transactionId]);

    const handleCancel = React.useCallback(() => {
        setActiveAction("cancel");
        startTransition(async () => {
            const result = await cancelMockPayment(transactionId);
            if (result.ok) {
                toast.message("Payment cancelled.");
            } else {
                toast.error(result.error.message);
            }
            // Refresh either way so the parent server component renders
            // the latest payment-status banner.
            router.refresh();
            setActiveAction(null);
        });
    }, [router, transactionId]);

    return (
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
                type="button"
                onClick={handlePay}
                disabled={isPending}
                className="sm:flex-1"
            >
                {isPending && activeAction === "pay" ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                )}
                Pay
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="sm:flex-1"
            >
                {isPending && activeAction === "cancel" ? (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                    <XCircle aria-hidden="true" className="size-4" />
                )}
                Cancel
            </Button>
        </div>
    );
}
