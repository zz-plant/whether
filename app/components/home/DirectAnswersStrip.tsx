import Link from "next/link";
import { featuredAnswerPages } from "../../answers/selectors";
import type { Route } from "../../../lib/navigation/routeType";

const answerPageHref = (slug: string): Route => `/answers/${slug}`;

/**
 * The five most-asked questions, answered in one line under this week's call.
 *
 * Most readers arrive with "should I hire?", not with a role, a stage and a
 * situation to navigate. /resolve is the full list; this is the head of it,
 * on the page where the question occurs to them.
 */
export function DirectAnswersStrip({ actionNow }: { actionNow: string }) {
  const pages = featuredAnswerPages.slice(0, 5);
  if (pages.length === 0) return null;

  return (
    <section
      aria-labelledby="direct-answers-heading"
      data-sticky-strip-hide
      className="weather-section rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="direct-answers-heading" className="type-section font-semibold tracking-tight text-white">
          Direct answers
        </h2>
        <Link href="/resolve#direct-answers" className="text-fluid-nano font-medium text-sky-300 hover:text-sky-200">
          All answers →
        </Link>
      </div>
      <p className="mt-1 text-fluid-nano text-white/45">Under this week&apos;s call: {actionNow}</p>
      <ul className="mt-3 divide-y divide-[color:var(--border-default)] border-y border-[color:var(--border-default)]">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link
              href={answerPageHref(page.slug)}
              className="flex min-h-[44px] items-center justify-between gap-3 py-2.5 no-underline hover:bg-slate-900/40"
            >
              <span className="min-w-0">
                <span className="block text-fluid-xs font-semibold text-slate-100">{page.title}</span>
                <span className="block text-fluid-nano text-slate-400">{page.shortAnswer}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-slate-500">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
