import type { describeAnswerStanding } from "../../../lib/report/answerStanding";
import type { RegimeKey } from "../../../lib/types";
import { ConditionIcon, LineStateBadge } from "../../components/ui/conceptIcons";

type AnswerStanding = NonNullable<ReturnType<typeof describeAnswerStanding>>;

/* A stamp, not a pill (ui-ux-standards §XIV): the row's answer for this week is
   a fact, so it takes the sharp tier. An area's standing is the shared state
   badge — the pause glyph and caution ink for a crossed line, the dashed circle
   for one close to it, play and the easing ink for one clear of it — and the
   week's weather word prints with its glyph in the regime ink and the stamp face
   it prints in everywhere else (§XVI, §XVIII). Moved from /resolve with the
   answers it stamps (2026-10-08). */
const STAMP_CLASS = "whitespace-nowrap text-fluid-nano leading-tight";

export const AnswerStandingStamp = ({
  standing,
  regime,
  className,
}: {
  standing: AnswerStanding;
  /** The week's conditions, for the weather glyph beside the word on a climate answer. */
  regime: RegimeKey;
  className: string;
}) => {
  if (standing.kind === "conditions") {
    return (
      /* The stamp names its own regime, so the word takes the regime ink beside
         its glyph; /resources carries no week on its shell, and the word printed
         in the neutral fallback while the glyph printed in the week's hue. */
      <span
        data-answer-standing="conditions"
        data-regime={regime}
        className={`type-stamp inline-flex items-center gap-1 rounded-sm border border-[var(--border-default)] px-1.5 py-0.5 font-semibold text-[color:var(--regime-ink)] ${STAMP_CLASS} ${className}`}
      >
        <ConditionIcon regime={regime} />
        {standing.text}
      </span>
    );
  }
  return (
    <LineStateBadge data-answer-standing={standing.state} state={standing.state} stamp className={`${STAMP_CLASS} ${className}`}>
      {standing.text}
    </LineStateBadge>
  );
};
