import type { ReactNode } from "react";
import Link from "next/link";
import type { ReportDynamics } from "../../lib/report/reportData";
import type { BoundedDecisionRule } from "../../lib/report/boundedDecisionRules";
import { decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { buildWeeklyCitationMetaLine, buildWeeklyTrustCueLine } from "../../lib/report/trustStatus";

type WhyThisCallItem = {
  label: string;
  detail: string;
};

type MemoryRailItem = {
  label: string;
  posture: string;
};

type PrimaryDriverItem = {
  label: string;
  detail: string;
};

type MacroOverlayItem = {
  label: string;
  detail: string;
};

type WeeklyDecisionCardProps = {
  statusLabel: string;
  postureDelta: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  confidencePercent: number;
  trendLabel: "Improving" | "Deteriorating" | "Mixed" | "Stable";
  transitionWatch: "ON" | "OFF";
  netConstraintSummary: string;
  guardrail: string;
  reversalTrigger: string;
  recordDateLabel: string;
  fetchedAtLabel: string;
  reportDynamics: ReportDynamics;
  decisionShiftSummary: string;
  decisionRules: BoundedDecisionRule[];
  revisitDecisions: boolean;
  memoryRail: MemoryRailItem[];
  historicalTimeline: Array<{ label: string; posture: string }>;
  macroOverlay: MacroOverlayItem[];
  whyThisCall: WhyThisCallItem[];
  primaryDrivers: PrimaryDriverItem[];
  startupClimateIndex: {
    score: number;
    status: "Improving" | "Stable" | "Deteriorating" | "Mixed";
    breakdown: Array<{ label: string; score: number }>;
  };
  citation: string;
  actions?: ReactNode;
};

const deltaLabel: Record<ReportDynamics["changedSignals"][number]["key"], string> = {
  tightness: "Capital tightness",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Yield curve slope",
};

const directionHint = (delta: number) => (delta > 0 ? "tightening" : delta < 0 ? "easing" : "unchanged");

const signalDeltaTone: Record<"tightening" | "easing" | "unchanged", string> = {
  tightening: "border-semantic-tightening-border/70 bg-semantic-tightening-bg/70 text-semantic-tightening-fg",
  easing: "border-semantic-easing-border/70 bg-semantic-easing-bg/70 text-semantic-easing-fg",
  unchanged: "border-semantic-unchanged-border/70 bg-semantic-unchanged-bg/70 text-semantic-unchanged-fg",
};

const sectionSpacing = "space-y-3";
const primaryHeading = "text-sm font-semibold uppercase tracking-[0.14em] text-slate-100";
const secondaryHeading = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-300";
const primaryPanel = "rounded-xl border border-slate-600/80 bg-slate-900/70 p-4";
const secondaryPanel = "rounded-xl border border-slate-700/70 bg-slate-900/50 p-4";
const supportingPanel = "rounded-xl border border-slate-800/70 bg-slate-900/35 p-4";

export function WeeklyDecisionCard({
  statusLabel,
  postureDelta,
  confidenceLabel,
  confidencePercent,
  trendLabel,
  transitionWatch,
  netConstraintSummary,
  guardrail,
  reversalTrigger,
  recordDateLabel,
  fetchedAtLabel,
  reportDynamics,
  decisionShiftSummary,
  decisionRules,
  revisitDecisions,
  memoryRail,
  historicalTimeline,
  macroOverlay,
  whyThisCall,
  primaryDrivers,
  startupClimateIndex,
  citation,
  actions,
}: WeeklyDecisionCardProps) {
  const freshnessLabel = fetchedAtLabel.trim().length > 0 ? fetchedAtLabel : "Unavailable";
  const trustCueLine = buildWeeklyTrustCueLine({
    confidenceLabel,
    freshnessLabel,
    transitionWatch,
  });
  const citationMetaLine = buildWeeklyCitationMetaLine({
    statusLabel,
    confidenceLabel,
    recordDateLabel,
    freshnessLabel,
  });
  const meetingShorthand = revisitDecisions
    ? "Do now: revise hiring and roadmap decisions this week. Flip: return to hold mode if next read is stable."
    : "Do now: hold hiring and roadmap decisions from last week. Flip: revise if next read shows material deterioration.";
  const topDecisionRules = decisionRules.slice(0, 4);
  const immediateDecision = revisitDecisions
    ? "Revise hiring and roadmap calls now."
    : "Keep last week's calls in place.";

  return (
    <section className="weather-panel space-y-5 px-5 py-6 sm:space-y-6 sm:px-7 sm:py-8" aria-labelledby="weekly-posture-brief-title">
      <header className="space-y-3 border-b border-slate-600/70 pb-5" data-testid="weekly-top-fold">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Weekly posture call</p>
        <h1 id="weekly-posture-brief-title" className="text-3xl font-semibold text-slate-50 sm:text-4xl">{statusLabel}</h1>
        <p className="text-sm text-slate-300">{netConstraintSummary}</p>
        <p className="text-sm font-semibold text-slate-100">{meetingShorthand}</p>

        <article className={`${primaryPanel} ${sectionSpacing} border-sky-400/50`} aria-label="In 15 seconds">
          <h2 className={primaryHeading}>In 15 seconds</h2>
          <ul className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4" aria-label="Weekly decision summary">
            <li className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-3">
              <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">What changed</p>
              <p className="mt-1 text-slate-200">{postureDelta}</p>
            </li>
            <li className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-3">
              <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">What to do now</p>
              <p className="mt-1 text-slate-200">{immediateDecision}</p>
            </li>
            <li className="rounded-lg border border-amber-500/50 bg-slate-950/60 px-3 py-3">
              <p className="font-semibold uppercase tracking-[0.12em] text-amber-200">Primary guardrail</p>
              <p className="mt-1 text-slate-200">{guardrail}</p>
            </li>
            <li className="rounded-lg border border-sky-500/50 bg-slate-950/60 px-3 py-3">
              <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">Flip trigger</p>
              <p className="mt-1 text-slate-200">{reversalTrigger}</p>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2" aria-label="Weekly trust signals">
            <span className="inline-flex min-h-11 items-center rounded-full border border-slate-600/80 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">Confidence {confidencePercent}% ({confidenceLabel})</span>
            <span className="inline-flex min-h-11 items-center rounded-full border border-slate-600/80 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">Trend {trendLabel}</span>
            <span className="inline-flex min-h-11 items-center rounded-full border border-slate-600/80 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">Freshness {freshnessLabel}</span>
            <span className="inline-flex min-h-11 items-center rounded-full border border-slate-600/80 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">Shift watch {transitionWatch}</span>
          </div>
          <p className="text-xs text-slate-300">{trustCueLine}</p>
        </article>
      </header>

      <article className={`${primaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>Decision delta this week</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Change this week</p>
            <p className="mt-1 text-xs text-slate-200">{decisionShiftSummary}</p>
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">What to do now</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{immediateDecision}</p>
            <p className="mt-1 text-xs text-slate-300">What changed: {postureDelta}</p>
          </div>
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/60 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Flip trigger</p>
            <p className="mt-1 text-xs text-slate-200">{reversalTrigger}</p>
          </div>
        </div>
        {reportDynamics.changedSignals.length === 0 ? (
          <p className="rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">No material signal deltas this week.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reportDynamics.changedSignals.slice(0, 3).map((signal) => {
              const deltaDirection = directionHint(signal.delta);
              return (
                <span
                  key={signal.key}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${signalDeltaTone[deltaDirection]}`}
                >
                  {deltaLabel[signal.key]}: {signal.delta > 0 ? "↑" : signal.delta < 0 ? "↓" : "→"} {deltaDirection}
                </span>
              );
            })}
          </div>
        )}
      </article>

      <article className={`${secondaryPanel} ${sectionSpacing}`}>
        <h2 className={primaryHeading}>Decision matrix this week</h2>
        <p className="text-xs text-slate-300">Canonical weekly call: action, threshold, and reversal in one table.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-xs text-slate-200" aria-label="Weekly decision matrix">
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-[0.12em] text-slate-300">Area</th>
                <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-[0.12em] text-slate-300">Action now</th>
                <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-[0.12em] text-slate-300">Scope</th>
                <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-[0.12em] text-semantic-caution-fg">Stop if</th>
                <th scope="col" className="px-2 py-1 text-left font-semibold uppercase tracking-[0.12em] text-semantic-reversal-fg">Restart when</th>
              </tr>
            </thead>
            <tbody>
              {topDecisionRules.map((rule) => (
                <tr key={rule.area} className="rounded-lg border border-slate-700/60 bg-slate-950/60 align-top">
                  <th scope="row" className="px-2 py-2 text-left font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</th>
                  <td className="px-2 py-2 text-slate-200">{rule.recommendation}</td>
                  <td className="px-2 py-2 text-slate-300">{rule.scope}</td>
                  <td className="px-2 py-2 text-semantic-caution-fg">{rule.pauseTrigger}</td>
                  <td className="px-2 py-2 text-semantic-reversal-fg">{rule.resumeTrigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className={`${secondaryPanel} ${sectionSpacing}`} aria-label="Bounded rule cards">
        <h2 className={secondaryHeading}>Bounded rule cards (quick scan)</h2>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topDecisionRules.map((rule) => (
            <li key={rule.area} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{decisionAreaLabel(rule.area)}</p>
              <p className="mt-1 text-xs text-slate-300"><span className="font-semibold text-slate-100">Action:</span> {rule.recommendation}</p>
              <p className="mt-1 text-xs text-semantic-caution-fg"><span className="font-semibold text-slate-100">Stop if:</span> {rule.pauseTrigger}</p>
              <p className="mt-1 text-xs text-semantic-reversal-fg"><span className="font-semibold text-slate-100">Restart when:</span> {rule.resumeTrigger}</p>
            </li>
          ))}
        </ul>
      </article>

      <details className={`${supportingPanel} ${sectionSpacing}`}>
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">More context (why this call + timeline)</summary>
        <div className="space-y-4 pt-2">
          <article className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-3">
            <h2 className={secondaryHeading}>Startup Climate Index</h2>
            <p className="mt-1 text-xs text-slate-300">Score {startupClimateIndex.score} / 100 · {startupClimateIndex.status}</p>
            <ul className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
              {startupClimateIndex.breakdown.map((item) => (
                <li key={item.label}>{item.label}: {item.score}</li>
              ))}
            </ul>
          </article>

          <article className="space-y-2">
            <h2 className={secondaryHeading}>Primary drivers this week</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {primaryDrivers.map((driver) => (
                <li key={driver.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                  <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">{driver.label}</p>
                  <p className="mt-1 text-slate-300">{driver.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-2">
            <h2 className={secondaryHeading}>Why this posture call</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {whyThisCall.map((reason) => (
                <li key={reason.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                  <p className="font-semibold uppercase tracking-[0.12em] text-sky-200">{reason.label}</p>
                  <p className="mt-1 text-slate-300">{reason.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="space-y-3">
            <h2 className={secondaryHeading}>Historical context + market overlay</h2>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Historical memory rail</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {memoryRail.map((item) => (
                  <li key={`${item.label}-${item.posture}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-200">
                    <p className="text-slate-400">{item.label}</p>
                    <p className="mt-1 font-semibold text-slate-100">{item.posture}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Historical timeline</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {historicalTimeline.map((item) => (
                  <li key={`${item.label}-${item.posture}`} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-2 py-2 text-xs text-slate-200">
                    <p className="text-slate-400">{item.label}</p>
                    <p className="font-semibold text-slate-100">{item.posture}</p>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              {macroOverlay.map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3">
                  <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">{item.label}</p>
                  <p className="mt-1 text-slate-300">{item.detail}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </details>

      <article className={`${supportingPanel} ${sectionSpacing}`}>
        <h2 className={secondaryHeading}>Cite this call</h2>
        <p className="mt-2 text-xs text-slate-300">{citationMetaLine}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-300">{citation}</pre>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
          <div>
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-100">Team fit check</p>
            <p className="mt-1">Compare this macro call with your team context before locking irreversible moves.</p>
          </div>
          <Link href="/decide/team-context" className="inline-flex min-h-[44px] items-center rounded-md border border-sky-400/60 px-3 py-2 font-semibold text-sky-200 hover:bg-sky-500/10">
            Run risk check
          </Link>
        </div>
        <div className="mt-3">{actions}</div>
      </article>
    </section>
  );
}
