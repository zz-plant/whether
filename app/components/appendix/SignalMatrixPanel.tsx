"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { Tooltip } from "@base-ui/react/tooltip";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { clampToRange } from "../reportSectionUtils";

export const SignalMatrixPanel = ({
  assessment,
  provenance,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
}) => {
  const x = assessment.scores.riskAppetite;
  const y = assessment.scores.tightness;
  const matrixDotX = clampToRange(x, 0, 100);
  const matrixDotY = clampToRange(100 - y, 0, 100);
  const matrixGridId = "matrix-grid";
  const matrixGlowId = "matrix-glow";
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessStatus = assessment.scores.tightness > tightnessThreshold ? "Tight" : "Loose";
  const riskStatus = assessment.scores.riskAppetite > riskThreshold ? "Bold" : "Cautious";
  const quadrantLabel = `${tightnessStatus} + ${riskStatus}`;
  const currentQuadrantId = `${tightnessStatus.toLowerCase()}-${riskStatus.toLowerCase()}`;
  const quadrants = [
    {
      id: "tight-cautious",
      label: "Tight + Cautious",
      description: "Cash conservation, tighter budgets, and slower hiring.",
      action: "Default action: cut burn and freeze risky launches.",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-100",
      chipClassName: "border-rose-300/40 bg-rose-500/20 text-rose-100",
    },
    {
      id: "tight-bold",
      label: "Tight + Bold",
      description: "Selective bets with strong governance and runway checks.",
      action: "Default action: fund only high-ROI bets with short payback.",
      className: "border-amber-400/40 bg-amber-500/10 text-amber-100",
      chipClassName: "border-amber-300/40 bg-amber-500/20 text-amber-100",
    },
    {
      id: "loose-cautious",
      label: "Loose + Cautious",
      description: "Stable funding but risk appetite is muted; prioritize durability.",
      action: "Default action: prioritize reliability and retention projects.",
      className: "border-sky-400/40 bg-sky-500/10 text-sky-100",
      chipClassName: "border-sky-300/40 bg-sky-500/20 text-sky-100",
    },
    {
      id: "loose-bold",
      label: "Loose + Bold",
      description: "Expansion-friendly conditions; scale responsibly.",
      action: "Default action: accelerate growth bets with clear guardrails.",
      className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
      chipClassName: "border-emerald-300/40 bg-emerald-500/20 text-emerald-100",
    },
  ];
  const quadrantBiasById: Record<string, string> = {
    "tight-cautious": "Contraction + caution",
    "tight-bold": "Selective offense under constraint",
    "loose-cautious": "Durability over expansion",
    "loose-bold": "Expansion with controls",
  };
  const failureModeById: Record<string, string> = {
    "tight-cautious": "Overcommitment during fragile credit conditions.",
    "tight-bold": "Assuming risk appetite will absorb execution misses.",
    "loose-cautious": "Over-defensiveness that misses compounding gains.",
    "loose-bold": "Runaway scope and burn ahead of confirmation.",
  };
  const currentQuadrant = quadrants.find((quadrant) => quadrant.id === currentQuadrantId);

  return (
    <section
      id="signal-matrix"
      aria-labelledby="signal-matrix-title"
      aria-describedby="signal-matrix-description"
      className="weather-panel p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="type-label text-slate-400">Signal breakdown</p>
          <h3 id="signal-matrix-title" className="type-section text-slate-100">
            Risk posture matrix
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Scan: where you are, what to do, what to avoid.
          </p>
        </div>
        <div className="w-full max-w-md space-y-2 text-xs font-semibold tracking-[0.12em] text-slate-300 lg:w-auto">
          <span className="block">Cash availability (tightness) vs. market risk appetite</span>
          <DataProvenanceStrip provenance={provenance} variant="compact" />
        </div>
      </div>
      <div className="mt-4 weather-surface border-slate-700/80 bg-gradient-to-br from-slate-900/85 via-slate-950/70 to-slate-900/60 p-4 shadow-none">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">You are here</p>
        <p className="mt-2 text-sm text-slate-100">
          Quadrant: <span className="font-semibold">{quadrantLabel}</span>
        </p>
        <ul className="mt-3 space-y-1 text-xs text-slate-200">
          <li>• Historical bias: {quadrantBiasById[currentQuadrantId]}</li>
          <li>• Failure mode: {failureModeById[currentQuadrantId]}</li>
          <li>
            • Warning:{" "}
            {currentQuadrant?.action.replace("Default action: ", "") ?? "Review actions below."}
          </li>
        </ul>
      </div>
      <Collapsible.Root className="mt-4">
        <Collapsible.Trigger
          type="button"
          className="group flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-slate-900/45 p-3 text-left text-xs font-medium tracking-[0.1em] text-slate-200 transition-colors hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          <span>Decision playbook: matrix positioning and quadrant guidance</span>
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-slate-600/85 bg-slate-950/65 px-3 py-2 text-xs font-medium tracking-[0.1em] text-slate-100">
            <span className="group-data-[panel-open]:hidden">View recommended actions</span>
            <span className="hidden group-data-[panel-open]:inline">Collapse section</span>
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="mt-4 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <figure className="space-y-4">
            <div className="weather-surface border-slate-700/80 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Current posture
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="weather-pill inline-flex min-h-[44px] items-center px-4 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100">
                  {quadrantLabel}
                </span>
                <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs text-slate-300">
                  Tightness <span className="mono text-slate-100">{assessment.scores.tightness}</span>
                  {" "}· Risk <span className="mono text-slate-100">{assessment.scores.riskAppetite}</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Thresholds: tightness {tightnessThreshold}, risk {riskThreshold}. Use these to
                decide when to shift approvals or move between quadrants.
              </p>
            </div>
            <div className="weather-surface relative h-72">
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-labelledby="signal-matrix-visual-title signal-matrix-visual-desc"
              >
                <title id="signal-matrix-visual-title">Signal matrix grid</title>
                <desc id="signal-matrix-visual-desc">
                  A two-by-two matrix showing the balance of tightness and market risk appetite.
                </desc>
                <defs>
                  <pattern
                    id={matrixGridId}
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                    patternTransform="scale(1)"
                  >
                    <path
                      d="M 50 0 H 0 V 50"
                      fill="none"
                      stroke="rgba(30,41,59,0.9)"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </pattern>
                  <filter id={matrixGlowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow
                      dx="0"
                      dy="0"
                      stdDeviation="1.4"
                      floodColor="#fbbf24"
                      floodOpacity="0.28"
                    />
                  </filter>
                </defs>
                <rect width="100" height="100" fill={`url(#${matrixGridId})`} />
                <line
                  x1="50"
                  y1="0"
                  x2="50"
                  y2="100"
                  stroke="rgba(71,85,105,0.6)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="rgba(71,85,105,0.6)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x="50"
                  y="52"
                  textAnchor="middle"
                  fill="rgba(100,116,139,0.55)"
                  fontSize="8"
                  letterSpacing="6"
                >
                  MATRIX
                </text>
                <circle
                  cx={matrixDotX}
                  cy={matrixDotY}
                  r="4"
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  filter={`url(#${matrixGlowId})`}
                />
                <text
                  x={matrixDotX}
                  y={matrixDotY + 1.2}
                  textAnchor="middle"
                  fontSize="6"
                  fontWeight="600"
                  fill="#0f172a"
                  stroke="#0f172a"
                  strokeWidth="0.6"
                  paintOrder="stroke fill"
                >
                  +
                </text>
              </svg>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute bottom-3 left-3 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Cautious
                </div>
                <div className="absolute bottom-3 right-3 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Bold
                </div>
                <div className="absolute left-3 top-3 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Tight
                </div>
                <div className="absolute right-3 top-3 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Loose
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Risk appetite →
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold tracking-[0.12em] text-slate-500">
                  Cash tightness ↑
                </div>
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger
                  type="button"
                  aria-label={`Matrix position. Tightness ${assessment.scores.tightness}, risk appetite ${assessment.scores.riskAppetite}.`}
                  className="absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  style={{ left: `${matrixDotX}%`, top: `${matrixDotY}%` }}
                >
                  <span className="sr-only">Matrix position</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="top" align="center" className="z-20">
                    <Tooltip.Popup className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-lg">
                      Tightness {assessment.scores.tightness} · Risk appetite{" "}
                      {assessment.scores.riskAppetite}
                      <Tooltip.Arrow className="h-2 w-2 rotate-45 border border-slate-700 bg-slate-950" />
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
            <figcaption id="signal-matrix-description" className="text-xs text-slate-500">
              Position is derived from tightness (
              <span className="tabular-nums">{assessment.scores.tightness}</span>) and market risk
              appetite (<span className="tabular-nums">{assessment.scores.riskAppetite}</span>).
              Higher tightness means less cash availability; higher risk appetite means more
              willingness to fund growth.
            </figcaption>
          </figure>
          <div className="space-y-3">
            <div className="weather-surface p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Decision guide
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Use the quadrant actions below to align staffing, budget approvals, and roadmap bets
                with the current macro posture.
              </p>
            </div>
            <div className="grid gap-3">
              {quadrants.map((quadrant) => (
                <div
                  key={quadrant.id}
                  className={`rounded-md border p-4 ${quadrant.className} ${
                    quadrant.id === currentQuadrantId ? "ring-1 ring-slate-100/45" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-[0.12em]">{quadrant.label}</p>
                    {quadrant.id === currentQuadrantId ? (
                      <span
                        className={`rounded-full border px-2 py-1 text-fluid-micro font-semibold tracking-[0.12em] ${quadrant.chipClassName}`}
                      >
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-100">{quadrant.description}</p>
                  <p className="mt-3 text-xs text-slate-200">{quadrant.action}</p>
                </div>
              ))}
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
