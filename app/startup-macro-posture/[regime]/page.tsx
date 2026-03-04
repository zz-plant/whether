import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { tierOneDecisionPages } from "../../answers/decisionPages";
import { findRegimePage, regimePages } from "../clusterData";

type RegimePageProps = {
  params: Promise<{ regime: string }>;
};

export const dynamicParams = false;
export const revalidate = 900;

export function generateStaticParams() {
  return regimePages.map((regime) => ({ regime: regime.slug }));
}

export async function generateMetadata({ params }: RegimePageProps): Promise<Metadata> {
  const { regime } = await params;
  const page = findRegimePage(regime);

  if (!page) {
    return buildPageMetadata({
      title: "Startup macro posture regime",
      description: "Regime-specific startup macro posture guidance.",
      path: "/startup-macro-posture",
      imageAlt: "Startup macro posture",
    });
  }

  return buildPageMetadata({
    title: `${page.title} for startups`,
    description: page.summary,
    path: `/startup-macro-posture/${page.slug}`,
    imageAlt: page.title,
  });
}

export default async function RegimeDeepPage({ params }: RegimePageProps) {
  const { regime } = await params;
  const page = findRegimePage(regime);

  if (!page) notFound();

  const siblingRegimes = regimePages.filter((entry) => entry.slug !== page.slug);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Regime deep page</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{page.title}</h1>
        <p className="text-sm text-slate-200">{page.summary}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Operating implications</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          <li>• Hiring: {page.hiring}</li>
          <li>• Product: {page.product}</li>
          <li>• Finance: {page.finance}</li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Trigger reversal</h2>
        <p className="weather-surface px-4 py-3 text-sm text-slate-200">{page.flipSignal}</p>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision pages to run next</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {tierOneDecisionPages.slice(0, 6).map((decisionPage) => (
            <Link key={decisionPage.slug} href={`/answers/${decisionPage.slug}`} className="weather-surface min-h-[44px] px-4 py-3 text-sm text-slate-100">
              {decisionPage.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Regime neighbors</h2>
        <div className="flex flex-wrap gap-2">
          {siblingRegimes.map((neighbor) => (
            <Link key={neighbor.slug} href={`/startup-macro-posture/${neighbor.slug}` as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              {neighbor.title}
            </Link>
          ))}
          <Link href={"/startup-macro-posture" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Category anchor</Link>
          <Link href="/evidence" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Signals evidence</Link>
        </div>
      </section>
    </main>
  );
}
