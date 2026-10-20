import { ClipboardPaste, MousePointerClick, ScanSearch, ShieldCheck } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Discover",
    body: "Search by store, category or code. Suggestions appear as you type, so you find the offer before you finish typing the name.",
  },
  {
    icon: ClipboardPaste,
    title: "Understand",
    body: "Every card shows what the offer is worth, whether it needs a code, when it expires and whether we verified it — before you click.",
  },
  {
    icon: MousePointerClick,
    title: "Get the deal",
    body: "Copy the code in one tap, or follow the link straight to the store. We re-check the offer on the server at the moment you click.",
  },
  {
    icon: ShieldCheck,
    title: "Save and return",
    body: "Keep deals you like on this device, and come back to a shortlist that is re-checked against the database every time.",
  },
];

/**
 * Explains how the product works and why the numbers can be trusted. Every
 * claim here is backed by real behaviour in the code, not marketing copy.
 */
export function TrustSection({ liveCoupons }: { liveCoupons: number }) {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Four steps, no games"
      subtitle="No countdown timers that reset on refresh. No codes copied from a competitor's page. Expiry is decided by the database, not by your browser."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-bold tracking-[0.12em] text-ink-400 uppercase">
                Step {index + 1}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-ink-100 bg-ink-900 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            {liveCoupons} offers are live right now
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-300">
            Start with the deals other shoppers used most this week, or jump
            straight to the ones expiring soonest.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink href="/deals?sort=popular" variant="success" size="md">
            Most used
          </ButtonLink>
          <ButtonLink
            href="/deals/ending-soon"
            size="md"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            Ending soon
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
