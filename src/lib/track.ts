import type { EventPayload } from "./validation";

/**
 * Client-side analytics beacon.
 *
 * Deliberately fire-and-forget: analytics must never block or break a user
 * action. Failures are swallowed — the coupon interaction already succeeded;
 * only its measurement was lost. Server-side de-duplication in the events table
 * keeps retries and double-clicks from inflating the numbers.
 */
export function trackEvent(payload: EventPayload): void {
  if (typeof window === "undefined") return;

  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Nothing to do — measurement is best effort.
  }
}
