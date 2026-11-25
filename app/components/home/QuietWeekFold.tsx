import type { ReactNode } from "react";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import type { AreaRuleRegions } from "../../../lib/report/ruleRegions";
import { ActionLink } from "../ui/actionLink";
import { RuleRegionShapes } from "../ui/ruleRegionShapes";

type QuietWeekRadarPreview = {
  area: string;
  regions: AreaRuleRegions;
  scores: { tightness: number; riskAppetite: number };
  changeLines: { tightness: number; riskAppetite: number };
};

const PAD = 5;
const SIZE = 100;
const VIEW = SIZE + PAD * 2;
const xOf = (riskAppetite: number) => PAD + Math.min(100, Math.max(0, riskAppetite));
const yOf = (tightness: number) => PAD + Math.min(100, Math.max(0, tightness));

/**
 * Miniature 40x40 conditions radar on the closed quiet-week summary row: shows this
 * week's dot against the lead area's pause region and change lines before opening the
 * full reading. Purely decorative (`aria-hidden`), adding zero words or controls.
 */
function QuietWeekMiniRadar({ preview }: { preview: QuietWeekRadarPreview }) {
  const dotX = xOf(preview.scores.riskAppetite);
  const dotY = yOf(preview.scores.tightness);
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      aria-hidden="true"
      focusable="false"
      data-quiet-week-radar={preview.area}
      className="block size-10 shrink-0"
    >
      <rect x={PAD} y={PAD} width={SIZE} height={SIZE} fill="var(--bg-panel)" />
      <RuleRegionShapes
        regions={preview.regions}
        x={xOf}
        y={yOf}
        idPrefix={`quiet-week-radar-${preview.area}`}
        edgeWidth={2.5}
        hatchSpacing={10}
      />
      <line
        x1={xOf(preview.changeLines.riskAppetite)}
        x2={xOf(preview.changeLines.riskAppetite)}
        y1={PAD}
        y2={PAD + SIZE}
        stroke="var(--phase-boundary)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line
        x1={PAD}
        x2={PAD + SIZE}
        y1={yOf(preview.changeLines.tightness)}
        y2={yOf(preview.changeLines.tightness)}
        stroke="var(--phase-boundary)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <rect x={PAD} y={PAD} width={SIZE} height={SIZE} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
      <circle cx={dotX} cy={dotY} r="8" fill="var(--app-text)" stroke="var(--bg-panel)" strokeWidth="3" />
    </svg>
  );
}

/**
 * A quiet week's explanation, folded under one line (2026-11-03).
 *
 * Conditions changed seven times in 177 months, so most Mondays no area moves and
 * nothing is close to moving, and the page still printed every section a changing
 * week needs: what changed, why the conditions are what they are, what would change
 * them, who will ask, how unusual this is. On those weeks the card and the areas
 * are the whole answer, so the sections that explain it fold under "The full
 * reading". They stay server-rendered, so find-in-page, a search engine and a link
 * to any section still reach them (`AnchorFeedback` opens the fold for a hash).
 *
 * The line above the fold is the alert's promise: the email does the watching, so a
 * reader can skip the weeks nothing moves.
 */
export function QuietWeekFold({
  quiet,
  regimeLabel,
  preview,
  children,
}: {
  /** No area moved since the earlier reading, conditions held, and nothing is close to changing. */
  quiet: boolean;
  /** This week's conditions, for the fold's summary. */
  regimeLabel: string;
  /** Optional miniature conditions radar teased on the closed summary row. */
  preview?: QuietWeekRadarPreview | null;
  /** The explanatory sections, printed open on any week that is not quiet. */
  children: ReactNode;
}) {
  if (!quiet) return <>{children}</>;
  const label = `The full reading: what changed, why conditions are ${regimeLabel} and what would change them`;
  return (
    <section data-quiet-week aria-label="The full reading" className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4">
      <p className="text-fluid-sm text-slate-300">
        Nothing is close to changing this week.{" "}
        <ActionLink href={`#${HOME_SECTIONS.alert.id}`} variant="inline">
          Get an email the day an area pauses or restarts
        </ActionLink>
        , and skip the Mondays when nothing moves.
      </p>
      <details className="weather-auto-chevron group" data-quiet-week-fold>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-sm font-semibold text-sky-200 hover:text-slate-100">
          {preview ? (
            <span className="flex min-w-0 items-center gap-3">
              <QuietWeekMiniRadar preview={preview} />
              <span>{label}</span>
            </span>
          ) : (
            label
          )}
        </summary>
        <div className="mt-4 space-y-4 sm:space-y-8">{children}</div>
      </details>
    </section>
  );
}
