import type { Metadata } from "next";
import Link from "next/link";
import { loadReportData } from "../../../lib/report/reportData";
import { buildPageMetadata } from "../../../lib/seo";
import { buildPersonalizedMandate, type TeamContextProfile } from "../../../lib/personalizedMandates";


export const metadata: Metadata = buildPageMetadata({
  title: "Team context profile and personalized mandates",
  description: "Tailor the weekly mandate by stage, sector, and team size.",
  path: "/decide/team-context",
  imageAlt: "Team context profile",
});

const parseProfile = (searchParams: Record<string, string | undefined>): TeamContextProfile => ({
  stage: (searchParams.stage as TeamContextProfile["stage"]) ?? "growth",
  sector: (searchParams.sector as TeamContextProfile["sector"]) ?? "b2b-saas",
  teamSize: (searchParams.teamSize as TeamContextProfile["teamSize"]) ?? "mid",
});

export default async function TeamContextPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const resolved = (searchParams ? await searchParams : {}) ?? {};
  const profile = parseProfile(resolved);
  const { assessment } = await loadReportData();
  const mandate = buildPersonalizedMandate(assessment, profile);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Team context profile</h1>
        <p className="text-sm text-slate-300">Set your context once, then generate personalized mandates for weekly planning.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <form action="/decide/team-context" method="get" className="grid gap-3 sm:grid-cols-3">
          {([
            ["stage", "Stage", ["seed", "series-a", "growth", "public"]],
            ["sector", "Sector", ["b2b-saas", "consumer", "infrastructure"]],
            ["teamSize", "Team size", ["small", "mid", "large"]],
          ] as const).map(([key, label, options]) => (
            <label key={key} className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              {label}
              <select name={key} defaultValue={profile[key]} className="weather-control rounded-md border-slate-700 bg-slate-900">
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
          <div className="sm:col-span-3">
            <button type="submit" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Generate personalized mandate
            </button>
          </div>
        </form>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personalized output</p>
        <h2 className="text-xl font-semibold text-slate-100">{mandate.headline}</h2>
        <p className="text-sm text-slate-300">{mandate.recommendation}</p>
        <ul className="space-y-2 text-sm text-slate-200">
          {mandate.tailoredActions.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </section>

      <Link href="/decide" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Back to decide hub
      </Link>
    </main>
  );
}
