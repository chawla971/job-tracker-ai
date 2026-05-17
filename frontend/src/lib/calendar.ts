/**
 * Generates a Google Calendar "add event" URL.
 * Opens in a new tab — no API auth required, just a pre-filled form.
 */
export function googleCalendarUrl({
  title,
  startIso,
  durationMinutes = 60,
  details = "",
}: {
  title: string;
  startIso: string;
  durationMinutes?: number;
  details?: string;
}): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}
