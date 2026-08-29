import { buildAgentInterfaceResponse } from "../../lib/agentInterface";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  try {
    const brief = await buildAgentInterfaceResponse("weekly");
    /* These read `summary.action` and `summary.recordDate` through an `as any`,
       and neither field exists on WeeklySummary — so every item in this public
       feed published "Hold" as the action and the generation date as the record
       date, whatever the week actually said. The real fields are `guidance` and
       `recordDateLabel`. */
    const summary = brief.summary;
    const regime = String(summary.regime ?? "Stable");
    const action = String(summary.guidance ?? "Hold");
    const recordDate = String(summary.recordDateLabel ?? new Date().toISOString().split("T")[0]);
    const confidence = String(summary.confidence ?? "MED");

    const pubDate = new Date(recordDate).toUTCString();
    const link = "https://whether.work";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Whether Weekly Brief</title>
    <link>${link}</link>
    <description>Macro signals → operating posture for startup and product leaders. Updated weekly.</description>
    <language>en</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <item>
      <title>Weekly Brief — ${regime}: ${action}</title>
      <link>${link}</link>
      <guid isPermaLink="false">whether-brief-${recordDate}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>Regime: ${regime}. Action: ${action}. Confidence: ${confidence}.</description>
      <content:encoded><![CDATA[
        <p><strong>Regime:</strong> ${regime}</p>
        <p><strong>Action:</strong> ${action}</p>
        <p><strong>Confidence:</strong> ${confidence}</p>
        <p><strong>Record date:</strong> ${recordDate}</p>
        <p><a href="${link}">View full brief →</a></p>
        <p style="font-size:0.85rem;color:#64748b;">Based on public data. Your situation may vary.</p>
      ]]></content:encoded>
    </item>
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Whether Weekly Brief</title>
    <link>https://whether.work</link>
    <description>Macro signals → operating posture.</description>
    <item>
      <title>Weekly Brief</title>
      <link>https://whether.work</link>
      <guid isPermaLink="false">whether-brief</guid>
      <description>Brief unavailable. Please visit the site.</description>
    </item>
  </channel>
</rss>`;
    return new Response(fallbackXml, {
      headers: { "content-type": "application/rss+xml; charset=utf-8" },
    });
  }
}
