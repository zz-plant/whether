import { fetchTreasuryData } from "../lib/treasuryClient";
import { snapshotData } from "../lib/snapshot";
import { buildSensorReadings } from "../lib/sensors";
import { evaluateRegime } from "../lib/regimeEngine";
import { getPlaybookForRegime } from "../lib/playbook";

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : date.toUTCString();
};

export default async function HomePage() {
  const treasury = await fetchTreasuryData({ snapshotFallback: snapshotData });
  const sensors = buildSensorReadings(treasury);
  const assessment = evaluateRegime(treasury);
  const playbook = getPlaybookForRegime(assessment.regime);
  const stopItems = playbook?.stop ?? ["Avoid unbudgeted bets."];
  const startItems = playbook?.start ?? ["Invest in margin-positive moves."];
  const fenceItems = assessment.constraints;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Regime Station</p>
              <h1 className="text-3xl font-semibold">Whether Report</h1>
            </div>
            <span className="rounded-full border border-slate-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {treasury.isLive ? "Live" : "Offline / Simulated"}
            </span>
          </div>
          <p className="max-w-3xl text-slate-300">
            Translate Treasury signals into operational constraints. Every output is sourced and time-stamped
            for traceability.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Regime</p>
                <h2 className="text-2xl font-semibold">{assessment.regime}</h2>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                Tightness {assessment.scores.tightness} · Risk {assessment.scores.riskAppetite}
              </span>
            </div>
            <p className="mt-4 text-slate-200">{assessment.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {assessment.constraints.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
              <p>{assessment.tightnessExplanation}</p>
              <p>{assessment.riskAppetiteExplanation}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Data Source</h3>
            <p className="mt-2 text-sm text-slate-200">US Treasury Fiscal Data API</p>
            <p className="mt-4 text-xs text-slate-400">Record date</p>
            <p className="mono text-sm text-slate-200">{treasury.record_date}</p>
            <p className="mt-4 text-xs text-slate-400">Fetched at</p>
            <p className="mono text-sm text-slate-200">{formatTimestamp(treasury.fetched_at)}</p>
            <p className="mt-4 break-all text-xs text-slate-500">{treasury.source}</p>
          </div>
        </section>

        <section className="mt-10">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Live Sensor Array</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sensors.map((sensor) => (
              <div key={sensor.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-300">{sensor.label}</p>
                    <p className="mono mt-2 text-2xl text-slate-100">
                      {sensor.value === null ? "—" : `${sensor.value.toFixed(2)}${sensor.unit}`}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {sensor.isLive ? "Live" : "Offline"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{sensor.explanation}</p>
                <div className="mt-4 text-xs text-slate-500">
                  <p>Source: {sensor.source}</p>
                  <p>Record date: {sensor.record_date}</p>
                  <p>Fetched: {formatTimestamp(sensor.fetched_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Playbook</p>
                <h3 className="text-xl font-semibold">{playbook?.title ?? "Operational Guidance"}</h3>
                {playbook ? (
                  <p className="mt-2 text-sm text-slate-300">{playbook.insight}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">
                    Playbook data unavailable. Use regime constraints as guardrails.
                  </p>
                )}
              </div>
              {playbook ? (
                <div className="text-right text-xs text-slate-400">
                  <p>{playbook.tone}</p>
                  <p className="mt-1 text-slate-300">Mandate: {playbook.mandate}</p>
                  <p className="mt-1 text-slate-500">Metric: {playbook.metric}</p>
                </div>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stop</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {stopItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {startItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fence</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {fenceItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
          Not Financial Advice.
        </footer>
      </div>
    </main>
  );
}
