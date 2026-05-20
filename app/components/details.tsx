"use client";

import type { ReactNode } from "react";

type DetailsVariant = "surface" | "surface-secondary" | "auto-chevron";

type DetailsProps = {
  children: ReactNode;
  summary: ReactNode;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  id?: string;
  variant?: DetailsVariant;
};

const variantClasses: Record<DetailsVariant, string> = {
  "surface": "weather-surface scroll-mt-28 px-4 py-4",
  "surface-secondary": "weather-surface-secondary scroll-mt-28 px-4 py-4",
  "auto-chevron": "weather-auto-chevron weather-surface scroll-mt-28 px-4 py-4",
};

export const Details = ({
  children,
  summary,
  className,
  open,
  defaultOpen,
  id,
  variant = "surface",
}: DetailsProps) => {
  const base = variantClasses[variant];

  return (
    <details
      id={id}
      className={`${base} [&>summary]:cursor-pointer [&>summary]:list-none ${className ?? ""}`}
      open={open}
      data-default-open={defaultOpen}
    >
      <summary className="select-none">{summary}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
};
