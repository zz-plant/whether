import type { AnswerPageData } from "../answerContentSource";
import { describeAreaPauseStatus, type HomeAreaRow } from "./home/homeSectionModel";
import type { LineState } from "./operatingCalls";

/**
 * Where one answer's question stands this week, for the row on `/resolve` that
 * links to it: the answer before the click.
 *
 * The list promised "one yes-or-no answer per open decision" and printed eleven
 * questions, each with a sentence of enduring advice and no word about this
 * week. A decision answer argues one area at length (the first it maps, as
 * `findLeadAnswerForArea` reads it, and the area whose rule the answer page's
 * card prints), so its row carries that area's standing against its pause line,
 * from the same area rows and the same words the homepage's "What are you
 * deciding?" choices print: the two cannot disagree.
 *
 * A climate answer ("Startup funding climate this week") asks what the weather
 * is, so it carries the week's conditions word. An explanation ("How to brief
 * executives…") asks nothing a pause line answers, and carries nothing: every
 * page maps spending among its areas, and stamping "Pause line crossed" on a
 * how-to would be a verdict the page never gives.
 */
export const describeAnswerStanding = ({
  page,
  areaRows,
  conditionsLabel,
}: {
  page: Pick<AnswerPageData, "category" | "mappedDecisionAreas">;
  areaRows: readonly Pick<HomeAreaRow, "area" | "pause">[];
  /** The week's weather word (`getRegimePublicLabel`). */
  conditionsLabel: string;
}): { kind: "area"; text: string; crossed: boolean; state: LineState } | { kind: "conditions"; text: string } | undefined => {
  if (page.category === "climate") return { kind: "conditions", text: conditionsLabel };
  if (page.category !== "decision") return undefined;
  const lead = page.mappedDecisionAreas[0];
  const row = areaRows.find((candidate) => candidate.area === lead);
  const status = row ? describeAreaPauseStatus(row) : undefined;
  return status ? { kind: "area", text: status.text, crossed: status.crossed, state: status.state } : undefined;
};
