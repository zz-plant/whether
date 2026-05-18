import { PageShell } from "../components/pageShell";

export const runtime = "edge";

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
              onClick={() => {
                const text = `Whether Weekly Brief\nRegime and action summary.\nhttps://whether.work`;
                navigator.clipboard.writeText(text);
              }}
            >Copy text</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-emerald-200">Slack format</h2>
            <p className="text-xs text-slate-300">Formatted for Slack channels.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => {
                const text = `*Whether Weekly Brief*\nRegime and action summary.\nhttps://whether.work`;
                navigator.clipboard.writeText(text);
              }}
            >Copy Slack</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-amber-200">Leadership brief</h2>
            <p className="text-xs text-slate-300">Executive summary for leadership.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => {
                const text = `Leadership Brief\n\nKey call and action items from this week's operating brief.\nhttps://whether.work`;
                navigator.clipboard.writeText(text);
              }}
            >Copy executive summary</button>
          </article>
          <article className="weather-surface space-y-3 px-4 py-4">
            <h2 className="text-fluid-xs font-semibold uppercase tracking-[0.1em] text-violet-200">Calendar event</h2>
            <p className="text-xs text-slate-300">Add a weekly brief review to your calendar.</p>
            <button type="button" className="weather-button px-4 py-2 text-xs font-semibold"
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                const ds = d.toISOString().split("T")[0];
                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Whether Weekly Brief")}&dates=${ds}T140000/${ds}T143000&details=${encodeURIComponent("Review the weekly operating brief: https://whether.work")}`;
                window.open(url, "_blank");
              }}
            >Add to Calendar</button>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
