import { buildOEmbed } from "../../../lib/export/oembed";

export const runtime = "edge";

/** oEmbed for the live brief (`lib/export/oembed.ts`). JSON only; XML is answered 501, as the spec allows. */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  if (format !== "json") return new Response("Only format=json is served.", { status: 501 });

  const limit = (name: string) => {
    const raw = searchParams.get(name);
    return raw === null ? undefined : Number(raw);
  };
  const body = buildOEmbed(searchParams.get("url"), { maxWidth: limit("maxwidth"), maxHeight: limit("maxheight") });
  if (!body) return new Response("Not an embeddable whether.work address.", { status: 404 });

  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
