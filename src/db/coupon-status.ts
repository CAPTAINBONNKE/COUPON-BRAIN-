import { sql, type SQL } from "drizzle-orm";

import { coupons } from "./schema";

/**
 * SQL-side coupon validity. Kept separate from src/lib/coupon.ts so that the
 * drizzle imports here never end up in a client bundle.
 *
 * Status is DERIVED from the stored facts (is_disabled, starts_at, expires_at)
 * against the database clock. It is never stored, so it cannot go stale and
 * never depends on the visitor's device time.
 */

/** CASE expression returning the coupon status — reused by every query. */
export const couponStatusSql: SQL<string> = sql<string>`
  case
    when ${coupons.isDisabled} then 'disabled'
    when ${coupons.startsAt} is not null and ${coupons.startsAt} > now() then 'scheduled'
    when ${coupons.expiresAt} is not null and ${coupons.expiresAt} <= now() then 'expired'
    else 'active'
  end
`;

/** Predicate: the coupon can be shown and used right now. */
export const couponIsLiveSql: SQL = sql`
  (${coupons.isDisabled} = false
    and (${coupons.startsAt} is null or ${coupons.startsAt} <= now())
    and (${coupons.expiresAt} is null or ${coupons.expiresAt} > now()))
`;

/** Predicate: has an end date, and it falls within `hours` from now. */
export function couponEndingWithinSql(hours: number): SQL {
  return sql`(
    ${coupons.isDisabled} = false
    and ${coupons.expiresAt} is not null
    and ${coupons.expiresAt} > now()
    and ${coupons.expiresAt} <= now() + (${hours} * interval '1 hour')
  )`;
}
