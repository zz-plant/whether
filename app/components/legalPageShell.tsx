import type { ReactNode } from "react";
import { PageShell } from "./pageShell";

type LegalPageShellProps = {
  title: string;
  /**
   * When this document took effect. Defaults to the date the first two were
   * published — a shared literal was fine while every legal page shipped
   * together, and stops being fine the moment one of them is written later.
   */
  effectiveDate?: string;
  children: ReactNode;
};

export const LegalPageShell = ({ title, effectiveDate = "2/23/2026", children }: LegalPageShellProps) => (
  /* Was HubPageShell, whose only caller this was; its HubHero and HubSection had none. */
  <PageShell backdropVariant="hub" className="weather-page-shell weather-page-shell-standard weather-hub-shell">
    <div className="weather-legal-content mx-auto w-full max-w-4xl space-y-8">
      <header className="weather-hub-section space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300">Effective Date: {effectiveDate}</p>
      </header>
      {children}
    </div>
  </PageShell>
);
