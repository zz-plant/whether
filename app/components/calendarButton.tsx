"use client";

export function CalendarButton({ title, description, date }: { title: string; description: string; date: string }) {
  const [, year, month, day] = /(\d{4})-(\d{2})-(\d{2})/.exec(date)?.map(Number) ?? [];
  if (!year) return null;

  const start = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}T140000`;
  const end = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}T143000`;

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(description)}`;

  return (
    <a
      href={googleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="weather-button inline-flex min-h-[36px] items-center justify-center rounded-full px-3 py-1.5 text-fluid-xs font-semibold tracking-[0.04em]"
    >
      Add to Calendar
    </a>
  );
}
