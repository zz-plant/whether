import type { HTMLAttributes, ReactNode } from "react";
import type { RegimeKey } from "../../../lib/types";
import { ConditionIcon } from "./conceptIcons";

/* No action-colour tone: a tag is a display, and the action colour is for
   controls (ui-ux-standards §XXVII). A condition is `regime`, a line state
   amber/rose or emerald, anything else slate. */
type TagTone = "amber" | "rose" | "emerald" | "slate";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: TagTone;
  /** Draws the tag as the regime's stamp instead of a tone: the regime word's
   *  face and weather glyph, in that regime's hue from the `data-regime`
   *  tokens (§XVI). */
  regime?: RegimeKey;
};

const toneClassNames: Record<TagTone, string> = {
  amber: "weather-tag-amber",
  rose: "weather-tag-rose",
  emerald: "weather-tag-emerald",
  slate: "weather-tag-slate",
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export function Tag({ children, className, tone = "slate", regime, ...props }: TagProps) {
  if (regime) {
    return (
      <span
        {...props}
        data-regime={regime}
        className={joinClasses("weather-tag weather-tag-regime type-stamp gap-1", className)}
      >
        <ConditionIcon regime={regime} />
        {children}
      </span>
    );
  }
  return (
    <span {...props} className={joinClasses("weather-tag", toneClassNames[tone], className)}>
      {children}
    </span>
  );
}
