import type { describeAnswerStanding } from "../../../lib/report/answerStanding";

type AnswerStanding = NonNullable<ReturnType<typeof describeAnswerStanding>>;

/* A stamp, not a pill (ui-ux-standards §XIV): the row's answer for this week is
   a fact, so it takes the sharp tier. Caution ink for a crossed pause line, the
   neutral border for a distance, and the week's weather word in the regime ink
   and the stamp face it prints in everywhere else (§XVI, §XVIII). Moved from
   /resolve with the answers it stamps (2026-10-08). */
const STAMP_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-fluid-nano font-semibold leading-tight tabular-nums";
const STAMP_TONE_CLASS = {
  crossed: "border-semantic-caution-border/60 bg-semantic-caution-bg text-semantic-caution-fg",
  distance: "border-[var(--border-default)] text-slate-300",
  conditions: "type-stamp border-[var(--border-default)] text-[color:var(--regime-ink)]",
} as const;

export const AnswerStandingStamp = ({ standing, className }: { standing: AnswerStanding; className: string }) => {
  const tone = standing.kind === "conditions" ? "conditions" : standing.crossed ? "crossed" : "distance";
  return (
    <span data-answer-standing={tone} className={`${STAMP_CLASS} ${STAMP_TONE_CLASS[tone]} ${className}`}>
      {standing.text}
    </span>
  );
};
