import type { Metadata, Viewport } from "next";

import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { env } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "COUPON BRAIN — Verified coupon codes and deals that actually work",
    template: "%s | COUPON BRAIN",
  },
  description:
    "Find working promo codes and deals from the stores you already shop at. COUPON BRAIN checks expiry dates server-side, flags verified offers, and gets you to the discount in one tap.",
  applicationName: "COUPON BRAIN",
  keywords: [
    "coupon codes",
    "promo codes",
    "discount codes",
    "voucher codes",
    "online deals",
    "savings",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "COUPON BRAIN",
    title: "COUPON BRAIN — Verified coupon codes and deals that actually work",
    description:
      "Find working promo codes and deals from the stores you already shop at. Verified offers, real expiry dates, one-tap codes.",
    url: env.siteUrl,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "COUPON BRAIN — verified coupon codes and deals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "COUPON BRAIN — Verified coupon codes and deals",
    description:
      "Find working promo codes and deals from the stores you already shop at. Verified offers, real expiry dates, one-tap codes.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "shopping",
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Allow zoom — never block pinch-to-zoom on a shopping site.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink-50 text-ink-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        <SiteHeader />

        {/* Bottom padding clears the mobile bottom navigation. */}
        <main id="main" className="pb-20 lg:pb-0">
          {children}
        </main>

        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
