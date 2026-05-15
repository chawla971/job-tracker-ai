/**
 * Format a date or datetime string as a short absolute date.
 * e.g. "Mar 31", "Apr 2, 2025" (includes year if not current year)
 */
export function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Format a datetime string to a readable local format.
 * e.g. "Apr 2 at 10:30 AM"
 */
export function formatDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Returns how many days until a future datetime string.
 * Returns 0 if today, negative if in the past.
 */
export function daysUntil(datetime: string): number {
  const diff = new Date(datetime).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/**
 * Returns how many days since a past date/datetime string.
 * Uses calendar days (midnight-to-midnight) to avoid timezone drift.
 */
export function daysSince(timestamp: string): number {
  const then = new Date(timestamp);
  const now = new Date();
  // Compare dates at midnight local time to avoid UTC offset issues
  const thenDate = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((nowDate.getTime() - thenDate.getTime()) / 86_400_000);
}
