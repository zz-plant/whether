"use client";

import { useHydrated } from "./browserSource";
import { buildMondayAgendaDescription, buildMondayCalendarUrl } from "./calendarButton";
import { siteUrl } from "../../lib/siteUrl";
import { CALENDAR_FEED_PATH } from "../../lib/export/calendarFeed";

function formatReviewTimeInReaderZone(utcHour = 13, utcMinute = 0): string {
  const d = new Date();
  d.setUTCHours(utcHour, utcMinute, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nextMondayIsoDateString(): string {
  const date = new Date();
  const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().split("T")[0];
}

function buildOneTimeReviewUrl({
  title = "Whether: Monday review (3 min)",
  details = buildMondayAgendaDescription(),
}: {
  title?: string;
  details?: string;
} = {}): string {
  const date = nextMondayIsoDateString().replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${date}T130000Z/${date}T133000Z`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function CalendarReviewActions({
  title = "Whether: Monday review (3 min)",
  details,
  feedUrl = `${siteUrl}${CALENDAR_FEED_PATH}`,
  variant = "full",
}: {
  title?: string;
  details?: string;
  feedUrl?: string;
  variant?: "full" | "compact";
}) {
  const hydrated = useHydrated();
  const timeLabel = hydrated ? formatReviewTimeInReaderZone(13, 0) : "9:00 AM ET";
  const webcal = feedUrl.replace(/^https?:/, "webcal:");
  const linkClass =
    "weather-hit text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200 transition-colors";

  const resolvedDetails = details ?? buildMondayAgendaDescription();
  const oneTimeUrl = buildOneTimeReviewUrl({ title, details: resolvedDetails });
  const recurringUrl = buildMondayCalendarUrl(title, resolvedDetails);

  /* On a phone these wrap one link a row. Each reaches up only across the row gap
     (`--weather-hit-up`, controls.css): at 14px "Schedule a weekly review" took the lower
     half of "Add next Monday's review". The compact rows are 18px of text, so their gap
     is 6px, not 4px, for a 24px row a thumb can tell from the next (2026-11-12). */
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-fluid-nano text-slate-300 [--weather-hit-up:6px]">
        <a href={oneTimeUrl} target="_blank" rel="noreferrer" className={linkClass}>
          Add next Monday&rsquo;s review
        </a>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <a href={recurringUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Schedule a weekly review ({timeLabel})
        </a>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="inline-flex items-center gap-1">
          <span>Calendar feed:</span>
          <a href={webcal} className={linkClass}>
            Apple/Outlook
          </a>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            Google
          </a>
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-3 space-y-2 text-fluid-sm text-slate-300">
      <p className="type-eyebrow text-slate-400">Calendar actions</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 [--weather-hit-up:8px]">
        <a href={oneTimeUrl} target="_blank" rel="noreferrer" className={linkClass}>
          Add next Monday&rsquo;s review
        </a>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <a href={recurringUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Schedule a weekly review (Mondays at {timeLabel})
        </a>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="inline-flex items-center gap-1 text-slate-400">
          <span>Each week&rsquo;s guidance as a calendar feed:</span>
          <a href={webcal} className={linkClass}>
            Apple or Outlook
          </a>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            Google
          </a>
        </span>
      </div>
    </div>
  );
}
