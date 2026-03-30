import type { WeeklyDecisionCardViewModel } from "../../lib/report/homeBriefModel";
import type { RegimeKey } from "../../lib/regimeEngine";

export type RegimeCommandBarProps = {
  regime: RegimeKey;
  call: string;
  doNow: string[];
  flipConditions: string[];
  updatedAt: string;
  postureLabel?: string;
  trendLabel?: WeeklyDecisionCardViewModel["status"]["trendLabel"];
  confidenceLabel?: WeeklyDecisionCardViewModel["status"]["confidenceLabel"];
  confidencePercent?: number;
  postureTrajectory?: WeeklyDecisionCardViewModel["diagnostics"]["postureTrajectory"];
  regimeDistance?: WeeklyDecisionCardViewModel["diagnostics"]["regimeDistance"];
};

const regimeStyleByKey: Record<RegimeKey, { label: string; toneClass: string; pointClass: string; markerClass: string }> = {
  SCARCITY: {
    label: "Scarcity",
    toneClass: "border-rose-400/60 bg-rose-500/10 text-rose-100",
    pointClass: "fill-rose-300",
    markerClass: "bg-rose-300",
  },
  DEFENSIVE: {
    label: "Defensive",
    toneClass: "border-amber-300/70 bg-amber-300/10 text-amber-100",
    pointClass: "fill-amber-200",
    markerClass: "bg-amber-200",
  },
  VOLATILE: {
    label: "Volatile",
    toneClass: "border-sky-300/70 bg-sky-300/10 text-sky-100",
    pointClass: "fill-sky-300",
    markerClass: "bg-sky-300",
  },
  EXPANSION: {
    label: "Expansion",
    toneClass: "border-emerald-300/70 bg-emerald-300/10 text-emerald-100",
    pointClass: "fill-emerald-300",
    markerClass: "bg-emerald-300",
  },
};

