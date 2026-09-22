import type { HTMLAttributes } from "react";

export type OperatingLoopStep = "signals" | "posture" | "plan" | "share";

type OperatingLoopGlyphProps = HTMLAttributes<HTMLOListElement> & {
  activeStep?: OperatingLoopStep;
  variant?: "compact" | "detailed";
};

const stages = [
  { key: "signals", label: "Signals", title: "Public signals", detail: "St. Louis Fed & Treasury feeds", path: "M4 16L9 9L14 13L20 5" },
  { key: "posture", label: "Call", title: "The weekly call", detail: "Sunny, Cloudy, Stormy or Freezing", path: "M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8" },
  { key: "plan", label: "Plan", title: "The plan", detail: "Do now, pause if, resume when", path: "M6 5V19M18 5V19M6 12H18" },
  { key: "share", label: "Share", title: "Shared artifact", detail: "Meeting & Slack block", path: "M6 3H18V21H6ZM9 9H15M9 13H15M9 17H13" },
] as const;

/** HTML labels reflow independently of the artwork, including at text zoom. */
export function OperatingLoopGlyph({ activeStep, variant = "compact", className = "", ...props }: OperatingLoopGlyphProps) {
  return (
    <ol
      className={`weather-operating-loop ${className}`}
      data-variant={variant}
      aria-label="Whether operating loop: Signals to Posture to Plan to Share"
      {...props}
    >
      {stages.map((stage) => (
        <li key={stage.key} aria-current={activeStep === stage.key ? "step" : undefined}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true" focusable="false">
            <path d={stage.path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            <strong>{variant === "detailed" ? stage.title : stage.label}</strong>
            {variant === "detailed" ? <small>{stage.detail}</small> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
