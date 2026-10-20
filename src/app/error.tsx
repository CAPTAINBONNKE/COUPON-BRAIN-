"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Shows something useful, offers a way out, and logs the error. The raw error
 * message is deliberately not shown in production — technical detail belongs in
 * the logs, not on the page.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where you would forward to Sentry / your log sink.
    console.error("[coupon-brain] route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
          <TriangleAlert className="h-7 w-7" aria-hidden />
        </span>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          We couldn&rsquo;t load this page. It is usually temporary — trying
          again often works.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-400">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/deals"
            className="inline-flex h-10 items-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            Browse deals
          </Link>
        </div>
      </div>
    </div>
  );
}
