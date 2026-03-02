import type { ReactNode } from "react";

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export const LegalPageShell = ({ title, children }: LegalPageShellProps) => (
  <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3 border-b border-slate-800/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Whether Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
        <p className="text-sm text-slate-300">Effective Date: 2/23/2026</p>
      </header>
      {children}
    </div>
  </main>
);
