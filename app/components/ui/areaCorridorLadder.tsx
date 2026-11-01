import type { DecisionCorridorModel } from "../../../lib/report/operatingCalls";
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

  return (
    <figure
      data-area-corridor-ladder
      className={`rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-4 space-y-3 ${className}`.trim()}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">Decision corridor & unlocking order</span>
        <span className="tabular-nums text-slate-400">
          {model.heldCount === 0
            ? "All 5 areas clear of pause lines"
            : model.closestToUnlock
              ? `${model.closestToUnlock.label} closest to unlocking (${model.closestToUnlock.distanceToUnlock} pts away)`
              : `${model.heldCount} of 5 areas on hold`}
        </span>
      </figcaption>

      <div className="space-y-2.5">
        {model.areas.map((area) => {
          const leftPercent = Math.min(area.normalizedResume, area.normalizedPause);
          const widthPercent = Math.abs(area.normalizedPause - area.normalizedResume);
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
                      On hold · {area.distanceToUnlock} pts to unlock
                    </span>
                  ) : isNear ? (
                    <span className="text-amber-300 font-medium">Near pause line</span>
                  ) : (
                    <span className="text-slate-400">Clear</span>
                  )}
                </span>
              </div>

              {/* Corridor Track */}
              <div className="relative h-2.5 w-full rounded-full bg-[color:var(--bg-raised)] overflow-hidden">
                {/* Safety buffer zone */}
                <div
                  className="absolute inset-y-0 bg-amber-400/20 border-x border-amber-400/40"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  title={`Safety buffer: ${area.deadbandPoints} pts gap between pause (${area.pauseLine}) and restart (${area.resumeLine})`}
                />
                {/* Resume line marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-semantic-easing-border z-10"
                  style={{ left: `${area.normalizedResume}%` }}
                />
                {/* Pause line marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-semantic-caution-border z-10"
                  style={{ left: `${area.normalizedPause}%` }}
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
                  style={{ left: `${Math.min(100, Math.max(0, area.normalizedCurrent))}%` }}
                  title={`Score: ${area.currentScore} (normalized ${Math.round(area.normalizedCurrent)}%)`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-fluid-nano text-slate-400 border-t border-[color:var(--border-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-emerald-400" />
          <span>Left: Safe / Restart zone</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-amber-400/20 border border-amber-400/40" />
          <span>Shaded: Safety buffer</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-semantic-caution-fg" />
          <span>Right: Paused zone</span>
        </span>
      </div>
    </figure>
  );
}
