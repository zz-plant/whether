import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../../components/pageShell";
import { AreaIcon, ConditionIcon } from "../../components/ui/conceptIcons";
import { DefinedTerm } from "../../components/ui/definedTerm";
import { loadHomePageAssembly } from "../../../lib/report/homePageAssemblyLoader";
import { buildHomeAreaRows } from "../../../lib/report/home/homeSectionModel";
import { buildForecastView, type ForecastImpact, type ForecastTile, type ImpactLevel } from "../../../lib/report/home/forecastView";
import { previousScoresFromDynamics } from "../../../lib/export/scoreReference";
import { buildTrustStripProps } from "../../../lib/report/evidenceReaderModel";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";

export const metadata: Metadata = {
  title: "Mockup — The brief as a forecast",
  description: "Concept: this week's reading laid out the way a weather forecast is.",
  robots: { index: false, follow: false },
};

/*
 * A concept (2026-11-03): the weekly brief laid out the way weather services reach
 * readers without meteorology. Impact first (what it means for you), then time (what
 * happens next), confidence (how sure), and an anchor (what it is like); the method is
 * the forecaster's discussion, one link away. Every value is this week's reading through
 * `buildForecastView`, not typed in; the layout is what is being tried.
 */
const LEVEL_STYLE: Record<ImpactLevel, { ink: string; edge: string; word: string }> = {
  warning: { ink: "text-semantic-caution-fg", edge: "border-l-semantic-caution-border", word: "Warning" },
  watch: { ink: "text-amber-300", edge: "border-l-amber-400", word: "Watch" },
  clear: { ink: "text-semantic-easing-fg", edge: "border-l-semantic-easing-border", word: "Clear" },
};

function ImpactCard({ impact }: { impact: ForecastImpact }) {
  const style = LEVEL_STYLE[impact.level];
  return (
    <li className={`rounded-lg border border-[color:var(--border-subtle)] border-l-4 ${style.edge} bg-[color:var(--bg-panel)] px-4 py-3`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-base font-semibold ${style.ink}`}>
          {impact.status}: {impact.areas.map((entry) => entry.label).join(", ")}
        </p>
        <span className={`shrink-0 text-xs font-semibold uppercase tracking-wider ${style.ink}`}>{style.word}</span>
      </div>
      {impact.condition ? <p className="mt-0.5 text-sm text-slate-300">{impact.condition}</p> : null}
      <ul className="mt-2 space-y-1.5">
        {impact.areas.map((entry) => (
          <li key={entry.area} className="flex gap-2 text-sm text-slate-300">
            <AreaIcon area={entry.area} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-medium text-slate-100">{entry.label}.</span> {entry.rule}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

/* Funding pressure is drawn rising downward, as on every chart since "easier is up and right". */
function Sparkline({ tile }: { tile: ForecastTile }) {
  if (tile.history.length < 2) return null;
  const width = 160;
  const height = 36;
  const y = (value: number) => (tile.metric === "tightness" ? (value / 100) * height : height - (value / 100) * height);
  const points = tile.history.map((value, index) => `${(index / (tile.history.length - 1)) * width},${y(value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-40" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300" />
    </svg>
  );
}

function ScoreTile({ tile }: { tile: ForecastTile }) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-panel)] p-4">
      <p className="text-xs font-medium text-slate-400">
        <DefinedTerm term={tile.metric === "tightness" ? "tightness" : "risk-appetite"}>{tile.label}</DefinedTerm>
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-50">{tile.value}</p>
      <p className="text-sm font-medium text-slate-200">{tile.side}</p>
      {tile.normal ? <p className="text-xs text-slate-400">{tile.normal[0]?.toUpperCase()}{tile.normal.slice(1)}</p> : null}
      <div className="mt-2">
        <Sparkline tile={tile} />
        <p className="text-fluid-nano text-slate-500">Last 24 months · up is easier</p>
      </div>
    </div>
  );
}

