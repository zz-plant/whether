import type { ActionStripItem } from "../../lib/report/operatingCalls";
import { buildSharedCorridorRails } from "../../lib/report/operatingCalls";
import { signalReadingMeaning } from "../../lib/report/signalTranslations";
import { ScoreLadder, type LadderLine } from "./ui/scoreLadder";

/**
 * The one set of lines every area shares, drawn once: a ladder per composite
 * signal with the reading, the pause line and the resume line. The label
 * carries the reading's meaning ("money is hard to raise") because a bare
 * number out of 100 does not say which end is bad. Every bounded rule is a
 * pair of these lines, so this is the graphic a rules table refers back to
 * rather than something each row redraws.
 *
 * Drawn with `ScoreLadder`, the ladder /signals and /trust draw the same lines
 * with. This page used its own SVG rail, which set "Pause if" and "Resume when"
 * above the track in type larger than the page's body copy and ran risk
 * appetite from 100 down to 0 — so the plan, the evidence and the trust page
 * drew one fact three ways (ui-ux-standards §XV: one encoding per concept).
 */
export function BoundedCorridorRails({
  items,
  scores,
}: {
  items: readonly Pick<ActionStripItem, "pauseConditions" | "resumeConditions">[];
  scores?: { tightness: number; riskAppetite: number };
}) {
  const rails = buildSharedCorridorRails(items, scores);
  if (rails.length === 0) return null;

  return (
    <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2" aria-label="Where this week's readings sit against the pause and resume lines">
      {rails.map((rail) => {
        const lines: LadderLine[] = [
          { kind: "pause", value: rail.guardrail },
          ...(typeof rail.clearsAt === "number" ? [{ kind: "resume" as const, value: rail.clearsAt }] : []),
        ];
        return (
          <li key={rail.metric} className="min-w-0">
            <ScoreLadder
              label={
                <>
                  {rail.label}
                  <span className="font-normal text-slate-400">: {signalReadingMeaning(rail.metric, rail.current)}</span>
                </>
              }
              value={rail.current}
              lines={lines}
            />
          </li>
        );
      })}
    </ul>
  );
}
