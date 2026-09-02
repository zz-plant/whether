"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "../components/pageShell";

type CompsData = {
  medianEvToRevenue: number | null;
  medianRevenueGrowth: number | null;
  companyCount: number;
  fetchedAt: string;
};

const formatMultiple = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}x`);
const formatPercent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

export default function CompsPage() {
  const [data, setData] = useState<CompsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceDown, setSourceDown] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/comps")
      .then(async (response) => {
        // 503 means the quote source turned us away, which is a different thing
        // to say than a basket of dashes.
        if (response.status === 503) throw new Error("quote_source_unavailable");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => { if (active) { setData(payload); setLoading(false); } })
      .catch((error: Error) => {
        if (!active) return;
        setSourceDown(error.message === "quote_source_unavailable");
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <PageShell backdropVariant="default">
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">
          Public SaaS valuation multiples
        </h1>
        <p className="text-sm text-slate-300">
          Median enterprise value to revenue multiples for a basket of 15 public SaaS companies,
          read from Yahoo Finance when the page loads.
        </p>

        {loading ? (
          <div className="animate-pulse h-32 rounded-lg bg-slate-800/30" />
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Median EV/Revenue</p>
              <p className="text-2xl font-semibold text-slate-100">{formatMultiple(data.medianEvToRevenue)}</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Median Revenue Growth</p>
              <p className="text-2xl font-semibold text-slate-100">{formatPercent(data.medianRevenueGrowth)}</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="type-eyebrow">Companies Tracked</p>
              <p className="text-2xl font-semibold text-slate-100">{data.companyCount}/15</p>
            </div>
          </div>
        ) : sourceDown ? (
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
            These 15 companies represent a cross-section of modern public SaaS — across cloud infrastructure, enterprise applications, security, data, and vertical SaaS.
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
