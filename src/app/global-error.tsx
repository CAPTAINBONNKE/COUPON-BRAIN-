"use client";

/**
 * Last-resort boundary: catches failures in the root layout itself, so it must
 * render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
          background: "#f5f5f8",
          color: "#14141d",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            COUPON BRAIN is having a moment
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#63637a", lineHeight: 1.6 }}>
            Something broke before the page could load. Try again — if it keeps
            happening, the problem is on our side and has been logged.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#84849a" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              height: "2.5rem",
              padding: "0 1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#14141d",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
