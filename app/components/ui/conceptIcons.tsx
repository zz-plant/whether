import type { HTMLAttributes, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { REGIME_ICONS, REGIME_LABELS } from "../../../lib/regimePresentation";
import { DECISION_AREA_ICONS, decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { LINE_STATE_ICONS, type LineState } from "../../../lib/report/operatingCalls";
import type { RegimeKey } from "../../../lib/types";
import { cn } from "../../../lib/utils";
import { ICON_STROKE_WIDTH } from "../uiIcons";

/**
 * The three concepts that carry a glyph: the four conditions, the five areas,
 * and where an area stands against its pause line. One component per concept,
 * each reading the one mapping that concept has — `REGIME_ICONS`
 * (lib/regimePresentation.ts), `DECISION_AREA_ICONS` (the area metadata in
 * lib/report/boundedDecisionRules.ts) and `LINE_STATE_ICONS`
 * (lib/report/operatingCalls.ts) — so a page cannot pick its own sun.
 *
 * The rules every caller inherits:
 * - A glyph sits beside its words and never replaces them. Each is
 *   `aria-hidden`; the words carry the meaning for a screen reader.
 * - One size scale: 16px inline, 20px on a card. A caller drawing inside a
 *   scaled SVG passes `width` and `height` in that drawing's units instead.
 * - Colour from the tokens the words already use: a condition in its regime
 *   ink (`data-regime` resolves `--regime-ink`), a state in the line-state
 *   ink (the front red, or the neutral ink for clear), an area in the text
 *   colour around it. Shape and colour then say the same thing, and the shape
 *   alone still says it in greyscale.
 * - Plain-text artifacts (pastes, RSS, llms.txt, email text) carry none of
 *   this; they render words only.
 */

type IconSize = "inline" | "card";

const SIZE_CLASS: Record<IconSize, string> = {
  inline: "size-4",
  card: "size-5",
};

type ConceptIconProps = Omit<LucideProps, "ref" | "size"> & {
  size?: IconSize;
};

/* A caller that sets the drawing's own width and height (a glyph nested in a
   chart's viewBox) gets no CSS size, which would override the attributes. */
const sizeClass = (size: IconSize, props: Pick<LucideProps, "width" | "height">) =>
  props.width === undefined && props.height === undefined ? SIZE_CLASS[size] : undefined;

/** The condition's weather glyph, in that condition's ink. */
export function ConditionIcon({ regime, size = "inline", className, ...props }: ConceptIconProps & { regime: RegimeKey }) {
  const Icon = REGIME_ICONS[regime];
  return (
    <Icon
      data-regime={regime}
      data-concept-icon="condition"
      aria-hidden="true"
      focusable="false"
      strokeWidth={ICON_STROKE_WIDTH}
      className={cn("shrink-0 text-[color:var(--regime-ink)]", sizeClass(size, props), className)}
      {...props}
    />
  );
}

/** The weather glyph and the weather word together; the word defaults to the condition's label. */
export function ConditionLabel({
  regime,
  children,
  size = "inline",
  className,
}: {
  regime: RegimeKey;
  children?: ReactNode;
  size?: IconSize;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>
      <ConditionIcon regime={regime} size={size} />
      <span>{children ?? REGIME_LABELS[regime]}</span>
    </span>
  );
}

/** The area's glyph, in the colour of the text it sits beside. */
export function AreaIcon({ area, size = "inline", className, ...props }: ConceptIconProps & { area: DecisionArea }) {
  const Icon = DECISION_AREA_ICONS[area];
  return (
    <Icon
      data-concept-icon="area"
      aria-hidden="true"
      focusable="false"
      strokeWidth={ICON_STROKE_WIDTH}
      className={cn("shrink-0", sizeClass(size, props), className)}
      {...props}
    />
  );
}

/** The area's glyph and its name. Not for inside a link: an inline-flex span drops the link's underline. */
export function AreaLabel({ area, size = "inline", className }: { area: DecisionArea; size?: IconSize; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>
      <AreaIcon area={area} size={size} />
      <span>{decisionAreaLabel(area)}</span>
    </span>
  );
}

/* The line states' own tokens, not a condition's: the front red for a pause
   line crossed or close, the neutral ink for one cleared or a restart line met,
   so the play glyph is what says "clear". Until 2026-10-09 these were the
   caution and easing families, which were also Cloudy's and Sunny's inks. */
const LINE_STATE_INK: Record<LineState, string> = {
  crossed: "text-line-crossed-fg",
  near: "text-line-crossed-fg",
  clear: "text-line-clear-fg",
};

/* A line in force is a status, so it is drawn as a stamp (§XIV); "close" keeps
   the neutral edge, because nothing has happened yet. */
const LINE_STATE_STAMP: Record<LineState, string> = {
  crossed: "border-line-crossed-border/50 bg-line-crossed-border/10 font-semibold",
  near: "border-[color:var(--border-strong)] font-medium",
  clear: "border-line-clear-border/50 bg-line-clear-border/10 font-semibold",
};

/** The state's glyph alone, for a key whose words sit beside it ("Pause 76", "Resume 66"). */
export function LineStateIcon({ state, size = "inline", className, ...props }: ConceptIconProps & { state: LineState }) {
  const Icon = LINE_STATE_ICONS[state];
  return (
    <Icon
      data-concept-icon="line-state"
      data-line-state={state}
      aria-hidden="true"
      focusable="false"
      strokeWidth={ICON_STROKE_WIDTH}
      className={cn("shrink-0", LINE_STATE_INK[state], sizeClass(size, props), className)}
      {...props}
    />
  );
}

/**
 * The one state badge: the glyph and the words for where an area stands —
 * "Pause line crossed", "5 pts from its pause line", "already met". The words
 * are required. `stamp` frames it, for a line in force.
 */
export function LineStateBadge({
  state,
  children,
  stamp = false,
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className"> & {
  state: LineState;
  children: ReactNode;
  stamp?: boolean;
  className?: string;
}) {
  return (
    <span
      {...rest}
      data-line-state-badge={state}
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        LINE_STATE_INK[state],
        stamp ? cn("rounded-sm border px-1.5 py-px", LINE_STATE_STAMP[state]) : undefined,
        className,
      )}
    >
      <LineStateIcon state={state} />
      <span>{children}</span>
    </span>
  );
}
