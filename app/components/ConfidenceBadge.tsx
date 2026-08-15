"use client";

import Link from "next/link";
import { ParametricIdenticon } from "./ParametricIdenticon";

const CONFIDENCE_STYLES = {
  HIGH: "text-emerald-200 bg-emerald-500/10 border border-emerald-500/20",
  MED: "text-amber-200 bg-amber-500/10 border border-amber-500/20",
  LOW: "text-rose-200 bg-rose-500/10 border border-rose-500/20",
} as const;

const CONFIDENCE_TEXT_VARIANTS = {
  HIGH: "text-emerald-200",
  MED: "text-amber-200",
  LOW: "text-rose-200",
} as const;

type ConfidenceBadgeProps = {
  label: string;
  variant?: "pill" | "text" | "link";
  /** Optional hash seed for rendering an inline parametric integrity seal */
  seed?: string;
  className?: string;
};

/**
 * Single source of truth for confidence label rendering with optional parametric seal.
 * Used on homepage, evidence, planning, trust, and public state pages.
 *
 * - `pill` (default): rounded-full badge with bg + text, for hero/card contexts
 * - `text`: plain colored text, for inline/summary contexts
 * - `link`: pill that links to /trust#revisit-call
 */
export function ConfidenceBadge({
  label,
  variant = "pill",
  seed,
  className = "",
}: ConfidenceBadgeProps) {
  const normalized = label.toUpperCase();
  const isKnown = normalized === "HIGH" || normalized === "MED" || normalized === "LOW";
  const display = isKnown ? normalized : label;

  const pillClass = isKnown
    ? CONFIDENCE_STYLES[normalized]
    : "text-slate-200 bg-slate-500/10 border border-slate-700/50";

  const textClass = isKnown
    ? CONFIDENCE_TEXT_VARIANTS[normalized]
    : "text-slate-200";

  const iconSeal = seed ? (
    <ParametricIdenticon
      seed={seed}
      useCase="reportSeal"
      size={18}
      interactive={false}
      className="!ring-0 shrink-0 border-0 rounded-full"
    />
  ) : null;

  if (variant === "text") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold ${textClass} ${className}`}>
        {iconSeal}
        {display}
      </span>
    );
  }

  if (variant === "link") {
    return (
      <Link
        href="/trust#revisit-call"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 type-badge transition-colors hover:text-sky-200 no-underline ${pillClass} ${className}`}
        title="When we get this wrong"
      >
        {iconSeal}
        {display}
      </Link>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 type-badge ${pillClass} ${className}`}
    >
      {iconSeal}
      {display}
    </span>
  );
}
