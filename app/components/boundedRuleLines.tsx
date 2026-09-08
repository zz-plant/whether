import type { RuleCondition } from "../../lib/report/boundedDecisionRules";
import { formatPointsToLine, type RuleThresholdDistance } from "../../lib/report/operatingCalls";

/**
 * One side of a bounded rule as its numeric lines, with the distance to the
 * nearest one. The sentence prints only for a rule that carries no line, so a
 * table of rules reads as numbers and never as five paraphrases of one corridor.
 */
export const RuleLines = ({
  conditions,
  fallback,
  nearest,
  kind,
}: {
  conditions: readonly RuleCondition[];
  fallback: string;
  nearest?: RuleThresholdDistance;
  kind: "pause" | "resume";
}) => {
  if (conditions.length === 0) {
    return <span className="text-slate-300">{fallback}</span>;
  }
  return (
    <span className="flex flex-col gap-0.5">
      {conditions.map((condition) => {
        const isNearest = nearest && nearest.metric === condition.metric && nearest.value === condition.value;
        return (
          <span key={`${condition.metric}-${condition.operator}-${condition.value}`} className="tabular-nums">
            <span className={kind === "pause" ? "text-amber-100" : "text-sky-100"}>{condition.label}</span>
            {isNearest ? (
              <span
                className={`ml-1.5 ${
                  nearest.satisfied
                    ? kind === "pause"
                      ? "text-semantic-caution-fg"
                      : "text-semantic-easing-fg"
                    : "text-slate-500"
                }`}
              >
                {formatPointsToLine(nearest.pointsToLine, kind)}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
};
