import { Clock, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { env } from "@/lib/env";
import { FOOTER_NAV } from "@/lib/nav";

const TRUST_POINTS = [
  {
    icon: Clock,
    title: "Checked against the clock",
    body: "Expiry is decided on the server, not in your browser — so a deal marked live really is live.",
  },
  {
    icon: ShieldCheck,
    title: "Verified where it matters",
    body: "Offers marked Verified were re-checked by us. Everything else is clearly labelled.",
  },
  {
    icon: Store,
    title: "Straight to the store",
    body: "No pop-ups, no fake timers. Copy the code, or follow the link and the discount is applied.",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              COUPON BRAIN collects live promo codes and offers from the stores
              people actually shop at, checks when they stop working, and gets
              out of the way.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-ink-400">
              Some links are affiliate links. If you buy through them we may earn
              a commission — it never changes the price you pay, and it never
              changes the order deals are shown in.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-bold tracking-[0.12em] text-ink-900 uppercase">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-600 transition-colors hover:text-brand-700"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-xs font-bold tracking-[0.12em] text-ink-900 uppercase">
              Why trust it
            </h2>
            <ul className="mt-4 space-y-3">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="flex gap-2.5">
                  <point.icon className="mt-0.5 h-4 w-4 shrink-0 text-save-600" aria-hidden />
                  <span className="text-sm leading-relaxed text-ink-600">
                    <span className="font-semibold text-ink-800">{point.title}.</span>{" "}
                    {point.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-100 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getUTCFullYear()} {env.siteName}. Demo catalogue —
            codes are illustrative and not guaranteed.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Prices and availability are set by the retailer.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
