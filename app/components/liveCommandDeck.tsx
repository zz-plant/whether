"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientId } from "../operations/components/clientId";
import type { AlertDeliveryPreferences } from "../../lib/serverStore";
import type { AlertChannel, RegimeAlertEvent } from "../../lib/signalOps";

type ScenarioKey = "baseline" | "rates-up" | "demand-softening" | "hiring-freeze";
type RoleLens = "product" | "engineering" | "finance" | "executive";
type HorizonKey = "now" | "week-1" | "week-2" | "week-4";
type RiskMode = "defensive" | "balanced" | "offensive";
type ChangedSignal = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  label: string;
  delta: number;
};

type FlipCondition = {
  title: string;
  description: string;
};

const roleLensCopy: Record<RoleLens, string> = {
  product: "Protect core outcomes and keep launches reversible.",
  engineering: "Bias toward reliability and runtime efficiency before net-new complexity.",
  finance: "Require near-term payback evidence before expanding discretionary spend.",
  executive: "Align posture changes with approval cadence and downside guardrails.",
};

const horizonCopy: Record<HorizonKey, string> = {
  now: "Immediate execution and staffing decisions",
  "week-1": "Near-term sprint and sequencing impacts",
  "week-2": "Budget and hiring checkpoint adjustments",
  "week-4": "Plan refresh with scenario checkpoints",
};

const riskModeCopy: Record<RiskMode, string> = {
  defensive: "Bias to capital preservation and downside risk containment.",
  balanced: "Preserve optionality while funding high-confidence bets.",
  offensive: "Push selective expansion with strict evidence gates.",
};

