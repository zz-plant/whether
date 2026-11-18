import { decisionAreaOrder, type DecisionArea } from "../../../lib/report/boundedDecisionRules";

/*
 * The ink "What changed" gives the area open on the page (2026-11-18). `ChosenAreaScope`
 * sets `data-chosen` around the table; each element names, in these classes, the areas
 * that would quiet it or set it in full ink, so the rows follow the picker with no script
 * of their own. Written out per area because the stylesheet is built from the literal
 * class names in the source: a class assembled at run time would never be generated.
 */
const QUIET: Record<DecisionArea, string> = {
  hiring: "group-data-[chosen=hiring]/chosen:text-slate-400",
  "product-tempo": "group-data-[chosen=product-tempo]/chosen:text-slate-400",
  "capital-raising": "group-data-[chosen=capital-raising]/chosen:text-slate-400",
  "burn-discipline": "group-data-[chosen=burn-discipline]/chosen:text-slate-400",
  "expansion-bets": "group-data-[chosen=expansion-bets]/chosen:text-slate-400",
};

const EMPHASIS: Record<DecisionArea, string> = {
  hiring: "group-data-[chosen=hiring]/chosen:font-semibold group-data-[chosen=hiring]/chosen:text-slate-50",
  "product-tempo": "group-data-[chosen=product-tempo]/chosen:font-semibold group-data-[chosen=product-tempo]/chosen:text-slate-50",
  "capital-raising": "group-data-[chosen=capital-raising]/chosen:font-semibold group-data-[chosen=capital-raising]/chosen:text-slate-50",
  "burn-discipline": "group-data-[chosen=burn-discipline]/chosen:font-semibold group-data-[chosen=burn-discipline]/chosen:text-slate-50",
  "expansion-bets": "group-data-[chosen=expansion-bets]/chosen:font-semibold group-data-[chosen=expansion-bets]/chosen:text-slate-50",
};

/** The lower ink for an element of a row, whenever the open area is one the row does not move. */
export const quietUnlessMoves = (moves: readonly DecisionArea[]): string =>
  decisionAreaOrder.filter((area) => !moves.includes(area)).map((area) => QUIET[area]).join(" ");

/** Full ink and weight for an area's name, while it is the one open. */
export const emphasisWhenChosen = (area: DecisionArea): string => EMPHASIS[area];
