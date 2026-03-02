import type { Metadata } from "next";
import Link from "next/link";
import { loadReportData } from "../../../lib/report/reportData";
import { buildPageMetadata } from "../../../lib/seo";
import { scoreWhetherToShipChecklist, type ChecklistInput } from "../../../lib/whetherToShipChecklist";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether to ship checklist",
  description: "Quick go / wait / kill recommendation calibrated to the current macro regime.",
  path: "/decide/ship-checklist",
  imageAlt: "Whether to ship checklist",
});

const parseInput = (searchParams: Record<string, string | undefined>): ChecklistInput => ({
  evidenceStrength: (searchParams.evidenceStrength as ChecklistInput["evidenceStrength"]) ?? "medium",
  reversibility: (searchParams.reversibility as ChecklistInput["reversibility"]) ?? "moderate",
  blastRadius: (searchParams.blastRadius as ChecklistInput["blastRadius"]) ?? "medium",
  strategicAlignment: (searchParams.strategicAlignment as ChecklistInput["strategicAlignment"]) ?? "medium",
});

export default async function ShipChecklistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const resolved = (searchParams ? await searchParams : {}) ?? {};
  const input = parseInput(resolved);
  const { assessment } = await loadReportData();
  const result = scoreWhetherToShipChecklist(input, assessment);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Whether to ship checklist</h1>
        <p className="text-sm text-slate-300">Score launch readiness against the current regime and get a go/wait/kill recommendation.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <form action="/decide/ship-checklist" method="get" className="grid gap-3 sm:grid-cols-2">
          {([
            ["evidenceStrength", "Evidence strength", ["low", "medium", "high"]],
            ["reversibility", "Reversibility", ["hard", "moderate", "easy"]],
            ["blastRadius", "Blast radius", ["large", "medium", "small"]],
            ["strategicAlignment", "Strategic alignment", ["low", "medium", "high"]],
          ] as const).map(([key, label, options]) => (
            <label key={key} className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              {label}
              <select name={key} defaultValue={input[key]} className="weather-control rounded-md border-slate-700 bg-slate-900">
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Score checklist
            </button>
          </div>
        </form>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Result</p>
        <h2 className="text-xl font-semibold text-slate-100">Recommendation: {result.verdict.toUpperCase()}</h2>
        <p className="text-sm text-slate-300">Adjusted score: {result.adjustedScore}</p>
        <ul className="space-y-2 text-sm text-slate-200">
          {result.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
        <p className="text-sm text-slate-300">Reversal trigger: {result.reversalTrigger}</p>
      </section>

      <Link href="/decide" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Back to decide hub
      </Link>
    </main>
  );
}
