"use client";

export function buildMondayCalendarUrl(
  title = "Whether Weekly Posture Sync",
  description = "Review weekly macro regime & posture delta: https://whether.work",
) {
  // UTC on purpose: the times below carry a Z, and this renders on the server
  // (UTC) before it hydrates in the reader's zone. Local getters gave the two
  // sides different days after 7pm Central, and React reported the href as a
  // hydration mismatch on every evening load of the homepage.
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const start = `${year}${month}${day}T130000Z`;
  const end = `${year}${month}${day}T133000Z`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(description)}&recur=RRULE:FREQ=WEEKLY;BYDAY=MO`;
}

export function CalendarButton({ title, description, date }: { title: string; description: string; date: string }) {
  const [, year, month, day] = /(\d{4})-(\d{2})-(\d{2})/.exec(date)?.map(Number) ?? [];
  const googleUrl = year
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}T140000/${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}T143000&details=${encodeURIComponent(description)}`
    : buildMondayCalendarUrl(title, description);

  return (
    <a
      href={googleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.04em]"
    >
      Add to Calendar
    </a>
  );
}

