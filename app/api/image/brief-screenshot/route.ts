import { isRecordDate, readBriefScreenshot } from "../../../../lib/export/briefScreenshot";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/image/brief-screenshot?date=YYYY-MM-DD (or date=latest)
 *
 * Serves the weekly-call screenshot the Monday cron stored (lib/export/briefScreenshot.ts).
 * Slack fetches this once when the post lands and proxies it from then on, so the route
 * only ever serves stored bytes — it never triggers a capture, which keeps a public URL
 * from being a way to spend browser time.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "latest";
  if (date !== "latest" && !isRecordDate(date)) {
    return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD or latest" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const png = await readBriefScreenshot(date);
  if (!png) {
    return new Response(JSON.stringify({ error: "no screenshot stored for that week" }), {
      status: 404,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  return new Response(png, {
    status: 200,
    headers: {
      "content-type": "image/png",
      // A dated image never changes once stored; "latest" moves every Monday.
      "cache-control": date === "latest"
        ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600"
        : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
