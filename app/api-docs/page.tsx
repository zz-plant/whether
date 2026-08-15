import type { Metadata } from "next";
import { PageShell } from "../components/pageShell";

export const metadata: Metadata = {
  title: "API & Agent Tools",
  description: "Programmatic access to the weekly brief, regime data, SaaS multiples, and decision framework. Tools for AI agents and developers.",
  robots: { index: true, follow: true },
};

export default function ApiDocsPage() {
  return (
    <PageShell backdropVariant="default">
      <article className="weather-panel space-y-6 px-5 py-5 max-w-3xl">
        <h1 className="text-fluid-xl font-semibold text-slate-100">API & Agent Tools</h1>
        <p className="text-sm text-slate-300">
          Whether exposes structured data through multiple interfaces. No API key required.
        </p>

        <section className="space-y-4">
          <h2 className="type-eyebrow">For AI agents</h2>
          <div className="space-y-3">
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/mcp?tool=get_brief</p>
              <p className="text-xs text-slate-300">Current regime, action, confidence, record date. Optional cadence param.</p>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/mcp?tool=get_context&regime=DEFENSIVE</p>
              <p className="text-xs text-slate-300">Regime duration, historical average, common next regime.</p>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/mcp?tool=get_projection&regime=DEFENSIVE&tightness=74&riskAppetite=32</p>
              <p className="text-xs text-slate-300">Weeks until threshold crossing at current velocity. Scenario modeling for agents.</p>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/mcp?tool=get_comps</p>
              <p className="text-xs text-slate-300">Median SaaS EV/Revenue multiple from 15 public companies.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">For developers</h2>
          <div className="space-y-3">
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/posture/current</p>
              <p className="text-xs text-slate-300">Stable JSON endpoint for the current posture. Returns regime, tightness, direction, confidence, week, summary, url, and version. Type contract at lib/types.ts.</p>
              <a href="/api/posture/current" className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600">Try it →</a>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /api/agent?cadence=weekly</p>
              <p className="text-xs text-slate-300">Full structured brief data with handoff payload. Supports weekly, monthly, quarterly, yearly.</p>
              <a href="/api/agent?cadence=weekly" className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600">Try it →</a>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /brief.md</p>
              <p className="text-xs text-slate-300">The current brief in Markdown format. Instant, structured, cacheable.</p>
              <a href="/brief.md" aria-label="View Markdown brief" className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600">View brief.md →</a>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /llms.txt</p>
              <p className="text-xs text-slate-300">Agent discovery document. Linked from &lt;link rel=&quot;llm&quot;&gt; in the page head.</p>
              <a href="/llms.txt" aria-label="View LLMs discovery document" className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600">View llms.txt →</a>
            </div>
            <div className="weather-surface px-4 py-3 space-y-1">
              <p className="text-fluid-xs font-semibold text-sky-200">GET /feed.xml</p>
              <p className="text-xs text-slate-300">RSS feed for the weekly brief. Subscribe in any RSS reader.</p>
              <a href="/feed.xml" aria-label="View RSS feed" className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600">View feed.xml →</a>
            </div>
          </div>
        </section>

        <p className="text-fluid-micro text-slate-400">
          All endpoints are free and require no authentication. Data is provided for informational purposes.
        </p>
      </article>
    </PageShell>
  );
}
