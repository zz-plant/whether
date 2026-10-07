import type { HTMLAttributes, ReactNode } from "react";
import type { RegimeKey } from "../../../lib/types";

type TagTone = "sky" | "cyan" | "amber" | "rose" | "emerald" | "slate";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: TagTone;
  /** Draws the tag as the regime's stamp instead of a tone: the regime word's
   *  face, in that regime's hue from the `data-regime` tokens (§XVI). */
  regime?: RegimeKey;
};

const toneClassNames: Record<TagTone, string> = {
  sky: "weather-tag-sky",
  cyan: "weather-tag-cyan",
  amber: "weather-tag-amber",
  rose: "weather-tag-rose",
  emerald: "weather-tag-emerald",
  slate: "weather-tag-slate",
};

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(" ");

export function Tag({ children, className, tone = "slate", regime, ...props }: TagProps) {
  if (regime) {
    return (
      <span {...props} data-regime={regime} className={joinClasses("weather-tag weather-tag-regime type-stamp", className)}>
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
