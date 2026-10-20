/**
 * Structured, redaction-safe logging.
 *
 * Rules:
 *  • Never log passwords, tokens, cookies, full URLs with query secrets, or
 *    payment data. `redact()` strips known-sensitive keys anywhere in payloads.
 *  • JSON one line per entry in production (log aggregators), pretty in dev.
 *  • Never throw out of the logger — observability must not break a request.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE = [
  "password",
  "passwd",
  "secret",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "api_key",
  "access_key",
  "service_role",
  "visitorid",
];

const REDACTED = "[redacted]";

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactValue(v, depth + 1));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      out[key] = SENSITIVE.some((s) => lower.includes(s))
        ? REDACTED
        : redactValue(val, depth + 1);
    }
    return out;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…[truncated]`;
  }

  return value;
}

/* eslint-disable no-console -- this module IS the console wrapper; everything
   else in the app should call `logger` instead of console directly. */
function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context ? (redactValue(context) as Record<string, unknown>) : {}),
  };

  try {
    const line =
      process.env.NODE_ENV === "production"
        ? JSON.stringify(entry)
        : `${entry.level.toUpperCase()} ${entry.msg} ${
            context ? JSON.stringify(redactValue(context)) : ""
          }`.trim();

    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    // Logging must never be the reason a request fails.
  }
}

function currentLevel(): Level {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  return configured && configured in LEVEL_ORDER ? (configured as Level) : "info";
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};

/** Consistent envelope for API errors; safe to return to the browser. */
export function apiErrorResponse(
  message: string,
  status: number,
  context?: Record<string, unknown>,
  details?: unknown,
) {
  logger.error(`api error (${status}): ${message}`, context);
  return Response.json(
    {
      ok: false,
      error: { message, ...(details ? { details } : {}) },
    },
    { status },
  );
}