export default async function ForecastMockupPage() {
  const { homepage, reportData } = await loadHomePageAssembly();
  const card = homepage.weeklyDecisionCardModel;
  const { tightness, riskAppetite } = card.diagnostics.currentScores;
  const dynamics = card.decision.reportDynamics;
  const previous = previousScoresFromDynamics(dynamics, {
    tightness: reportData.assessment.scores.tightness,
    riskAppetite: reportData.assessment.scores.riskAppetite,
  });
  const comparedOn = dynamics.comparedWith?.recordDate;
  const weeksSincePrevious = comparedOn
    ? (new Date(reportData.treasury.record_date).getTime() - new Date(comparedOn).getTime()) / (7 * 24 * 60 * 60 * 1000)
    : 1;
  const rows = buildHomeAreaRows({
    actionStripItems: card.decision.actionStripItems,
    decisionRules: card.decision.decisionRules ?? [],
    movement: card.decision.decisionMovement,
    scores: { tightness, riskAppetite },
  });
  const trust = buildTrustStripProps({
    recordDateLabel: homepage.reportShell.recordDateLabel,
    isFallback: homepage.reportShell.showOfflineBadge,
    confidenceLabel: card.status.confidenceLabel ?? "HIGH",
    assessment: reportData.assessment,
    scoringBasis: reportData.scoringBasis,
  });
  const regime = reportData.assessment.regime;
  const view = buildForecastView({
    rows,
    regime,
    tightness,
    riskAppetite,
    previous: previous ? { tightness: previous.tightness, riskAppetite: previous.riskAppetite } : null,
    weeksSincePrevious,
    thresholds: reportData.assessment.thresholds,
    series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
    baseRate: trust.baseRate ?? null,
  });

  return (
    <PageShell regime={regime}>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <p className="rounded-md border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-400">
          Concept, not the product: this week&rsquo;s reading ({homepage.reportShell.recordDateLabel}) laid out the way a
          weather forecast is. <Link href="/" className="underline underline-offset-4">The brief as it ships</Link>
        </p>

        {/* 1. What it means for you: impact levels, the way a warning service leads. */}
        <section aria-labelledby="impact-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="impact-heading" className="text-2xl font-bold text-slate-50">What it means for you this week</h1>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ConditionIcon regime={regime} />
              {getRegimePublicLabel(regime)}
            </span>
          </div>
          <ul className="grid gap-3 lg:grid-cols-[2fr_1fr]">
            {view.impacts.map((impact) => (
              <ImpactCard key={`${impact.level}-${impact.condition ?? ""}`} impact={impact} />
            ))}
          </ul>
        </section>

        {/* 2. What happens next: the next-change sentence and the strip. */}
        <section aria-labelledby="next-heading" className="space-y-3">
          <h2 id="next-heading" className="text-lg font-semibold text-slate-100">What happens next</h2>
          <p className="text-base text-slate-200">{view.next}</p>
          <ol className="grid grid-cols-3 gap-2">
            {view.periods.map((period) => (
              <li key={period.label} className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-3 text-center">
                <p className="text-xs font-medium text-slate-400">{period.label}</p>
                <p className="mt-2 flex justify-center">{period.regime ? <ConditionIcon regime={period.regime} size="card" /> : null}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{period.conditions}</p>
                <p className="mt-1 text-fluid-nano text-slate-500">{period.basis}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. How sure: the record's count, said the way a chance of rain is. */}
        {view.likelihood ? (
          <section aria-labelledby="sure-heading" className="space-y-1">
            <h2 id="sure-heading" className="text-lg font-semibold text-slate-100">How sure we are</h2>
            <p className="text-base text-slate-200">{view.likelihood}</p>
            <p className="text-xs text-slate-400">
              A count from the record, not a probability. <Link href="/calibration" className="underline underline-offset-4">How often it held</Link>
            </p>
          </section>
        ) : null}

        {/* 4. What it is like: the analog month and each score against normal. */}
        <section aria-labelledby="like-heading" className="space-y-3">
          <h2 id="like-heading" className="text-lg font-semibold text-slate-100">What it&rsquo;s like</h2>
          {view.analog ? <p className="text-base text-slate-200">{view.analog}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {view.tiles.map((tile) => (
              <ScoreTile key={tile.metric} tile={tile} />
            ))}
          </div>
        </section>

        <p className="text-sm text-slate-400">
          <Link href="/#why-conditions" className="underline underline-offset-4">The forecaster&rsquo;s discussion</Link>
          : why conditions are what they are, what moved, and the method.
        </p>
      </div>
    </PageShell>
  );
}
