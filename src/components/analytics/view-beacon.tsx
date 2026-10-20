"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/track";

/**
 * Records a "coupon viewed" event once per page mount.
 *
 * Fired from the client on purpose: server-rendering it would count crawler
 * hits and React's own double-renders as human views. The events table
 * de-duplicates per coupon/visitor/hour, so a back-and-forth navigation does
 * not inflate it.
 */
export function ViewBeacon({ couponId }: { couponId: number }) {
  useEffect(() => {
    trackEvent({ type: "view", couponId });
  }, [couponId]);

  return null;
}
