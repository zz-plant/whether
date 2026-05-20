"use client";

import Link from "next/link";

const CONFIDENCE_STYLES = {
  HIGH: "text-emerald-200 bg-emerald-500/10",
  MED: "text-amber-200 bg-amber-500/10",
  LOW: "text-rose-200 bg-rose-500/10",
} as const;

const CONFIDENCE_TEXT_VARIANTS = {
  HIGH: "text-emerald-200",
  MED: "text-amber-200",
  LOW: "text-rose-200",
} as const;

type ConfidenceBadgeProps = {
  label: string;
  variant?: "pill" | "text" | "link";
  className?: string;
};

/**
 * Single source of truth for confidence label rendering.
 * Used on homepage, evidence, planning, trust, and public state pages.
 *
 * - `pill` (default): rounded-full badge with bg + text, for hero/card contexts
 * - `text`: plain colored text, for inline/summary contexts
 * - `link`: pill that links to /learn/failure-modes, for "when we get this wrong"
 */
export function ConfidenceBadge({
  label,
  variant = "pill",
  className = "",
}: ConfidenceBadgeProps) {
  const normalized = label.toUpperCase();
  const isKnown = normalized === "HIGH" || normalized === "MED" || normalized === "LOW";
  const display = isKnown ? normalized : label;

  const pillClass = isKnown
    ? CONFIDENCE_STYLES[normalized]
    : "text-slate-200 bg-slate-500/10";

  const textClass = isKnown
    ? CONFIDENCE_TEXT_VARIANTS[normalized]
    : "text-slate-200";

  if (variant === "text") {
    return (
      <span className={`font-semibold ${textClass} ${className}`}>
        {display}
      </span>
    );
  }

  if (variant === "link") {
    return (
      <Link
        href="/trust#revisit-call"
        className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] transition-colors hover:text-sky-200 no-underline ${pillClass} ${className}`}
        title="When we get this wrong"
      >
        {display}
      </Link>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em] ${pillClass} ${className}`}
    >
      {display}
    </span>
  );
}
