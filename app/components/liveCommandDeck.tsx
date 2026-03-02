"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientId } from "../operations/components/clientId";
import type { AlertDeliveryPreferences } from "../../lib/serverStore";
import type { AlertChannel, RegimeAlertEvent } from "../../lib/signalOps";

type ScenarioKey = "baseline" | "rates-up" | "demand-softening" | "hiring-freeze";
type RoleLens = "product" | "engineering" | "finance" | "executive";

const roleLensCopy: Record<RoleLens, string> = {
  product: "Protect core outcomes and keep launches reversible.",
  engineering: "Bias toward reliability and runtime efficiency before net-new complexity.",
  finance: "Require near-term payback evidence before expanding discretionary spend.",
  executive: "Align posture changes with approval cadence and downside guardrails.",
};

const scenarioAdjustments: Record<
  ScenarioKey,
  { hiring: string; roadmap: string; spend: string; label: string }
> = {
  baseline: { label: "Baseline", hiring: "No change", roadmap: "No change", spend: "No change" },
  "rates-up": {
    label: "Rates +50 bps",
    hiring: "Tighten approvals one stage",
    roadmap: "Shift mix toward payback-first",
    spend: "Require explicit payback windows",
  },
  "demand-softening": {
    label: "Demand softening",
    hiring: "Prioritize backfills over adds",
    roadmap: "Double down on retention and activation",
    spend: "Pause low-conviction expansions",
  },
  "hiring-freeze": {
    label: "Hiring freeze",
    hiring: "Freeze net adds",
    roadmap: "Concentrate on throughput and quality",
    spend: "Redeploy from headcount to tooling automation",
  },
};

const isScenario = (value: string | null): value is ScenarioKey =>
  Boolean(value && value in scenarioAdjustments);

const isLens = (value: string | null): value is RoleLens =>
  Boolean(value && value in roleLensCopy);

export function LiveCommandDeck({ fetchedAtLabel, changedSignalCount, regimeChanged, signalDirection }: {
  fetchedAtLabel: string;
  changedSignalCount: number;
  regimeChanged: boolean;
  signalDirection: string;
}) {
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");
  const lensParam = searchParams.get("lens");
  const scenario: ScenarioKey = isScenario(scenarioParam) ? scenarioParam : "baseline";
  const roleLens: RoleLens = isLens(lensParam) ? lensParam : "product";

  const [alerts, setAlerts] = useState<RegimeAlertEvent[]>([]);
  const [preferences, setPreferences] = useState<AlertDeliveryPreferences | null>(null);
  const clientId = useMemo(() => createClientId(), []);

  useEffect(() => {
    const hydrate = async () => {
      const [alertResponse, preferenceResponse] = await Promise.all([
        fetch("/api/regime-alerts", { cache: "no-store" }),
        fetch(`/api/alert-preferences?clientId=${clientId}`, { cache: "no-store" }),
      ]);
      if (alertResponse.ok) setAlerts(((await alertResponse.json()) as { alerts: RegimeAlertEvent[] }).alerts);
      if (preferenceResponse.ok) {
        setPreferences(((await preferenceResponse.json()) as { preferences: AlertDeliveryPreferences }).preferences);
      }
    };
    void hydrate();
  }, [clientId]);

  const setQueryState = (key: "scenario" | "lens", value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const updateChannel = async (channel: AlertChannel, enabled: boolean) => {
    const response = await fetch("/api/alert-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, preferences: { [channel]: enabled } }),
    });
    if (!response.ok) return;
    setPreferences(((await response.json()) as { preferences: AlertDeliveryPreferences }).preferences);
  };

  const scenarioDelta = scenarioAdjustments[scenario];

  return (
    <section className="rounded-2xl border border-sky-400/30 bg-slate-950/60 p-4" aria-label="Live command deck">
      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Live status</p>
          <p className="mt-1 text-sm text-slate-100">Updated {fetchedAtLabel}</p>
          <p className="mt-1 text-sm text-slate-300">{changedSignalCount} signal {changedSignalCount === 1 ? "moved" : "moves"} · Direction: {signalDirection}</p>
          <p className="text-sm text-slate-300">Regime state: {regimeChanged ? "Changed" : "Unchanged"}</p>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Role lens</p>
          <select
            className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            value={roleLens}
            onChange={(event) => setQueryState("lens", event.target.value)}
            aria-label="Role lens selector"
          >
            <option value="product">Product</option><option value="engineering">Engineering</option>
            <option value="finance">Finance</option><option value="executive">Executive</option>
          </select>
          <p className="mt-2 text-sm text-slate-300">{roleLensCopy[roleLens]}</p>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Scenario</p>
          <select
            className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
            value={scenario}
            onChange={(event) => setQueryState("scenario", event.target.value)}
            aria-label="Scenario selector"
          >
            <option value="baseline">Baseline</option><option value="rates-up">Rates +50 bps</option>
            <option value="demand-softening">Demand softening</option><option value="hiring-freeze">Hiring freeze</option>
          </select>
          <p className="mt-2 text-sm text-slate-300">{scenarioDelta.label}</p>
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Scenario impact</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>• Hiring: {scenarioDelta.hiring}</li><li>• Roadmap: {scenarioDelta.roadmap}</li><li>• Spend: {scenarioDelta.spend}</li>
          </ul>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Alert center</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["slack", "email", "webhook"] as AlertChannel[]).map((channel) => (
              <label key={channel} className="inline-flex min-h-[44px] items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={Boolean(preferences?.[channel])} onChange={(event) => void updateChannel(channel, event.target.checked)} />
                {channel}
              </label>
            ))}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {alerts.slice(0, 3).map((alert) => (<li key={alert.id}>• {alert.payload.currentAssessment.regime} · {alert.payload.currentRecordDate}</li>))}
            {alerts.length === 0 ? <li>• No alerts yet. Monitoring active.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}
