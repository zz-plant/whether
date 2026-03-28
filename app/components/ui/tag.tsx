import type { HTMLAttributes, ReactNode } from "react";

type TagTone = "sky" | "cyan" | "amber" | "rose" | "emerald" | "slate";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: TagTone;
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

export function Tag({ children, className, tone = "slate", ...props }: TagProps) {
  return (
    <span {...props} className={joinClasses("weather-tag", toneClassNames[tone], className)}>
      {children}
    </span>
  );
}
