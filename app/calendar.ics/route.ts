import { buildBriefCalendarFeed } from "../../lib/export/calendarFeed";
import { getPublishedBriefs } from "../../lib/report/publishedBriefs";

export const runtime = "edge";
export const revalidate = 3600;

/** A subscribed calendar: each Monday carries its own week's guidance (`lib/export/calendarFeed.ts`). */
export function GET() {
  return new Response(buildBriefCalendarFeed(getPublishedBriefs(), new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="whether.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
