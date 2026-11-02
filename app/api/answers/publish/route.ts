import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { publishAnswerPages } from "../../../../lib/answers/answerContentStore";
import { submitIndexNow } from "../../../../lib/seo/indexNow";
import { siteUrl } from "../../../../lib/siteUrl";

export const runtime = "edge";

/**
 * Publish a set of answer pages without a deploy.
 *
 * Auth is the same cron secret every write route uses. The body is the full
 * array of pages; it is schema-validated and structurally guarded (duplicate
 * slugs, thin onward links, duplicate enduring answers) before it is written.
 */
export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const pages = await publishAnswerPages(body);
    /* Tell IndexNow the answer URLs changed. A no-op without the key, and a
       failed ping never fails the publish. */
    const indexNow = await submitIndexNow(pages.map((page) => `${siteUrl}/answers/${page.slug}`));
    return NextResponse.json({ ok: true, pages: pages.length, indexNow });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "publish_failed" },
      { status: 422 },
    );
  }
}
