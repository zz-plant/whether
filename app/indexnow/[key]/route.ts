import { readSetting } from "../../../lib/runtime/settings";

export const runtime = "edge";

/**
 * The IndexNow key file, served at `/indexnow/{key}.txt`.
 *
 * The key is a deployment secret; the file returns it byte for byte, which is
 * what IndexNow checks. Without `INDEXNOW_KEY` the route is a 404, so no
 * environment advertises a key it does not have.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key: requested } = await params;
  const key = readSetting("INDEXNOW_KEY");
  if (!key || requested !== `${key}.txt`) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
