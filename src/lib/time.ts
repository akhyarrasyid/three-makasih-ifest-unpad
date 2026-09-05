import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";

// Configure dayjs with UTC, Timezone, and RelativeTime plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export const JAKARTA_TZ = "Asia/Jakarta";

/**
 * Returns a Dayjs object explicitly set to Asia/Jakarta (WIB / UTC+7).
 */
export function jakartaDayjs(date?: string | number | Date | dayjs.Dayjs) {
  return dayjs(date).tz(JAKARTA_TZ);
}

/**
 * Returns current timestamp in epoch milliseconds.
 */
export function getJakartaNow(): number {
  return Date.now();
}

/**
 * Format time in Jakarta timezone (WIB).
 * Example: "13:45:20 WIB"
 */
export function fmtJakartaTime(input?: number | string | Date, withSeconds = true): string {
  if (!input) return "—";
  return jakartaDayjs(input).format(withSeconds ? "HH:mm:ss" : "HH:mm") + " WIB";
}

/**
 * Format date & time in Jakarta timezone (WIB).
 * Example: "05 Sep 2026, 13:45 WIB"
 */
export function fmtJakartaDateTime(input?: number | string | Date): string {
  if (!input) return "—";
  return jakartaDayjs(input).format("DD MMM YYYY, HH:mm") + " WIB";
}

/**
 * Format full date in Jakarta timezone.
 * Example: "05 Sep 2026"
 */
export function fmtJakartaDate(input?: number | string | Date): string {
  if (!input) return "—";
  return jakartaDayjs(input).format("DD MMM YYYY");
}

/**
 * Format relative time (e.g. "3 hours ago", "in 2 hours") relative to Jakarta time.
 */
export function fmtJakartaRelative(input: number | string | Date): string {
  return jakartaDayjs(input).fromNow();
}