const flipConditionBySignal: Record<ChangedSignal["key"], FlipCondition> = {
  tightness: {
    title: "Cash availability pressure eases",
    description: "If liquidity tightness cools for two consecutive weekly reads, expansion approvals can reopen.",
  },
  riskAppetite: {
    title: "Risk appetite recovers",
    description: "If risk appetite rises across two reads, roadmap guardrails can shift from defense to selective growth.",
  },
  baseRate: {
    title: "Policy rate pressure fades",
    description: "If base-rate pressure remains stable or lower for two reads, discretionary spend gates can be loosened.",
  },
  curveSlope: {
    title: "Curve steepening sustains",
    description: "If curve slope improves across two reads, longer-cycle product bets can move from hold to staged commit.",
  },
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

const isHorizon = (value: string | null): value is HorizonKey =>
  Boolean(value && value in horizonCopy);

const isRiskMode = (value: string | null): value is RiskMode =>
  Boolean(value && value in riskModeCopy);

const formatRelativeMinutes = (targetIso: string, now: number) => {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return "Updated recently";
  const diffMinutes = Math.max(0, Math.round((now - target) / 60000));
  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes === 1) return "Updated 1 minute ago";
  if (diffMinutes < 60) return `Updated ${diffMinutes} minutes ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return "Updated 1 hour ago";
  return `Updated ${diffHours} hours ago`;
};

export function LiveCommandDeck({
  fetchedAtLabel,
  fetchedAtIso,
  changedSignalCount,
  changedSignals,
  regimeChanged,
  signalDirection,
}: {
  fetchedAtLabel: string;
  fetchedAtIso: string;
  changedSignalCount: number;
  changedSignals: ChangedSignal[];
  regimeChanged: boolean;
  signalDirection: string;
}) {
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");
  const lensParam = searchParams.get("lens");
  const horizonParam = searchParams.get("horizon");
  const riskModeParam = searchParams.get("risk");
  const scenario: ScenarioKey = isScenario(scenarioParam) ? scenarioParam : "baseline";
  const roleLens: RoleLens = isLens(lensParam) ? lensParam : "product";
  const horizon: HorizonKey = isHorizon(horizonParam) ? horizonParam : "now";
  const riskMode: RiskMode = isRiskMode(riskModeParam) ? riskModeParam : "balanced";

  const [alerts, setAlerts] = useState<RegimeAlertEvent[]>([]);
  const [preferences, setPreferences] = useState<AlertDeliveryPreferences | null>(null);
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const clientId = useMemo(() => createClientId(), []);

  const orderedDrivers = useMemo(
    () => [...changedSignals].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    [changedSignals],
  );
  const topDriver = orderedDrivers[0];

  const directionalDrivers = showOnlyChanged ? orderedDrivers : orderedDrivers.slice(0, 2);
  const flipCondition = topDriver ? flipConditionBySignal[topDriver.key] : null;
  const perspectiveSummary = `${roleLensCopy[roleLens]} ${horizonCopy[horizon]} ${riskModeCopy[riskMode]}`;

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

  useEffect(() => {
    const interval = setInterval(() => setClockMs(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const setQueryState = (
    key: "scenario" | "lens" | "horizon" | "risk",
    value: string,
  ) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    const query = next.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
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
      <div className="mb-3 rounded-xl border border-sky-300/40 bg-sky-500/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Since your last review</p>
        <div className="mt-2 grid gap-2 text-sm text-slate-100 md:grid-cols-2 xl:grid-cols-4">
          <p>{formatRelativeMinutes(fetchedAtIso, clockMs)} · {fetchedAtLabel}</p>
          <p>Regime status: {regimeChanged ? "Shift detected" : "No regime shift"}</p>
          <p>Signals moved: {changedSignalCount}</p>
          <p>Top driver: {topDriver ? `${topDriver.label} (${topDriver.delta > 0 ? "+" : ""}${topDriver.delta.toFixed(2)})` : "No directional change"}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Live status</p>
          <p className="mt-1 text-sm text-slate-100">{formatRelativeMinutes(fetchedAtIso, clockMs)}</p>
          <p className="mt-1 text-sm text-slate-300">{changedSignalCount} signal {changedSignalCount === 1 ? "moved" : "moves"} · Direction: {signalDirection}</p>
          <p className="text-sm text-slate-300">Regime state: {regimeChanged ? "Changed" : "Unchanged"}</p>
          <button
            type="button"
            className="mt-2 inline-flex min-h-[44px] touch-manipulation items-center rounded-lg border border-slate-600 px-3 text-sm text-slate-100 transition hover:border-sky-300/80"
            onClick={() => setShowOnlyChanged((current) => !current)}
            aria-pressed={showOnlyChanged}
          >
            {showOnlyChanged ? "Show top drivers" : "Show all changed signals"}
          </button>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {directionalDrivers.map((driver) => (
              <li key={driver.key}>• {driver.label}: {driver.delta > 0 ? "+" : ""}{driver.delta.toFixed(2)}</li>
            ))}
            {directionalDrivers.length === 0 ? <li>• No signal deltas in the selected window.</li> : null}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Role lens</p>
          <select
            className="mt-2 min-h-[44px] w-full touch-manipulation rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
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
            className="mt-2 min-h-[44px] w-full touch-manipulation rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Operating cadence</p>
          <select
            className="mt-2 min-h-[44px] w-full touch-manipulation rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
            value={horizon}
            onChange={(event) => setQueryState("horizon", event.target.value)}
            aria-label="Operating cadence selector"
          >
            <option value="now">Now</option>
            <option value="week-1">+1 week</option>
            <option value="week-2">+2 weeks</option>
            <option value="week-4">+4 weeks</option>
          </select>
          <p className="mt-2 text-sm text-slate-300">{horizonCopy[horizon]}</p>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Risk posture</p>
          <select
            className="mt-2 min-h-[44px] w-full touch-manipulation rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-base text-slate-100 sm:text-sm"
            value={riskMode}
            onChange={(event) => setQueryState("risk", event.target.value)}
            aria-label="Risk posture selector"
          >
            <option value="defensive">Defensive</option>
            <option value="balanced">Balanced</option>
            <option value="offensive">Offensive</option>
          </select>
          <p className="mt-2 text-sm text-slate-300">{riskModeCopy[riskMode]}</p>
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Operating cadence & risk posture</p>
          <p className="mt-2 text-sm text-slate-100">{perspectiveSummary}</p>
          <p className="mt-2 text-xs text-slate-400">
            Active filters: {roleLens}, {horizon.replace("week-", "+")}, {riskMode}, {scenarioDelta.label}.
          </p>
        </article>

        <article className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Automatic reversal trigger</p>
          {flipCondition ? (
            <>
              <p className="mt-2 text-sm font-semibold text-amber-50">{flipCondition.title}</p>
              <p className="mt-1 text-sm text-amber-100/90">{flipCondition.description}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-amber-50">No major signal shifts detected. Keep current posture until a threshold breach appears.</p>
          )}
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Scenario impact (current posture)</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>• Hiring: {scenarioDelta.hiring}</li><li>• Roadmap: {scenarioDelta.roadmap}</li><li>• Spend: {scenarioDelta.spend}</li>
          </ul>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Alert status</p>
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
            {alerts.length === 0 ? <li>• Alert status: no active alerts; monitoring.</li> : null}
          </ul>
        </article>
      </div>
    </section>
  );
}
