import type { ReactNode } from "react";
import { PageShell } from "./pageShell";

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export const LegalPageShell = ({ title, children }: LegalPageShellProps) => (
  /* Was HubPageShell, whose only caller this was; its HubHero and HubSection had none. */
  <PageShell backdropVariant="hub" className="weather-page-shell weather-page-shell-standard weather-hub-shell">
    <div className="weather-legal-content mx-auto w-full max-w-4xl space-y-8">
      <header className="weather-hub-section space-y-3">
        <p className="weather-hub-section-eyebrow">Whether Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300">Effective Date: 2/23/2026</p>
      </header>
      {children}
    </div>
  </PageShell>
);
