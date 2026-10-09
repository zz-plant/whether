import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ActionLink } from "../components/ui/actionLink";
import { PageShell } from "../components/pageShell";
import { SectionTabs } from "../components/sectionTabs";
import { buildPageMetadata, formatTitleMonth } from "../../lib/seo";
import { formatDateUTC } from "../../lib/formatters";
import { buildCompsStructuredData } from "../../lib/seo/pageStructuredData";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
// Slot labels come from the one vocabulary source; Invariant 8 fails the suite
// when a surface spells them itself.
import { publicDecisionLabels } from "../../lib/report/reportFormatting";
import {
  MARKET_DATA_PROVIDER_LABELS,
  SAAS_BASKET,
  SAAS_BASKET_COMPANIES,
  fetchSaaSValuations,
  QuoteSourceUnavailableError,
  type SaaSValuationSnapshot,
} from "../../lib/saasMultiples";


export const runtime = "edge";
export const revalidate = 900;

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
 *
 * Cached per request: the title and the page both need the read, and fetching
 * the basket twice would double the upstream calls on the path where they are
 * already being refused.
 */
const loadComps = cache(async (): Promise<CompsState> => {
  try {
    return { status: "ok", data: await fetchSaaSValuations() };
  } catch (error) {
    if (error instanceof QuoteSourceUnavailableError) {
      return { status: "source-down" };
    }
    return { status: "error" };
  }
});

/*
 * The title in the words people search ("SaaS valuation multiples 2026"),
 * with the month of the read that produced the numbers. The month comes from
 * the basket's own `fetchedAt`, the date printed beside the figures: with no
 * basket there is no month to claim, and the title says what the page is
 * without one.
 */
export async function generateMetadata(): Promise<Metadata> {
  const comps = await loadComps();
  const month = comps.status === "ok" ? formatTitleMonth(comps.data.fetchedAt) : null;
  return buildPageMetadata({
    title: month ? `SaaS Valuation Multiples, ${month}` : "SaaS Valuation Multiples: Public SaaS EV/Revenue",
    description: `Median EV/Revenue multiple and revenue growth across ${SAAS_BASKET.length} public SaaS companies, with the date of the read and this week's fundraising guidance.`,
    path: "/comps",
    imageAlt: "Whether SaaS valuation multiples",
  });
}

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
  /* The same date the title's month comes from, printed beside the figures it dates. */
  const readMonth = comps.status === "ok" ? formatTitleMonth(comps.data.fetchedAt) : null;

  return (
    <PageShell
      backdropVariant="default"
      structuredData={buildCompsStructuredData({ data: comps.status === "ok" ? comps.data : null, tickers: SAAS_BASKET })}
    >
      <SectionTabs currentPath="/comps" />
      <article className="weather-panel space-y-6 px-5 max-sm:px-0 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-fluid-2xl font-semibold text-slate-100">
              SaaS valuation multiples{readMonth ? `, ${readMonth}` : ""}
            </h1>
            <p className="text-sm text-slate-300">
              Median enterprise value to revenue multiples for a basket of {SAAS_BASKET.length} public
              SaaS companies.
            </p>
          </div>
        </div>

        {comps.status === "ok" ? (
          <div className="space-y-2">
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
            <p className="text-xs text-slate-500">
              As of <time dateTime={comps.data.fetchedAt}>{formatDateUTC(comps.data.fetchedAt)}</time>, from{" "}
              {MARKET_DATA_PROVIDER_LABELS[comps.data.source]}.
            </p>
          </div>
        ) : comps.status === "source-down" ? (
          <p className="text-sm text-slate-400">
            None of our market data sources is answering right now, so there are no multiples to show.
            The figures are missing, not zero; the basket is unchanged.
          </p>
        ) : (
          <p className="text-sm text-slate-400">Unable to load data. Please try again later.</p>
        )}

        <section className="weather-surface space-y-2 px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="type-eyebrow text-slate-400">Against this week&apos;s guidance</h2>
            <p className="text-xs text-slate-500">Data as of {reportData.recordDateLabel}</p>
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
          {/* Only when the median is missing. With one, this said how to use it and
              that it does not price a private round, which "Use public multiples in a
              fundraising discussion" below says in full (2026-10-09). */}
          {comps.status === "ok" && comps.data.medianEvToRevenue !== null ? null : (
            <p className="text-sm text-slate-300">
              With no median available, the fundraising guidance still uses the brief&apos;s macro signals. The public valuation comparison is missing, not zero.
            </p>
          )}
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
            These {SAAS_BASKET_COMPANIES.length} companies represent a cross-section of modern public SaaS: cloud infrastructure, enterprise applications, security, data, and vertical SaaS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-eyebrow">Use public multiples in a fundraising discussion</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Founders, finance teams and board members can use the basket to question valuation assumptions.
            Compare growth, gross margin, retention, scale and the revenue period before choosing a comparable.
            Public shares are liquid; a private round also depends on its terms, investor demand and company risk.
            Multiplying private ARR by this median does not produce a supported valuation.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            For the board note, record the observation date, selected comparable, revenue basis and the differences
            that matter. Revisit the financing plan when actual investor feedback or the cash deadline changes.
          </p>
          <ActionLink href="/answers/should-startups-raise-capital-now" variant="inline">Decide when to prepare a raise</ActionLink>
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
