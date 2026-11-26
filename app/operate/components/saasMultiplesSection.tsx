import Link from "next/link";
import { cache } from "react";
import { ActionLink } from "../../components/ui/actionLink";
import { JsonLdScript } from "../../components/jsonLdScript";
import { ReportSection } from "../../components/reportSection";
import { formatTitleMonth } from "../../../lib/seo";
import { formatDateUTC } from "../../../lib/formatters";
import { buildCompsStructuredData } from "../../../lib/seo/pageStructuredData";
import { COMPANIES } from "../../../lib/companies/companyRegistry";
import { readCompanyRecord } from "../../../lib/companies/companyFilingStore";
import {
  MARKET_DATA_PROVIDER_LABELS,
  SAAS_BASKET,
  SAAS_BASKET_COMPANIES,
  fetchSaaSValuations,
  QuoteSourceUnavailableError,
  type SaaSValuationSnapshot,
} from "../../../lib/saasMultiples";

/** Where the basket sits on the runway planner. `/comps` redirects here. */
const SAAS_MULTIPLES_ANCHOR = "saas-multiples";

const formatMultiple = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}x`);
const formatPercent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

type CompsState =
  | { status: "ok"; data: SaaSValuationSnapshot }
  | { status: "source-down" }
  | { status: "error" };

/*
 * Read the basket directly, not through `/api/comps`, which is a thin wrapper over
 * `fetchSaaSValuations()`: a page fetching its own origin is the self-fetch the cron path
 * is forbidden. Failures are states, not throws: an unreachable upstream is reported as an
 * outage rather than a basket of dashes, and any other error still renders the planner.
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

/**
 * The public SaaS basket, a section of the runway planner since 2026-11-25.
 *
 * It was its own page, /comps, filed under Plan beside the planner: the multiples are this
 * month's market input to a raise, read beside a raise window. Its "Against this week's
 * guidance" block printed the fundraising rule, which Plan's rule table and the brief carry,
 * so it did not come along. The planner renders this under a Suspense boundary, so a slow
 * quote source never holds up the calculator.
 */
export async function SaasMultiplesSection() {
  const comps = await loadComps();
  /* The read's own month, printed beside the figures it dates. */
  const readMonth = comps.status === "ok" ? formatTitleMonth(comps.data.fetchedAt) : null;
  /* The basket and the company pages overlap: link the overlap, and mark an 8-K item 2.05
     filed in the twelve months before this read, so a valuation conversation can open the
     filing history behind the multiple. */
  const registryByTicker = new Map(COMPANIES.map((company) => [company.ticker.toUpperCase(), company]));
  const basketPages = SAAS_BASKET_COMPANIES.flatMap((company) => {
    const page = registryByTicker.get(company.ticker);
    return page ? [{ ticker: company.ticker, page }] : [];
  });
  /* Only a read with a date can say a filing is recent; an outage does not spend the KV
     reads to learn nothing. */
  const records = comps.status === "ok"
    ? await Promise.all(basketPages.map(async ({ ticker, page }) => [ticker, await readCompanyRecord(page)] as const))
    : [];
  const recordByTicker = new Map<string, (typeof records)[number][1]>(records);
  const restructuringCutoff = comps.status === "ok"
    ? new Date(new Date(comps.data.fetchedAt).getTime() - 365 * 86_400_000).toISOString().slice(0, 10)
    : null;
  const hasRecentRestructuring = (ticker: string) => {
    if (!restructuringCutoff) return false;
    return (recordByTicker.get(ticker)?.restructurings ?? []).some((filing) => filing.filedOn >= restructuringCutoff);
  };

  return (
    <>
      {comps.status === "ok" ? (
        <JsonLdScript data={buildCompsStructuredData({ data: comps.data, tickers: SAAS_BASKET })} />
      ) : null}
      <ReportSection
        id={SAAS_MULTIPLES_ANCHOR}
        title={`What a SaaS company is worth${readMonth ? `, ${readMonth}` : ""}`}
        description={`Median enterprise value to revenue multiples for a basket of ${SAAS_BASKET.length} public SaaS companies.`}
      >
        <div className="space-y-6">
          {/* One figure leads: the median multiple, the number a valuation conversation
              starts from. Growth and the basket count qualify it, with the read's date. */}
          {comps.status === "ok" ? (
            <div className="space-y-2">
              <p className="text-fluid-xl font-semibold text-slate-100">
                {comps.data.medianEvToRevenue === null ? (
                  "No median multiple in this read."
                ) : (
                  <>
                    Median EV/revenue:{" "}
                    <span className="tabular-nums">{formatMultiple(comps.data.medianEvToRevenue)}</span>
                  </>
                )}
              </p>
              <p className="text-sm text-slate-300">
                Median revenue growth {formatPercent(comps.data.medianRevenueGrowth)}, across{" "}
                {comps.data.growthCompanyCount === SAAS_BASKET.length
                  ? `all ${SAAS_BASKET.length} companies in the basket`
                  : `${comps.data.growthCompanyCount} of the ${SAAS_BASKET.length} companies in the basket`}
                . As of <time dateTime={comps.data.fetchedAt}>{formatDateUTC(comps.data.fetchedAt)}</time>, from{" "}
                {MARKET_DATA_PROVIDER_LABELS[comps.data.source]}.
              </p>
            </div>
          ) : comps.status === "source-down" ? (
            <p className="text-sm text-slate-400">
              Market data sources are unreachable right now, so no multiples are available.
              The figures are missing, not zero; the basket is unchanged.
            </p>
          ) : (
            <p className="text-sm text-slate-400">The multiples could not be loaded. Reload the page in a few minutes.</p>
          )}

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-100">Which companies are in the median</h3>
            {/* Derived, not retyped. Each name that has a company page links to it; an 8-K
                item 2.05 in the last twelve months is named beside its company. */}
            <ul className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-300 [--weather-hit-up:4px]">
              {SAAS_BASKET_COMPANIES.map((company) => {
                const page = registryByTicker.get(company.ticker);
                const flagged = hasRecentRestructuring(company.ticker);
                return (
                  <li key={company.ticker} className="inline-flex items-baseline gap-1">
                    {page ? (
                      <Link
                        href={`/companies/${page.slug}${flagged ? "#company-restructurings" : ""}`}
                        className="weather-hit weather-focus-ring text-[var(--accent-action)] underline underline-offset-4 transition-colors hover:text-slate-100"
                      >
                        {company.name}
                      </Link>
                    ) : (
                      company.name
                    )}
                    {flagged ? (
                      <span
                        className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400"
                        title="Filed an 8-K item 2.05 restructuring in the twelve months before this read"
                      >
                        8-K
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-slate-300">
              <Link href="/companies" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                What public companies have filed, by role
              </Link>
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-100">Use public multiples in a fundraising discussion</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-300">
              <li>Use the basket to test valuation assumptions—not as a direct multiplier on private ARR.</li>
              <li>Adjust for growth, gross margin, retention, scale, revenue basis, and private-round illiquidity.</li>
              <li>Log the observation date, chosen comparable, and key differences; revisit when investor feedback or cash deadlines shift.</li>
            </ul>
            <ActionLink href="/answers/should-startups-raise-capital-now" variant="inline">Decide when to prepare a raise</ActionLink>
          </div>
        </div>
      </ReportSection>
    </>
  );
}
