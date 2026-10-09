import type { HTMLAttributes } from "react";

type OperatingLoopGlyphProps = HTMLAttributes<HTMLOListElement> & {
  variant?: "compact" | "detailed";
};

const stages = [
  { key: "signals", label: "Signals", title: "Public signals", detail: "St. Louis Fed & Treasury feeds", path: "M4 16L9 9L14 13L20 5" },
  { key: "posture", label: "Conditions", title: "This week's conditions", detail: "Sunny, Cloudy, Stormy or Freezing", path: "M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8" },
  { key: "plan", label: "Plan", title: "The plan", detail: "Do now, pause if, resume when", path: "M6 5V19M18 5V19M6 12H18" },
  { key: "share", label: "Share", title: "Shared artifact", detail: "Meeting & Slack block", path: "M6 3H18V21H6ZM9 9H15M9 13H15M9 17H13" },
] as const;

/**
 * The product loop. HTML labels reflow independently of the artwork, including
 * at text zoom.
 *
 * Until 2026-10-08 the compact variant also took an active step and sat beside
 * the intro on /signals, /operate and /trust, where it read as a tab row that
 * named none of the pages it sat on and linked nowhere. Those pages draw their
 * group's sub-tabs instead (`SectionTabs`).
 */
export function OperatingLoopGlyph({ variant = "compact", className = "", ...props }: OperatingLoopGlyphProps) {
  return (
    <ol
      className={`weather-operating-loop ${className}`}
      data-variant={variant}
      aria-label="Whether operating loop: Signals to Posture to Plan to Share"
      {...props}
    >
      {stages.map((stage) => (
        <li key={stage.key}>
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
