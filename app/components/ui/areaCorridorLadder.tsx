import type { DecisionCorridorModel } from "../../../lib/report/operatingCalls";
import { formatPoints } from "../../../lib/report/home/homeSectionModel";
import { AreaIcon } from "./conceptIcons";

/**
 * 5-Area Decision Corridor Ladder (ui-ux-standards §XV, §XVI).
 * Draws all five operating areas on a single normalized scale (0 = safe/clear, 100 = paused/trouble)
 * with the asymmetric deadband [resumeLine ↔ pauseLine] shaded, the current score plotted,
 * and the distance required to unlock indicated.
 */
export function AreaCorridorLadder({
  model,
  className = "",
}: {
  model: DecisionCorridorModel;
  className?: string;
}) {
  if (model.areas.length === 0) return null;

  /* "Closest" only when one area is closest. Four areas can sit the same distance
     from their restart line — at funding pressure 90 four of the five do — and a
     caption naming one of them claims an order the readings do not support. */
  const closest = model.closestToUnlock;
  const tiedAtClosest = closest
    ? model.areas.filter((area) => area.state === "crossed" && area.distanceToUnlock === closest.distanceToUnlock).length
    : 0;

  return (
    <figure
      data-area-corridor-ladder
      className={`rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-4 space-y-3 ${className}`.trim()}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">How far each area is from changing</span>
        <span className="tabular-nums text-slate-400">
          {model.heldCount === 0
            ? "No area is close to pausing"
            : closest && tiedAtClosest > 1
              ? `${tiedAtClosest} areas ${closest.distanceToUnlock} pts from restarting`
              : closest
                ? `${closest.label} closest to restarting (${closest.distanceToUnlock} pts away)`
                : `${model.heldCount} of 5 areas on hold`}
        </span>
      </figcaption>

      <div className="space-y-2.5">
        {model.areas.map((area) => {
          /* A rule whose restart line is on the other metric has no gap to shade
             on this row's scale; the pause marker and the reading still draw. */
          const hasGap = area.normalizedResume !== undefined;
          /* Mirrored (2026-11-03): the model puts the pause zone at the right of every
             row, and every other scale on the site now puts the easier side there, so
             the restart zone is drawn right and the pause zone left. */
          const mirror = (percent: number) => 100 - percent;
          const resumeAt = area.normalizedResume === undefined ? undefined : mirror(area.normalizedResume);
          const pauseAt = mirror(area.normalizedPause);
          const leftPercent = resumeAt === undefined ? 0 : Math.min(resumeAt, pauseAt);
          const widthPercent = resumeAt === undefined ? 0 : Math.abs(pauseAt - resumeAt);
          const isHeld = area.state === "crossed";
          const isNear = area.state === "near";

          return (
            <div key={area.area} className="space-y-1">
              <div className="flex items-center justify-between text-fluid-nano">
                <a
                  href={`#area-${area.area}`}
                  className="weather-hit inline-flex items-center gap-1.5 font-medium text-slate-300 hover:text-slate-100 hover:underline decoration-slate-600 underline-offset-2"
                >
                  <AreaIcon area={area.area} />
                  <span>{area.label}</span>
                  <span className="text-slate-500">
                    ({area.metric === "tightness" ? "Funding pressure" : "Risk appetite"} {area.currentScore})
                  </span>
                </a>
                <span className="tabular-nums">
                  {isHeld ? (
                    <span className="text-semantic-caution-fg font-medium">
                      {area.distanceToUnlock === undefined
                        ? "On hold"
                        : `On hold · ${area.distanceToUnlock} pts from restarting`}
                    </span>
                  ) : isNear ? (
                    <span className="text-amber-300 font-medium">
                      Close · {formatPoints(area.distanceToPause)} from pausing
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {formatPoints(area.distanceToPause)} from pausing
                    </span>
                  )}
                </span>
              </div>

              {/* Corridor Track */}
              <div className="relative h-2.5 w-full rounded-full bg-[color:var(--bg-raised)] overflow-hidden">
                {/* Safety buffer zone */}
                {hasGap ? (
                  /* Neutral ink, not amber (2026-11-02). Amber resolves to the
                     crossed red, so the gap between the pause and restart lines
                     — the one stretch of the scale where nothing happens — was
                     drawn in the colour of the trouble it exists to delay. */
                  <div
                    className="absolute inset-y-0 border-x border-[color:var(--app-text-muted)]/40 bg-[color:var(--app-text-muted)]/18"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    title={`Safety buffer: ${area.deadbandPoints} pts gap between pause (${area.pauseLine}) and restart (${area.resumeLine})`}
                  />
                ) : null}
                {/* Resume line marker */}
                {hasGap ? (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-semantic-easing-border z-10"
                    style={{ left: `${resumeAt}%` }}
                  />
                ) : null}
                {/* Pause line marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-semantic-caution-border z-10"
                  style={{ left: `${pauseAt}%` }}
                />
                {/* Current reading dot */}
                <div
                  className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                    isHeld
                      ? "border-semantic-caution-fg bg-semantic-caution-fg shadow-sm"
                      : isNear
                        ? "border-amber-400 bg-amber-400"
                        : "border-[var(--bg-panel)] bg-slate-100"
                  }`}
                  style={{ left: `${mirror(Math.min(100, Math.max(0, area.normalizedCurrent)))}%` }}
                  title={`Score: ${area.currentScore} (normalized ${Math.round(area.normalizedCurrent)}%)`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-fluid-nano text-slate-400 border-t border-[color:var(--border-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-semantic-caution-fg" />
          <span>Left: pause zone</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 border border-[color:var(--app-text-muted)]/40 bg-[color:var(--app-text-muted)]/18" />
          <span>Shaded: gap before pausing</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-emerald-400" />
          <span>Right: restart zone</span>
        </span>
      </div>
    </figure>
  );
}
