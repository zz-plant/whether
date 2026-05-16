import type { ReactNode } from "react";

export const SectionedReportPanel = ({
  id,
  title,
  description,
  children,
  defaultOpen: _defaultOpen = true,
  label = "Section",
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  label?: string;
}) => (
  <section id={id} className="space-y-4">
    <div className="weather-panel relative overflow-hidden px-5 py-4">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent"
        aria-hidden="true"
      />
      <span className="text-xs font-semibold tracking-[0.2em] text-sky-200/80">
        {label}
      </span>
      <h4 className="mt-1 max-w-2xl text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
        {title}
      </h4>
      {description ? (
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
          {description}
        </p>
      ) : null}
    </div>
    <div className="rounded border border-slate-800/55 bg-slate-950/35 p-4 shadow-[0_18px_34px_-28px_rgba(2,6,23,0.75)] sm:p-5">
      <div className="space-y-6">{children}</div>
    </div>
  </section>
);
