import type { ReactNode } from "react";

type TrustTone = "stable" | "warning" | "historical";

const toneConfig: Record<
  TrustTone,
  {
    label: string;
    icon: ReactNode;
    panelClassName: string;
    badgeClassName: string;
    detailClassName: string;
  }
> = {
  stable: {
    label: "Normal",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    panelClassName: "border-emerald-400/60 bg-emerald-500/10 text-emerald-100",
    badgeClassName: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
    detailClassName: "text-emerald-100/85",
  },
  warning: {
    label: "Caution",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 4l8 14H4l8-14z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
    panelClassName: "border-amber-400/60 bg-amber-500/10 text-amber-100",
    badgeClassName: "border-amber-300/80 bg-amber-400/20 text-amber-100",
    detailClassName: "text-amber-100/85",
  },
  historical: {
    label: "Retrospective",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 8v5l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
    panelClassName: "border-slate-500/60 bg-slate-900/70 text-slate-200",
    badgeClassName: "border-slate-400/70 bg-slate-700/50 text-slate-100",
    detailClassName: "text-slate-200/85",
  },
};

export const CanonicalTrustModule = ({
  tone,
  label,
  detail,
  action,
  compact = false,
}: {
  tone: TrustTone;
  label: string;
  detail: string;
  action: string;
  compact?: boolean;
}) => {
  const config = toneConfig[tone];

  return (
    <section
      className={`weather-panel flex flex-col gap-2 px-4 py-4 ${config.panelClassName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex min-h-[24px] items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tracking-[0.14em] ${config.badgeClassName}`}
        >
          {config.icon}
          {config.label}
        </span>
        <p className="text-xs font-semibold tracking-[0.16em]">
          Data provenance
        </p>
      </div>
      <p className="text-sm font-semibold text-slate-100">{label}</p>
      <p className={`text-xs leading-relaxed ${config.detailClassName}`}>
        {detail}
      </p>
      {!compact ? (
        <p className="text-xs leading-relaxed text-slate-200/80">{action}</p>
      ) : null}
    </section>
  );
};
