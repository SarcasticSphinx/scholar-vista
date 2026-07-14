"use client";

/**
 * Client island that toggles a scholarship in the comparison cart.
 *
 * Backed by the `useComparison` hook (task 9.1). When the scholarship is
 * already in the cart, clicking removes it; otherwise it is added. The
 * button is disabled when the cart is full (Req 15.1, 15.2) and the
 * scholarship isn't already a member, so users get visual feedback before
 * clicking.
 *
 * The button accepts a single `scholarship` payload that mirrors the cart
 * entry shape — keeping the public API compact and keying the cart by
 * `id` while still surfacing `title` and `universityName` in the tray.
 *
 * Validates: Requirements 4.6, 5.9 (compare control on card).
 */

import * as React from "react";
import { Plus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    useComparison,
    type ComparisonItem,
} from "@/hooks/use-comparison";

export interface CompareButtonProps {
    /** Scholarship payload added to / removed from the comparison cart. */
    scholarship: ComparisonItem;
    /** Optional className override for layout positioning on the card. */
    className?: string;
}

/**
 * Render the compare toggle. The `useComparison` hook starts empty on the
 * server and rehydrates from `localStorage` after mount, so the first paint
 * matches the SSR HTML and avoids hydration mismatches.
 */
export function CompareButton({
    scholarship,
    className,
}: CompareButtonProps) {
    const { add, remove, has, isFull } = useComparison();
    const isInCart = has(scholarship.id);
    const disabled = !isInCart && isFull;

    const onClick = React.useCallback(() => {
        if (isInCart) {
            remove(scholarship.id);
            return;
        }
        if (isFull) return;
        add(scholarship);
    }, [add, isFull, isInCart, remove, scholarship]);

    const label = isInCart ? "Remove from comparison" : "Add to comparison";
    const Icon = isInCart ? Check : Plus;

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={isInCart}
            title={disabled ? "Comparison cart is full" : label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "text-muted-foreground hover:text-foreground",
                isInCart && "text-brand",
                className,
            )}
        >
            <Icon aria-hidden="true" className="size-4" />
        </Button>
    );
}
