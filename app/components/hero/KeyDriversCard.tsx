import Link from "next/link";
import { BarChart2, Shield, Percent } from "lucide-react";
import type { DriverViews } from "../../../lib/report/driverDecisionViews";

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

const rowLinkClass = "flex items-center gap-2.5 group no-underline min-w-0";
const rowIconClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-teal-400 group-hover:border-teal-500/40 transition-colors";
const rowLabelClass = "text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate";

/**
 * The brief's three key drivers, each on the clock the decision it governs
 * actually runs on: funding pressure with how long it has sat past its line,
 * risk appetite with the pace its cushion is being consumed at, and the short
 * rate as a horizon move. The views come prebuilt from
 * `lib/report/driverDecisionViews.ts`; the card renders them and invents nothing.
 *
 * What the card deliberately does not print any more: the threshold rows
 * (posture boundary, pause line, cushion to each) and the paragraphs explaining
 * how the rate feeds the score. The hero's bounded rails already encode both
 * thresholds for both signals on one axis — one encoding per concept per
 * screen (ui-ux-standards §XV) — and the derivation is /trust's job, not the
 * primary screen's. The view builder still computes those fields for the
 * surfaces that do print them.
 */
export function KeyDriversCard({ views, className = "" }: KeyDriversCardProps) {
  const { fundingPressure, riskAppetite, financing } = views;

  return (
    <section
      aria-labelledby="key-drivers-card-heading"
      className={`weather-brief-card flex flex-col justify-between p-5 sm:p-6 ${className}`}
    >
      <div>
        <h3 id="key-drivers-card-heading" className="mb-4 text-sm font-semibold tracking-tight text-white">
          Key drivers
        </h3>

        <div className="space-y-4">
          {/* Funding pressure: a control variable — how long it has sat past its line. */}
          <div className="space-y-1.5">
            <Link href={DRIVER_LINKS["funding-pressure"]} className={rowLinkClass}>
              <div className={rowIconClass}>
                <BarChart2 size={15} />
              </div>
              <span className={rowLabelClass}>Funding pressure</span>
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
          </div>

          {/* Risk appetite: a buffer — the pace it is being consumed at. */}
          <div className="space-y-1.5 border-t border-white/[0.04] pt-3">
            <Link href={DRIVER_LINKS["risk-appetite"]} className={rowLinkClass}>
              <div className={rowIconClass}>
                <Shield size={15} />
              </div>
              <span className={rowLabelClass}>Risk appetite</span>
              <span className="ml-auto tabular-nums">
                <strong className="text-sm font-semibold text-white">{riskAppetite.current}</strong>
              </span>
            </Link>

            {riskAppetite.trend && riskAppetite.trend.points !== 0 ? (
              <p className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
                <span className="text-slate-400">Trend</span>
                <span className={riskAppetite.trend.points < 0 ? "text-amber-300" : "text-teal-300"}>
                  {formatSignedPoints(riskAppetite.trend.points)} over {riskAppetite.trend.windowMonths} months
                </span>
              </p>
            ) : null}
            {riskAppetite.monthsToBoundaryAtPace !== null ? (
              <p className="text-[11px] text-amber-300 tabular-nums">
                At recent pace, ≈{riskAppetite.monthsToBoundaryAtPace} month{riskAppetite.monthsToBoundaryAtPace === 1 ? "" : "s"} to the boundary
              </p>
            ) : null}
          </div>

          {/* Financing: a trend with a horizon. The model gives rates no posture
              breakpoint of their own, so there is no line to be near. */}
          <div className="border-t border-white/[0.04] pt-3">
            <Link href={DRIVER_LINKS.financing} className={rowLinkClass}>
              <div className={rowIconClass}>
                <Percent size={15} />
              </div>
              <span className={rowLabelClass}>Financing conditions</span>
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
          </div>
        </div>
      </div>
    </section>
  );
}
