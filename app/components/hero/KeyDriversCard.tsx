import Link from "next/link";
import { BarChart2, Shield, Percent } from "lucide-react";
import type { DriverViews, FundingPressureLadderLine } from "../../../lib/report/driverDecisionViews";
import { formatLadderLine, resolveLadderSubject } from "../../../lib/report/driverDecisionViews";

export interface KeyDriversCardProps {
  views: DriverViews;
  className?: string;
}

const DRIVER_LINKS = {
  "funding-pressure": "/signals#tightness",
  "risk-appetite": "/signals#risk-appetite",
  financing: "/signals#base-rate",
} as const;

const formatSignedPoints = (points: number) => {
  const rounded = Math.round(points * 10) / 10;
  const abs = Math.abs(rounded).toFixed(0);
  return `${rounded > 0 ? "↑" : rounded < 0 ? "↓" : "→"} ${abs}`;
};

const formatSignedBps = (bps: number) =>
  `${bps > 0 ? "+" : bps < 0 ? "−" : ""}${Math.abs(bps)} bps`;

/** The rung state chip: crossed lines state the fact, open lines state the distance. */
const LadderRow = ({ line }: { line: FundingPressureLadderLine }) => (
  <li
    className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-[11px] tabular-nums ${
      line.crossed ? "bg-rose-500/10 text-rose-200" : "text-slate-400"
    }`}
  >
    <span className={line.crossed ? "font-semibold" : ""}>{line.action}</span>
    <span className="shrink-0 whitespace-nowrap">
      {formatLadderLine(line)}
    </span>
  </li>
);

/**
 * The brief's three key drivers, each on the clock the decision it governs
 * actually runs on. The views come prebuilt from `lib/report/driverDecisionViews.ts`
 * — this card renders them and invents nothing: no interpolated sparklines, no
 * symmetric threshold markers, and no threshold bar on a series the model gives
 * no breakpoint of its own.
 */
export function KeyDriversCard({ views, className = "" }: KeyDriversCardProps) {
  const { fundingPressure, riskAppetite, financing } = views;
  const ladderSubject = resolveLadderSubject(fundingPressure.ladder);

  return (
    <section
      aria-labelledby="key-drivers-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 id="key-drivers-heading" className="text-sm font-semibold tracking-tight text-white">
            Key drivers
          </h3>
          <span className="text-xs font-medium text-slate-400">
            Each on its own clock
          </span>
        </div>

        <div className="space-y-4">
          {/* Funding pressure: a control variable — action ladder + persistence, not one marker. */}
          <div className="space-y-2">
            <Link
              href={DRIVER_LINKS["funding-pressure"]}
              className="flex items-center gap-2.5 group no-underline min-w-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                <BarChart2 size={15} />
              </div>
              <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                Funding pressure
              </span>
              <span className="ml-auto flex items-baseline gap-1.5 tabular-nums">
                <strong className="text-sm font-semibold text-white">{fundingPressure.current}</strong>
                {fundingPressure.weeklyDelta !== null && fundingPressure.weeklyDelta !== 0 ? (
                  <span className={`text-[11px] font-semibold ${fundingPressure.weeklyDelta > 0 ? "text-rose-300" : "text-teal-300"}`}>
                    {formatSignedPoints(fundingPressure.weeklyDelta)} WoW
                  </span>
                ) : null}
              </span>
            </Link>

            {typeof fundingPressure.beyondBoundaryMonths === "number" && fundingPressure.beyondBoundaryMonths >= 1 ? (
              <p className="text-[11px] font-medium text-amber-300">
                Above the posture boundary for {fundingPressure.beyondBoundaryMonths} month{fundingPressure.beyondBoundaryMonths === 1 ? "" : "s"}
              </p>
            ) : null}

            <ul className="space-y-1" aria-label="Funding pressure action lines">
              {fundingPressure.ladder.map((line) => (
                <LadderRow key={line.value} line={line} />
              ))}
            </ul>

            {ladderSubject ? (
              <p className="text-[11px] text-slate-400">
                {ladderSubject.crossed
                  ? `${ladderSubject.action} — crossed, ${ladderSubject.points} pts beyond.`
                  : `${ladderSubject.action} line at ${ladderSubject.value} — ${ladderSubject.points} pts ahead.`}
              </p>
            ) : null}
          </div>

          {/* Risk appetite: a buffer — remaining cushion and the pace it is consumed at. */}
          <div className="space-y-2 border-t border-white/[0.04] pt-3">
            <Link
              href={DRIVER_LINKS["risk-appetite"]}
              className="flex items-center gap-2.5 group no-underline min-w-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                <Shield size={15} />
              </div>
              <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                Risk appetite
              </span>
              <span className="ml-auto tabular-nums">
                <strong className="text-sm font-semibold text-white">{riskAppetite.current}</strong>
              </span>
            </Link>

            <div className="space-y-1 text-[11px] tabular-nums">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-slate-400">Boundary {riskAppetite.boundaryValue} — posture change</span>
                <span className={riskAppetite.cushionToBoundary <= 4 ? "font-semibold text-amber-300" : "text-slate-200"}>
                  {riskAppetite.cushionToBoundary} pts of cushion
                </span>
              </p>
              {riskAppetite.rulePauseValue !== null && riskAppetite.cushionToRulePause !== null ? (
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400">Pause line {riskAppetite.rulePauseValue} — governed levers</span>
                  <span className="text-slate-200">{riskAppetite.cushionToRulePause} pts</span>
                </p>
              ) : null}
              {riskAppetite.trend && riskAppetite.trend.points !== 0 ? (
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400">Trend</span>
                  <span className={riskAppetite.trend.points < 0 ? "text-amber-300" : "text-teal-300"}>
                    {formatSignedPoints(riskAppetite.trend.points)} over {riskAppetite.trend.windowMonths} months
                  </span>
                </p>
              ) : null}
              {riskAppetite.monthsToBoundaryAtPace !== null ? (
                <p className="text-amber-300">
                  At recent pace, ≈{riskAppetite.monthsToBoundaryAtPace} month{riskAppetite.monthsToBoundaryAtPace === 1 ? "" : "s"} to the boundary
                </p>
              ) : null}
            </div>
          </div>

          {/* Financing: a trend with a horizon — no threshold bar; the model gives
              rates no posture breakpoint of their own, only a contribution anchor. */}
          <div className="space-y-1.5 border-t border-white/[0.04] pt-3">
            <Link
              href={DRIVER_LINKS.financing}
              className="flex items-center gap-2.5 group no-underline min-w-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors">
                <Percent size={15} />
              </div>
              <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                Financing conditions
              </span>
              <span className="ml-auto flex items-baseline gap-1.5 tabular-nums">
                <strong className="text-sm font-semibold text-white">
                  {financing.currentRate !== null ? `${financing.currentRate.toFixed(2)}%` : "—"}
                </strong>
                {financing.change ? (
                  <span className={`text-[11px] font-semibold ${financing.change.bps > 0 ? "text-rose-300" : financing.change.bps < 0 ? "text-teal-300" : "text-slate-400"}`}>
                    {formatSignedBps(financing.change.bps)} / {financing.change.windowMonths}mo
                  </span>
                ) : null}
              </span>
            </Link>

            <div className="space-y-0.5 text-[11px] text-slate-400">
              <p>{financing.rateSourceLabel} — the series the engine reads, not the policy rate.</p>
              {financing.pointsAboveAnchor !== null && financing.contributionOfCeiling !== null ? (
                <p>
                  {financing.pointsAboveAnchor.toFixed(1)} pts above the {financing.anchorRate}% contribution anchor —
                  {" "}{financing.contributionOfCeiling}/{financing.contributionCeiling} of its funding-pressure ceiling (saturates at {financing.saturatingRate}%).
                </p>
              ) : (
                <p>At or below the {financing.anchorRate}% contribution anchor — adding little to funding pressure.</p>
              )}
              <p>{financing.actsThroughLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
