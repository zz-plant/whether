"use client";

import type { ReactNode } from "react";

/**
 * Shared disclosure.
 *
 * Every variant carries the chevron affordance. The previous default ("surface")
 * rendered a summary with `list-style: none` and nothing else — no chevron, no
 * 44px target, no focus ring — so a disclosure built with the default settings
 * read as a static heading with its content simply missing. The one existing
 * call site sidestepped that by passing `variant="auto-chevron"` explicitly,
 * which is a default worth not having.
 *
 * `weather-auto-chevron` is one of the three equivalent opt-ins into the single
 * disclosure contract in `app/styles/controls.css`.
 */

type DetailsVariant = "surface" | "surface-secondary";

type DetailsProps = {
  children: ReactNode;
  summary: ReactNode;
  className?: string;
  open?: boolean;
  id?: string;
  variant?: DetailsVariant;
};

const variantClasses: Record<DetailsVariant, string> = {
  "surface": "weather-surface",
  "surface-secondary": "weather-surface-secondary",
};

export const Details = ({
  children,
  summary,
  className,
  open,
  id,
  variant = "surface",
}: DetailsProps) => (
  <details
    id={id}
    className={`weather-auto-chevron ${variantClasses[variant]} px-4 py-4 ${className ?? ""}`}
    open={open}
  >
    <summary className="select-none">{summary}</summary>
    <div className="mt-4">{children}</div>
  </details>
);
