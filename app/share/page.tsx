"use client";

import { PageShell } from "../components/pageShell";

export default function SharePage() {
  return (
    <PageShell backdropVariant="default" showFooter>
      <section className="weather-panel space-y-5 px-5 py-5">
        <h1 className="text-fluid-xl font-semibold text-slate-100">Share this brief</h1>
        <p className="text-sm text-slate-300">
          Copy the brief in the format that fits your meeting or channel.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-sky-200">Plain text</h2>
            <p className="text-xs text-slate-300">For email, messaging, or docs.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => { navigator.clipboard.writeText("Whether Weekly Brief\nMacro signals → operating posture.\nhttps://whether.work"); }}
            >Copy text</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-emerald-200">Slack format</h2>
            <p className="text-xs text-slate-300">Formatted for Slack channels.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => { navigator.clipboard.writeText("*Whether Weekly Brief*\nMacro signals → operating posture.\nhttps://whether.work"); }}
            >Copy Slack</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-amber-200">Board brief</h2>
            <p className="text-xs text-slate-300">One-page summary for board packets.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => {
                const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                navigator.clipboard.writeText([
                  `Whether Operating Brief — ${date}`,
                  ``,
                  `Current regime and operating posture for the period.`,
                  ``,
                  `Action, threshold, and reversal conditions are based on Treasury yields, credit spreads, inflation, and employment data.`,
                  ``,
                  `Full brief: https://whether.work`,
                  ``,
                  `Guidance based on aggregate macro signals. Use judgment — conditions vary by company, industry, and stage.`,
                ].join("\n"));
              }}
            >Copy board brief</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-violet-200">Calendar event</h2>
            <p className="text-xs text-slate-300">Add a weekly brief review to your calendar.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                const ds = d.toISOString().split("T")[0];
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Whether Weekly Brief Review")}&dates=${ds}T140000/${ds}T143000&details=${encodeURIComponent("Review the weekly operating brief.\n\nhttps://whether.work")}`, "_blank");
              }}
            >Add to Calendar</button>
          </article>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5">
        <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-slate-400">About Whether</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Whether tracks public macro signals and translates them into a weekly operating posture for startup and product leaders. The brief goes out every Monday — delivered to your inbox and your team&apos;s Slack.
        </p>
        <p className="text-fluid-xs text-slate-500 italic">Guidance based on aggregate macro signals. Use your judgment.</p>
      </section>
    </PageShell>
  );
}
