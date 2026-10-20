/**
 * Cookie name for the anonymous analytics visitor id.
 *
 * Lives on its own so the Edge middleware can import it without pulling in
 * `node:crypto`, which is not available in that runtime.
 */
export const VISITOR_COOKIE = "cb_vid";
