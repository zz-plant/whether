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

export default function CompsPage() {
  const [data, setData] = useState<CompsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/comps")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, []);

  return (
    <PageShell backdropVariant="default" showFooter>
      <article className="weather-panel space-y-6 px-5 py-5">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">
          Public SaaS Valuation Multiples
        </h1>
        <p className="text-sm text-slate-300">
          Median enterprise value to revenue multiples for a basket of 15 public SaaS companies.
          Updated in real-time from Yahoo Finance. No API key, no subscription required.
        </p>

        {loading ? (
          <div className="animate-pulse h-32 rounded-lg bg-slate-800/30" />
        ) : data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Median EV/Revenue</p>
              <p className="text-2xl font-semibold text-slate-100">{data.medianEvToRevenue?.toFixed(1)}x</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Median Revenue Growth</p>
              <p className="text-2xl font-semibold text-slate-100">{data.medianRevenueGrowth?.toFixed(1)}%</p>
            </div>
            <div className="weather-surface px-4 py-4 space-y-1">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">Companies Tracked</p>
              <p className="text-2xl font-semibold text-slate-100">{data.companyCount}/15</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Unable to load data. Please try again later.</p>
        )}

        <section className="space-y-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Basket composition</h2>
          <p className="text-sm text-slate-300">
            Snowflake, Shopify, Salesforce, HubSpot, MongoDB, Datadog, Atlassian, Workday, ServiceNow, Zscaler, Confluent, Toast, GitLab, Cloudflare, Freshworks.
          </p>
          <p className="text-sm text-slate-300">
            These 15 companies represent a cross-section of modern public SaaS — across cloud infrastructure, enterprise applications, security, data, and vertical SaaS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Why this matters</h2>
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
