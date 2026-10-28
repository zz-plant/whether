import { Fragment } from "react";
import { areasGovernedBy, decisionAreaLabel, type RuleConditionMetric } from "../../../lib/report/boundedDecisionRules";
import { HOME_DECISION_PARAM, HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import { AreaIcon } from "./conceptIcons";

/**
 * "Governs: Hiring, Fundraising, Spending" under a score: the areas whose lines
 * the score sets, each a link with its area glyph. The homepage and `/signals`
 * printed this from two hand-written lists (and `/signals` printed "Sets the
 * pause and resume lines" instead); both read `areasGovernedBy` now, the same
 * table the area rows name their score from.
 *
 * `target` says where a link lands: "table" is the area's row on this page
 * (the brief's folded table), "brief" opens the brief on that area's answer.
 */
export function GovernedAreas({
  metric,
  target,
  className = "",
}: {
  metric: RuleConditionMetric;
  target: "table" | "brief";
  className?: string;
}) {
  const areas = areasGovernedBy(metric);
  return (
    <span className={`block text-fluid-nano font-normal text-slate-400 ${className}`.trim()} data-governs={metric}>
      Affects:{" "}
      {areas.map((area, index) => (
        <Fragment key={area}>
          <a
            href={target === "table" ? `#area-${area}` : `/?${HOME_DECISION_PARAM}=${area}#${HOME_SECTIONS.areas.id}`}
            className="weather-hit inline-flex items-center gap-1 align-middle underline decoration-slate-600 underline-offset-2 hover:text-sky-300"
          >
            <AreaIcon area={area} />
            {decisionAreaLabel(area)}
          </a>
          {index < areas.length - 1 ? ", " : null}
        </Fragment>
      ))}
    </span>
  );
}
