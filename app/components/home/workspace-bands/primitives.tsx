import type { ReactNode } from "react";

export const HomeBandGlyph = ({ children, toneClass }: { children: ReactNode; toneClass: string }) => (
  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-slate-950/55 ${toneClass}`}>
    {children}
  </span>
);

const HomeBandSignal = ({ toneClass }: { toneClass: string }) => (
  <span className="inline-flex items-end gap-1" aria-hidden="true">
    <span className={`h-2 w-1.5 rounded-full ${toneClass} opacity-65`} />
    <span className={`h-3.5 w-1.5 rounded-full ${toneClass} opacity-85`} />
    <span className={`h-5 w-1.5 rounded-full ${toneClass}`} />
  </span>
);

export const HomeBandHeader = ({ step, kicker, title, description, icon, toneClass, actions }: { step: string; kicker: string; title: string; description?: string; icon: ReactNode; toneClass: string; actions?: ReactNode }) => (
  <div className="home-band-shell__header flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <HomeBandGlyph toneClass={toneClass}>{icon}</HomeBandGlyph>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="home-band-step">{step}</span>
          <p className="home-band-kicker">{kicker}</p>
          <HomeBandSignal toneClass={toneClass.split(" ")[0] ?? toneClass} />
        </div>
        <h2 className="text-lg font-semibold leading-tight text-slate-100 sm:text-[1.1rem]">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{description}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

export const CardEyebrow = ({ icon, label, accentClass }: { icon: ReactNode; label: string; accentClass: string }) => (
  <p className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${accentClass}`}>
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-[0.7rem] border border-current/20 bg-slate-950/60">
      {icon}
    </span>
    <span>{label}</span>
  </p>
);
