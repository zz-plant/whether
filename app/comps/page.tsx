import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { buildPageMetadata } from "../../lib/seo";
import { buildCompsStructuredData } from "../../lib/seo/pageStructuredData";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
// Slot labels come from the one vocabulary source; Invariant 8 fails the suite
// when a surface spells them itself.
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import {
  SAAS_BASKET,
  SAAS_BASKET_COMPANIES,
  fetchSaaSValuations,
  QuoteSourceUnavailableError,
  type SaaSValuationSnapshot,
} from "../../lib/saasMultiples";

import { ValuationMultiplesGlyph } from "../components/illustrations/ValuationMultiplesGlyph";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Public SaaS Valuation Multiples",
  description:
    "Median EV/Revenue and revenue growth across a 15-company public SaaS basket, and what those multiples imply for private fundraising conditions.",
  path: "/comps",
  imageAlt: "Whether public SaaS valuation multiples",
});

const formatMultiple = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}x`);
const formatPercent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

type CompsState =
  | { status: "ok"; data: SaaSValuationSnapshot }
  | { status: "source-down" }
  | { status: "error" };

/*
 * Read the basket here rather than through `/api/comps`.
 *
 * This page used to be the app's only `"use client"` route, fetching its own API
 * from a `useEffect`. That put every number on the page — the medians, the
 * company count, the whole reason the page exists — outside the server-rendered
 * document, so a crawler saw two headings and a basket of nothing. It also made
 * the page fetch the origin it is served from, which is the same self-fetch the
 * cron path is forbidden from doing: `/api/comps` is a thin wrapper over
 * `fetchSaaSValuations()`, so calling the function directly drops a network hop
 * without changing an answer.
 *
 * Failures are states, not throws: an unreachable upstream is reported as an
 * outage rather than a basket of dashes (the distinction `/api/comps` draws with
 * its 503), and any other error still renders the page. Nothing here can fail a
 * build or a request.
 */
const loadComps = async (): Promise<CompsState> => {
  try {
    return { status: "ok", data: await fetchSaaSValuations() };
  } catch (error) {
    if (error instanceof QuoteSourceUnavailableError) {
      return { status: "source-down" };
    }
    return { status: "error" };
  }
};

export default async function CompsPage() {
  /*
   * The multiples and the current call, together.
   *
   * This page listed a median and then explained, in evergreen prose, that
   * public multiples influence private rounds — true in every week, and so
   * useful in none. The reader's actual question is what this week's reading
   * changes about a raise they are considering now, and the posture that answers
   * it is one loader away.
   */
  const [comps, brief] = await Promise.all([loadComps(), loadWeeklyBriefSnapshot(undefined, { route: "/comps" })]);
  const { reportData } = brief;
  /*
   * The capital-raising rule, not `actionNowShort`.
   *
   * `actionNowShort` is the regime's generic direction sentence — "Conditions
   * holding — keep scaling proven bets at the current pace" — which concerns
   * raising no more than it concerns anything else. Labelling it "Capital-raising
   * call" on a page about valuation comparables put a heading on copy that does
   * not answer it. `decisionRules` carries a real per-area rule.
   */
  const capitalRule = brief.snapshot.homeBriefModel.decisionRules.find((rule) => rule.area === "capital-raising");

  return (
    <PageShell
      backdropVariant="default"
      structuredData={buildCompsStructuredData({ data: comps.status === "ok" ? comps.data : null, tickers: SAAS_BASKET })}
    >
      <article className="weather-panel space-y-6 px-5 max-sm:px-0 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-fluid-2xl font-semibold text-slate-100">
              Public SaaS valuation multiples
            </h1>
            <p className="text-sm text-slate-300">
              Median enterprise value to revenue multiples for a basket of {SAAS_BASKET.length} public
              SaaS companies, read from Yahoo Finance.
            </p>
          </div>
          <ValuationMultiplesGlyph size={64} className="self-start sm:self-center" />
        </div>

        {comps.status === "ok" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Median EV/Revenue</p>
              <p className="text-2xl font-semibold text-slate-100">{formatMultiple(comps.data.medianEvToRevenue)}</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Median Revenue Growth</p>
              <p className="text-2xl font-semibold text-slate-100">{formatPercent(comps.data.medianRevenueGrowth)}</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Companies Tracked</p>
              <p className="text-2xl font-semibold text-slate-100">{comps.data.companyCount}/{SAAS_BASKET.length}</p>
            </div>
          </div>
        ) : comps.status === "source-down" ? (
          <p className="text-sm text-slate-400">
            Yahoo Finance is not serving quotes to us right now, so there are no multiples to show.
            This is an upstream outage, not a reading of zero — the basket is unchanged.
          </p>
        ) : (
          <p className="text-sm text-slate-400">Unable to load data. Please try again later.</p>
        )}

        <section className="weather-surface space-y-2 px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="type-eyebrow text-slate-400">Against this week&apos;s guidance</h2>
            <p className="text-xs text-slate-500">As of {reportData.recordDateLabel}</p>
          </div>
          <dl className="space-y-1.5 text-sm text-slate-200">
            <div className="flex flex-wrap gap-x-2">
              <dt className="shrink-0 font-semibold text-slate-400">{publicDecisionLabels.call}</dt>
              <dd className="min-w-0">{reportData.statusLabel}</dd>
            </div>
            {capitalRule ? (
              <>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 font-semibold text-slate-400">Fundraising</dt>
                  <dd className="min-w-0">{capitalRule.doNow[0] ?? capitalRule.recommendation}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 font-semibold text-slate-400">{publicDecisionLabels.threshold}</dt>
                  <dd className="min-w-0">{capitalRule.pauseTrigger}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 font-semibold text-slate-400">{publicDecisionLabels.reversal}</dt>
                  <dd className="min-w-0">{capitalRule.resumeTrigger}</dd>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-slate-400">This week&apos;s action</dt>
                <dd className="min-w-0">{reportData.actionNowShort}</dd>
              </div>
            )}
          </dl>
          <p className="text-sm text-slate-300">
            {comps.status === "ok" && comps.data.medianEvToRevenue !== null
              ? `Read the ${formatMultiple(comps.data.medianEvToRevenue)} median as the price the public market is paying for a dollar of recurring revenue this week. It sets the comparable a late-stage round is argued against, so it moves the burden of proof on a raise rather than the decision itself.`
              : "With no median this week, the fundraising rule above rests on interest rates alone — the comparable is missing, not zero."}
          </p>
          <Link href="/" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Open the weekly brief
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="type-eyebrow">Basket composition</h2>
          {/* Derived, not retyped: the names and the count came from two places
              and could disagree the moment a ticker was added. */}
          <p className="text-sm text-slate-300">
            {SAAS_BASKET_COMPANIES.map((company) => company.name).join(", ")}.
          </p>
          <p className="text-sm text-slate-300">
            These {SAAS_BASKET_COMPANIES.length} companies represent a cross-section of modern public SaaS — across cloud infrastructure, enterprise applications, security, data, and vertical SaaS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-eyebrow">Why this matters</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The same public-market investors often lead or influence late-stage rounds, so a compression in public multiples reaches private valuations with a lag rather than not at all. That lag is why this page is worth reading before a raise is priced, not after.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            <Link href="/api-docs" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
              Fetch this by API
            </Link>
          </p>
        </section>
      </article>
    </PageShell>
  );
}
