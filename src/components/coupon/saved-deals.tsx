"use client";

import { AlertTriangle, BookmarkX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CouponGrid } from "@/components/coupon/coupon-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CouponGridSkeleton } from "@/components/ui/skeleton";
import type { CouponCard } from "@/db/queries";
import { parseCouponCard, type SerializedCouponCard } from "@/lib/coupon-serialize";
import { SAVED_EVENT, clearSaved, getSaved } from "@/lib/saved";

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; coupons: CouponCard[] }
  | { status: "error"; message: string };

/**
 * Saved deals, re-read from the database on every visit.
 *
 * Only slugs are kept on the device; the code, expiry and live status shown
 * here always come from the server, so a saved deal that expired overnight
 * says so instead of silently failing at checkout.
 */
export function SavedDeals() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    const saved = getSaved();

    if (saved.length === 0) {
      setState({ status: "empty" });
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/coupons?slugs=${encodeURIComponent(saved.map((item) => item.slug).join(","))}`,
        { headers: { accept: "application/json" } },
      );

      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      const data = (await response.json()) as {
        ok: boolean;
        coupons?: SerializedCouponCard[];
      };

      const coupons = (data.coupons ?? [])
        .map(parseCouponCard)
        .filter((coupon): coupon is CouponCard => coupon !== null);

      setState(coupons.length > 0 ? { status: "ready", coupons } : { status: "empty" });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't reach the server to check your saved deals.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(SAVED_EVENT, load);
    return () => window.removeEventListener(SAVED_EVENT, load);
  }, [load]);

  if (state.status === "loading") {
    return (
      <div>
        <p className="mb-4 text-sm text-ink-500">Checking your saved deals…</p>
        <CouponGridSkeleton count={3} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="We couldn't load your saved deals"
        description={`${state.message} Your list is still on this device — nothing was lost.`}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (state.status === "empty") {
    return (
      <EmptyState
        icon={BookmarkX}
        title="No saved deals yet"
        description="Tap the bookmark icon on any deal to keep it here. Saved deals stay on this device, and are re-checked against the database every time you come back."
        action={
          <Link
            href="/deals"
            className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Browse deals
          </Link>
        }
      />
    );
  }

  const expiredCount = state.coupons.filter((coupon) => coupon.status !== "active").length;
  const now = new Date();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {state.coupons.length} saved deal{state.coupons.length === 1 ? "" : "s"}
          {expiredCount > 0 ? (
            <span className="text-danger-700">
              {" "}
              · {expiredCount} no longer available
            </span>
          ) : null}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearSaved();
            void load();
          }}
        >
          Clear all
        </Button>
      </div>

      <CouponGrid
        coupons={state.coupons}
        now={now}
        emptyTitle="No saved deals yet"
        emptyDescription="Tap the bookmark icon on any deal to keep it here."
      />
    </div>
  );
}
