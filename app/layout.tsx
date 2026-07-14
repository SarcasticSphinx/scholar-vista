import type { Metadata } from "next";
import { Geist_Mono, Urbanist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_LOCALE, getDirection } from "@/lib/intl";

/**
 * Root layout.
 *
 * - Sets `lang` and `dir` from the configured locale (default `en-US` -> `ltr`)
 *   so the document is RTL-ready (Req 32.3) without changing visual output today.
 * - Adds `suppressHydrationWarning` on `<html>` because `next-themes` writes the
 *   resolved theme class onto `<html>` before hydration to prevent FOUC (Req 22.5).
 * - Wraps the tree in `ThemeProvider` configured for class-based theming with
 *   system as the default and transitions disabled on swap to stay under the
 *   100ms switch budget (Req 22.1, 22.2, 22.4).
 * - Mounts a single Sonner `Toaster` so any client component can dispatch toasts.
 *
 * Validates: Requirements 22.1, 22.4, 22.5, 22.6, 27.4, 32.3
 */

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ScholarVista",
    template: "%s | ScholarVista",
  },
  description:
    "Discover, compare, and apply for scholarships from universities around the world with ScholarVista.",
  applicationName: "ScholarVista",
  openGraph: {
    type: "website",
    siteName: "ScholarVista",
    title: "ScholarVista",
    description:
      "Discover, compare, and apply for scholarships from universities around the world with ScholarVista.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarVista",
    description:
      "Discover, compare, and apply for scholarships from universities around the world with ScholarVista.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = DEFAULT_LOCALE;
  const dir = getDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${urbanist.variable} ${playfair.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