const confidenceToneClass: Record<NonNullable<RegimeCommandBarProps["confidenceLabel"]>, string> = {
  HIGH: "text-emerald-100",
  MED: "text-amber-100",
  LOW: "text-rose-100",
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const formatSignedDelta = (value: number) => `${value > 0 ? "+" : value < 0 ? "" : ""}${value.toFixed(1)}`;

const buildForecastCone = ({
  currentX,
  currentY,
  nextX,
  nextY,
  coneWidth,
}: {
  currentX: number;
  currentY: number;
  nextX: number;
  nextY: number;
  coneWidth: number;
}) => {
  const dx = nextX - currentX;
  const dy = nextY - currentY;
  const magnitude = Math.hypot(dx, dy) || 1;
  const px = (-dy / magnitude) * coneWidth;
  const py = (dx / magnitude) * coneWidth;

  return `${currentX},${currentY} ${nextX + px},${nextY + py} ${nextX - px},${nextY - py}`;
};

const TrajectoryMap = ({
  regime,
  postureTrajectory,
  regimeDistance,
  trendLabel,
  confidenceLabel,
}: Pick<RegimeCommandBarProps, "regime" | "postureTrajectory" | "regimeDistance" | "trendLabel" | "confidenceLabel">) => {
  if (!postureTrajectory || !regimeDistance || !trendLabel || !confidenceLabel) {
    return null;
  }
  const currentX = clamp(postureTrajectory.current.riskAppetite);
  const currentY = clamp(100 - postureTrajectory.current.tightness);
  const previousX = clamp(postureTrajectory.previous.riskAppetite);
  const previousY = clamp(100 - postureTrajectory.previous.tightness);
  const projectedX = clamp(currentX + postureTrajectory.weeklyDelta.riskAppetite * 1.35);
  const projectedY = clamp(currentY - postureTrajectory.weeklyDelta.tightness * 1.35);
  const coneWidth = confidenceLabel === "LOW" ? 7 : confidenceLabel === "MED" ? 5 : 3.5;
  const riskThresholdX = clamp(postureTrajectory.thresholds.riskAppetite);
  const tightnessThresholdY = clamp(100 - postureTrajectory.thresholds.tightness);
  const regimeStyle = regimeStyleByKey[regime];
  const cone = buildForecastCone({
    currentX,
    currentY,
    nextX: projectedX,
    nextY: projectedY,
    coneWidth,
  });

  return (
    <figure className="rounded-2xl border border-slate-700/70 bg-slate-950/78 p-3">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
          Posture map
        </figcaption>
        <span className="text-[10px] text-slate-400">
          Tail = last week, cone = near-term drift
        </span>
      </div>
      <div className="mt-3 relative h-[13rem] rounded-xl border border-slate-800/80 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.08),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.98))]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Posture map. Tightness ${postureTrajectory.current.tightness.toFixed(1)} and risk appetite ${postureTrajectory.current.riskAppetite.toFixed(1)}. ${regimeDistance.pointsToFlip.toFixed(1)} points from the nearest flip line.`}
        >
          <rect x="0" y="0" width={riskThresholdX} height={tightnessThresholdY} fill="rgba(56,189,248,0.08)" />
          <rect x={riskThresholdX} y="0" width={100 - riskThresholdX} height={tightnessThresholdY} fill="rgba(16,185,129,0.08)" />
          <rect x="0" y={tightnessThresholdY} width={riskThresholdX} height={100 - tightnessThresholdY} fill="rgba(244,63,94,0.08)" />
          <rect x={riskThresholdX} y={tightnessThresholdY} width={100 - riskThresholdX} height={100 - tightnessThresholdY} fill="rgba(245,158,11,0.08)" />
          <line x1={riskThresholdX} y1="0" x2={riskThresholdX} y2="100" stroke="rgba(148,163,184,0.48)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={tightnessThresholdY} x2="100" y2={tightnessThresholdY} stroke="rgba(148,163,184,0.48)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={previousX} y1={previousY} x2={currentX} y2={currentY} stroke="rgba(226,232,240,0.6)" strokeWidth="1.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          <polygon points={cone} fill="rgba(125,211,252,0.18)" stroke="rgba(125,211,252,0.34)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          <circle cx={previousX} cy={previousY} r="2.1" fill="rgba(15,23,42,0.95)" stroke="rgba(226,232,240,0.65)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          <circle cx={currentX} cy={currentY} r="3.1" className={regimeStyle.pointClass} stroke="rgba(15,23,42,0.95)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pointer-events-none absolute inset-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="absolute bottom-2 left-3">Cautious</span>
          <span className="absolute bottom-2 right-3">Bold</span>
          <span className="absolute left-2 top-4 -rotate-90 origin-left">Loose</span>
          <span className="absolute right-2 bottom-7 -rotate-90 origin-right">Tight</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">
          Trend {trendLabel}
        </span>
        <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">
          Tightness {postureTrajectory.current.tightness.toFixed(1)} ({formatSignedDelta(postureTrajectory.weeklyDelta.tightness)})
        </span>
        <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">
          Risk appetite {postureTrajectory.current.riskAppetite.toFixed(1)} ({formatSignedDelta(postureTrajectory.weeklyDelta.riskAppetite)})
        </span>
      </div>
    </figure>
  );
};

const PostureMapSummary = ({
  trendLabel,
  postureTrajectory,
}: {
  trendLabel: string;
  postureTrajectory: NonNullable<RegimeCommandBarProps["postureTrajectory"]>;
}) => (
  <p className="text-xs leading-5 text-slate-200">
    Trend {trendLabel} · Tightness {postureTrajectory.current.tightness.toFixed(1)} vs {postureTrajectory.thresholds.tightness.toFixed(1)} · Risk appetite {postureTrajectory.current.riskAppetite.toFixed(1)} vs {postureTrajectory.thresholds.riskAppetite.toFixed(1)}
  </p>
);

const ThresholdRail = ({
  label,
  current,
  threshold,
  currentColorClass,
}: {
  label: string;
  current: number;
  threshold: number;
  currentColorClass: string;
}) => {
  const thresholdPercent = clamp(threshold);
  const currentPercent = clamp(current);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
        <span className="font-semibold text-slate-100">{label}</span>
        <span className="tabular-nums">{current.toFixed(1)} vs {threshold.toFixed(1)}</span>
      </div>
      <div className="relative h-3 rounded-full border border-slate-800/80 bg-slate-950/80">
        <span
          className="absolute inset-y-0 w-px bg-slate-400/80"
          style={{ left: `${thresholdPercent}%` }}
          aria-hidden="true"
        />
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950/95 ${currentColorClass}`}
          style={{ left: `${currentPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export const RegimeCommandBar = ({
  regime,
  call,
  doNow,
  flipConditions,
  postureLabel,
  trendLabel,
  confidenceLabel,
  confidencePercent,
  postureTrajectory,
  regimeDistance,
}: RegimeCommandBarProps) => {
  const regimeStyle = regimeStyleByKey[regime];
  const resolvedPostureLabel = postureLabel ?? regimeStyle.label;
  const resolvedTrendLabel = trendLabel ?? "Stable";
  const resolvedConfidenceLabel = confidenceLabel ?? "MED";
  const resolvedConfidencePercent = confidencePercent ?? 0;
  const hasTrajectoryView = Boolean(postureTrajectory && regimeDistance && trendLabel && confidenceLabel);

  return (
    <section
      className="weather-command-bar weather-panel-static relative overflow-hidden border border-slate-700/80 bg-slate-950/95 px-3.5 py-3 sm:sticky sm:top-2 sm:z-40 sm:px-4"
      aria-label="Weekly command bar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_45%)]" aria-hidden="true" />
      <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,1fr)_minmax(0,0.88fr)] xl:items-stretch">
        <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-950/72 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-[30px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${regimeStyle.toneClass}`}>
              {regimeStyle.label} outlook
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">Current conditions</p>
            <h2 className="max-w-3xl text-sm font-semibold leading-6 tracking-[0.01em] text-slate-50 sm:text-base">
              {call}
            </h2>
            <p className="text-sm text-slate-300">{resolvedPostureLabel}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
              {regimeDistance ? (
                <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">
                  {regimeDistance.dimensionLabel} {regimeDistance.pointsToFlip.toFixed(1)} pts from flip
                </span>
              ) : null}
              <span className={`rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1 ${confidenceToneClass[resolvedConfidenceLabel]}`}>
                Confidence {resolvedConfidenceLabel} {Math.round(resolvedConfidencePercent)}%
              </span>
            </div>
          </div>
        </div>

        {hasTrajectoryView ? (
          <>
            <div className="sm:hidden rounded-2xl border border-slate-700/70 bg-slate-950/78 p-3">
              <details className="weather-auto-chevron">
                <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Posture map (tap to expand)
                </summary>
                <div className="mt-2">
                  <PostureMapSummary trendLabel={resolvedTrendLabel} postureTrajectory={postureTrajectory} />
                </div>
                <div className="mt-3">
                  <TrajectoryMap
                    regime={regime}
                    postureTrajectory={postureTrajectory}
                    regimeDistance={regimeDistance}
                    trendLabel={resolvedTrendLabel}
                    confidenceLabel={resolvedConfidenceLabel}
                  />
                </div>
              </details>
            </div>
            <div className="hidden sm:block">
              <TrajectoryMap
                regime={regime}
                postureTrajectory={postureTrajectory}
                regimeDistance={regimeDistance}
                trendLabel={resolvedTrendLabel}
                confidenceLabel={resolvedConfidenceLabel}
              />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/78 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Weekly direction</p>
            <p className="mt-2 text-sm text-slate-100">Read the current call as the operating baseline for this cycle.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">Trend {resolvedTrendLabel}</span>
              <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1">{regimeStyle.label}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-slate-700/70 bg-slate-950/78 p-3">
          {postureTrajectory ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Decision runways</p>
              <div className="mt-3 space-y-3">
                <ThresholdRail
                  label="Tightness"
                  current={postureTrajectory.current.tightness}
                  threshold={postureTrajectory.thresholds.tightness}
                  currentColorClass={regimeStyle.markerClass}
                />
                <ThresholdRail
                  label="Risk appetite"
                  current={postureTrajectory.current.riskAppetite}
                  threshold={postureTrajectory.thresholds.riskAppetite}
                  currentColorClass={regimeStyle.markerClass}
                />
              </div>
            </div>
          ) : null}
          <div className="border-t border-slate-800/70 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Do now</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-100">
              {doNow.slice(0, 2).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-300" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-slate-800/70 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Watch next</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-100">
              {flipConditions.slice(0, 2).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-300" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
