"use client";

import Link from "next/link";
import { useState } from "react";
import type { StartupVariantPolicy } from "../../lib/report/homeBriefModel";

type PolicyDetails = {
  summary: string;
  chips: string[];
};

type RoleTranslation = {
  id: "finance" | "product";
  label: string;
  implication: string;
  doLine: string;
  holdLine: string;
};

type WeeklyCallModePanelProps = {
  startupVariantPolicy: StartupVariantPolicy;
  postureLabel: string;
  operatingCall: string;
  trendLabel: string;
  confidencePercent: number;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  snapshotAvoid: string;
  snapshotWatch: string;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  needsTrustWarning?: boolean;
  trustStateLabel: string;
  trustStateDetail: string;
  trustTimestamp: string;
  trustReason?: string;
  stabilityRule: string;
  decisionBullets: Array<{ label: string; detail: string }>;
  guardrailPolicyDetails: PolicyDetails;
  flipPolicyDetails: PolicyDetails;
  roleTranslations: RoleTranslation[];
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  postureLabel,
  operatingCall,
  trendLabel,
  confidencePercent,
  confidenceLabel,
  snapshotAvoid,
  snapshotWatch,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  whyItMattersLine,
  needsTrustWarning = false,
  trustStateLabel,
  trustStateDetail,
  trustTimestamp,
  trustReason,
  stabilityRule,
  decisionBullets,
  guardrailPolicyDetails,
  flipPolicyDetails,
  roleTranslations,
}: WeeklyCallModePanelProps) {
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === startupVariantPolicy.selectedMode)?.label ?? "Default";
  const [activeRole, setActiveRole] = useState<RoleTranslation["id"]>("finance");
  const activeRoleTranslation = roleTranslations.find((role) => role.id === activeRole) ?? roleTranslations[0];
  const confidenceValue = Math.max(0, Math.min(100, Math.round(confidencePercent)));
  const confidenceToneClass = confidenceLabel === "HIGH"
    ? "bg-emerald-400/80"
    : confidenceLabel === "MED"
      ? "bg-amber-400/80"
      : "bg-rose-400/80";
  const trustToneClass = needsTrustWarning
    ? "border-amber-400/35 bg-amber-500/10 text-amber-50"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-50";
  const detailDisclosureBase = "mt-2 rounded-lg border border-slate-700/60 bg-slate-950/65 px-3 py-2";
  const flipSupport = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== snapshotWatch.trim())
    .slice(0, 2);

  return (
    <>
      <article className={`rounded-[1.2rem] border border-slate-700/75 bg-slate-950/92 p-3 sm:p-3.5 ${sectionSpacingClassName}`} aria-label="Weekly call snapshot">
        <div className={`rounded-xl border px-3 py-2 ${trustToneClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{trustStateLabel}</span>
              <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                As of {trustTimestamp}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-current/80">{confidenceLabel} confidence</span>
          </div>
          <p className="mt-1 text-xs leading-5">{trustStateDetail}</p>
          {trustReason ? <p className="mt-1 text-[11px] leading-5 text-current/85">Reason: {trustReason}</p> : null}
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                Weekly operating brief
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {selectedModeLabel}
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {trendLabel}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/85">Current conditions</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-50 sm:text-2xl">{operatingCall}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-200">{postureLabel}</p>
              {whyItMattersLine ? <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">{whyItMattersLine}</p> : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-3 lg:min-w-[18rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decision confidence</p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90" role="progressbar" aria-valuenow={confidenceValue} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence ${confidenceValue} percent`}>
              <div className={`h-full origin-left ${confidenceToneClass} transition-transform duration-300`} style={{ transform: `scaleX(${confidenceValue / 100})` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              <span className="font-semibold text-slate-100">{confidenceLabel} {confidenceValue}%</span> confidence.
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">{stabilityRule}</p>
          </div>
        </div>

        <article id="weekly-call-core" className={`${tierOnePanelClassName} mt-3 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
          <h2 className={tierOneHeadingClassName}>This week&apos;s call</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {decisionBullets.map((item) => (
              <li key={item.label} className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-3 text-sm text-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
                <p className="mt-1 leading-6">{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Guardrail</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-rose-50">{snapshotAvoid}</p>
            <details className={detailDisclosureBase}>
              <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Show policy details
              </summary>
              <p className="mt-1 text-xs leading-5 text-slate-200">{guardrailPolicyDetails.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {guardrailPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </details>
          </article>

          <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Flip condition</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-sky-50">{snapshotWatch}</p>
            {flipSupport.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flipSupport.map((label) => (
                  <span key={label} className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <details className={detailDisclosureBase}>
              <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Show numbers
              </summary>
              <p className="mt-1 text-xs leading-5 text-slate-200">{flipPolicyDetails.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flipPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </details>
          </article>
        </div>

        {activeRoleTranslation ? (
          <article className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Role translation</p>
              <div className="flex flex-wrap gap-2">
                {roleTranslations.map((role) => {
                  const active = role.id === activeRole;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={active
                        ? "min-h-[44px] rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100"
                        : "min-h-[44px] rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"}
                      onClick={() => setActiveRole(role.id)}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">{activeRoleTranslation.implication}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/8 px-3 py-2 text-xs leading-5 text-emerald-100">
                <span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">Do</span> {activeRoleTranslation.doLine}
              </p>
              <p className="rounded-lg border border-rose-400/25 bg-rose-500/8 px-3 py-2 text-xs leading-5 text-rose-100">
                <span className="font-semibold uppercase tracking-[0.08em] text-rose-200">Don&apos;t</span> {activeRoleTranslation.holdLine}
              </p>
            </div>
          </article>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/signals" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
            Open Signals
          </Link>
        </div>
      </article>
    </>
  );
}
