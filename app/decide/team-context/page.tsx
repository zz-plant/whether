import type { Metadata } from "next";
import Link from "next/link";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildPageMetadata } from "../../../lib/seo";
import {
  buildPersonalizedMandate,
  BUSINESS_MODEL_OPTIONS,
  CASH_RUNWAY_OPTIONS,
  GROWTH_RATE_OPTIONS,
  REVENUE_BAND_OPTIONS,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  TEAM_SIZE_OPTIONS,
} from "../../../lib/personalizedMandates";
import { SECTOR_TAXONOMY } from "../../../lib/report/sectorSensitivity";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Team context profile and personalized mandates",
  description: "Tailor the weekly mandate by stage, sector, and company profile.",
  path: "/decide/team-context",
  imageAlt: "Team context profile",
});

const parseProfile = (searchParams: Record<string, string | undefined>) => ({
  stage: searchParams.stage,
  sector: searchParams.sector,
  teamSize: searchParams.teamSize,
  revenueBand: searchParams.revenueBand,
  cashRunway: searchParams.cashRunway,
  growthRate: searchParams.growthRate,
  businessModel: searchParams.businessModel,
});

export default async function TeamContextPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const resolved = (searchParams ? await searchParams : {}) ?? {};
  const profileInput = parseProfile(resolved);
  const reportResult = await loadReportDataSafe(undefined, { route: "/decide/team-context" });
  const { assessment } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const mandate = buildPersonalizedMandate(assessment, profileInput);
  const { profile } = mandate.profileInterpretation;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Team context profile</h1>
        <p className="text-sm text-slate-300">Set your context once, then generate profile-aware weekly mandates.</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <form action="/decide/team-context" method="get" className="grid gap-3 sm:grid-cols-2">
          {([
            ["stage", "Stage", STAGE_OPTIONS],
            ["sector", "Sector", SECTOR_OPTIONS],
            ["teamSize", "Team size", TEAM_SIZE_OPTIONS],
            ["revenueBand", "Revenue band", REVENUE_BAND_OPTIONS],
            ["cashRunway", "Cash runway", CASH_RUNWAY_OPTIONS],
            ["growthRate", "Growth rate", GROWTH_RATE_OPTIONS],
            ["businessModel", "Business model", BUSINESS_MODEL_OPTIONS],
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
          <div className="sm:col-span-2">
            <button type="submit" className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Generate personalized mandate
            </button>
          </div>
        </form>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Base output (invariant fields)</p>
        <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
          {Object.entries(mandate.output).map(([label, value]) => (
            <p key={label}>
              <span className="font-semibold text-slate-100">{label}:</span> {value}
            </p>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Profile-aware interpretation</p>
        <h2 className="text-xl font-semibold text-slate-100">{mandate.headline}</h2>
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-xs text-slate-200">
          <p>
            Base posture <span className="font-semibold text-slate-100">{mandate.sectorOverlay.basePostureLabel}</span>
            {" · "}
            Sector-adjusted <span className="font-semibold text-slate-100">{mandate.sectorOverlay.adjustedPostureLabel}</span>
            {" · "}
            Strength <span className="font-semibold text-slate-100">{mandate.sectorOverlay.adjustmentStrength}</span>
          </p>
          <p className="mt-1 text-slate-300">{SECTOR_TAXONOMY[profile.sector].rationale}</p>
          <p className="mt-1 text-slate-300">
            Action bias: <span className="font-semibold text-slate-100">{mandate.sectorOverlay.actionBias}</span>
            {" · "}
            Flip condition: {mandate.sectorOverlay.reversalCondition}
          </p>
          {mandate.profileInterpretation.profileCompleteness === "partial" ? (
            <p className="mt-2 text-amber-200">Missing inputs defaulted: {mandate.profileInterpretation.fallbackFields.join(", ")}.</p>
          ) : null}
        </div>
        <p className="text-sm text-slate-300">{mandate.recommendation}</p>
        <ul className="space-y-2 text-sm text-slate-200">
          {mandate.tailoredActions.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stage differentiation</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(mandate.profileInterpretation.stageComparisons).map(([stage, guidance]) => (
            <article
              key={stage}
              className={`rounded-lg border px-3 py-2 text-sm ${stage === profile.stage ? "border-sky-400/70 bg-sky-950/30 text-sky-100" : "border-slate-700 bg-slate-950/60 text-slate-200"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">{stage}</p>
              <p className="mt-1">{guidance}</p>
            </article>
          ))}
        </div>
      </section>

      <Link href="/decide" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
        Back to decide hub
      </Link>
    </main>
  );
}
