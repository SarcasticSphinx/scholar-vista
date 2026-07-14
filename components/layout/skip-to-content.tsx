/**
 * Skip-to-main-content link.
 *
 * Renders an accessible "Skip to main content" anchor as the first
 * focusable element on a page. The link is visually hidden using
 * `sr-only` until it receives keyboard focus, at which point it becomes
 * visible at the top-left of the viewport. Activating the link jumps to
 * `#main`, which the layout shells apply to the page's `<main>` element.
 *
 * This is a pure server component — there is no client interactivity to
 * wire up beyond the native anchor behavior.
 *
 * Validates: Requirements 27.2
 */
export function SkipToContent({
    targetId = "main",
    label = "Skip to main content",
}: {
    targetId?: string;
    label?: string;
}) {
    return (
        <a
            href={`#${targetId}`}
            className={[
                // Hidden until focused — uses Tailwind's sr-only utility.
                "sr-only focus:not-sr-only",
                // When focused, anchor becomes a visible chip at the top-left
                // with strong contrast and a 2px outline meeting Req 27.2.
                "focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
                "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
                "focus:text-sm focus:font-medium focus:text-primary-foreground",
                "focus:shadow-md focus:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            ].join(" ")}
        >
            {label}
        </a>
    );
}
