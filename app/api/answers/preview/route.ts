import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { readAnswerPagesWithSource } from "../../../../lib/answers/answerContentStore";

export const runtime = "edge";

/**
 * Read what would be published, before it is live.
 *
 * `?slug=` returns one page; without it, the slug list and where it came from
 * (`kv` for a published set, `seed` for the bundled JSON). Auth is the cron
 * secret, so a draft is not public.
 */
export async function GET(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const { pages, source } = await readAnswerPagesWithSource();
  const slug = new URL(request.url).searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ ok: true, source, count: pages.length, slugs: pages.map((page) => page.slug) });
  }

  const page = pages.find((candidate) => candidate.slug === slug);
  if (!page) {
    return NextResponse.json({ ok: false, error: "not_found", source }, { status: 404 });
  }

  return NextResponse.json({ ok: true, source, page });
}
