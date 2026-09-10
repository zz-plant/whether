import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/pageShell";
import { buildPageMetadata } from "../../lib/seo";
import {
  SAAS_BASKET,
  fetchSaaSValuations,
  QuoteSourceUnavailableError,
  type SaaSValuationSnapshot,
} from "../../lib/saasMultiples";

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
  const comps = await loadComps();

  return (
    <PageShell backdropVariant="default">
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">
          Public SaaS valuation multiples
        </h1>
        <p className="text-sm text-slate-300">
          Median enterprise value to revenue multiples for a basket of {SAAS_BASKET.length} public
          SaaS companies, read from Yahoo Finance.
        </p>

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

        <section className="space-y-3">
          <h2 className="type-eyebrow">Basket composition</h2>
          <p className="text-sm text-slate-300">
            Snowflake, Shopify, Salesforce, HubSpot, MongoDB, Datadog, Atlassian, Workday, ServiceNow, Zscaler, Confluent, Toast, GitLab, Cloudflare, Freshworks.
          </p>
          <p className="text-sm text-slate-300">
            These {SAAS_BASKET.length} companies represent a cross-section of modern public SaaS — across cloud infrastructure, enterprise applications, security, data, and vertical SaaS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="type-eyebrow">Why this matters</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Public SaaS valuation multiples directly affect private startup fundraising. When public multiples compress, private valuations follow — because the same public market investors often lead or influence late-stage rounds. When multiples expand, fundraising conditions improve.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The current regime is displayed on the <Link href="/" className="text-sky-200 underline decoration-sky-600">homepage</Link> alongside fundraising guidance that incorporates this context. An AI agent can query this data via <code className="text-sky-200">GET /api/mcp?tool=get_comps</code>.
          </p>
        </section>
      </article>
    </PageShell>
  );
}
