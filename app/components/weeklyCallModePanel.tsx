import Link from "next/link";
import type { Route } from "next";
import type { StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { PersistedAssistPanel } from "./literacyAssistControls";

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
  snapshotGuardrail: string;
  snapshotWatch: string;
  revisitDecisions: boolean;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  needsTrustWarning?: boolean;
  trustStateLabel: string;
  trustStateDetail: string;
  trustReason?: string;
  inlineTrustLabel: string;
  inlineTrustTone: "stable" | "warning" | "historical";
  stabilityRule: string;
  decisionBullets: Array<{ label: string; detail: string }>;
  guardrailPolicyDetails: PolicyDetails;
  flipPolicyDetails: PolicyDetails;
  roleTranslations: RoleTranslation[];
  activeRole: RoleTranslation["id"];
  roleHrefs: Record<RoleTranslation["id"], string>;
  glossaryHref?: string;
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  postureLabel,
  operatingCall,
  trendLabel,
  confidencePercent,
  confidenceLabel,
  snapshotGuardrail,
  snapshotWatch,
  revisitDecisions,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  whyItMattersLine,
  needsTrustWarning = false,
  trustStateLabel,
  trustStateDetail,
  trustReason,
  inlineTrustLabel,
  inlineTrustTone,
  stabilityRule,
  decisionBullets,
  guardrailPolicyDetails,
  flipPolicyDetails,
  roleTranslations,
  activeRole,
  roleHrefs,
  glossaryHref,
}: WeeklyCallModePanelProps) {
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === startupVariantPolicy.selectedMode)?.label ?? "Default";
  const activeRoleTranslation = roleTranslations.find((role) => role.id === activeRole) ?? roleTranslations[0];
  const trustToneClass = needsTrustWarning
    ? "border-amber-400/35 bg-amber-500/10 text-amber-50"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-50";
  const detailDisclosureBase = "mt-2 rounded-lg border border-slate-700/60 bg-slate-950/65 px-3 py-2";
  const inlineTrustToneClass = inlineTrustTone === "stable"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : inlineTrustTone === "historical"
      ? "border-violet-400/30 bg-violet-500/10 text-violet-100"
      : "border-amber-400/30 bg-amber-500/10 text-amber-100";
  const flipSupport = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== snapshotWatch.trim())
    .slice(0, 2);
  const compactDecisionBullets = decisionBullets
    .filter((item) => item.detail.trim().length > 0)
    .slice(0, 3);
  const changedThisWeekDetail = decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.";
  const actionNowDetail = decisionBullets.find((item) => item.label === "What that changes")?.detail ?? operatingCall;
  const revisitLabel = revisitDecisions ? "YES — Regime shift detected." : "NO — Hold posture.";
  const revisitDetail = revisitDecisions
    ? "Recheck last week's approvals before adding fixed cost."
    : "";
  const revisitToneClass = revisitDecisions
    ? "border-amber-400/25 bg-amber-500/8 text-amber-50"
    : "border-emerald-400/25 bg-emerald-500/8 text-emerald-50";
  const compactTrustToneClass = needsTrustWarning
    ? "border-amber-400/25 bg-amber-500/8"
    : "border-emerald-400/25 bg-emerald-500/8";
  const assistChipClass = "rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold tracking-[0.02em] text-slate-100";

  return (
    <>
      <article className={`rounded-[1.2rem] border border-slate-700/75 bg-slate-950/92 p-3 sm:p-3.5 ${sectionSpacingClassName}`} aria-label="Weekly call snapshot">
        <article id="weekly-call-core" className={`${tierOnePanelClassName} mt-3 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className={tierOneHeadingClassName}>This week in one screen</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">{postureLabel}</span>
              <span className={`rounded-full border px-2.5 py-1 ${inlineTrustToneClass}`}>{inlineTrustLabel}</span>
            </div>
          </div>
          {glossaryHref ? (
            <div className="mt-2 space-y-2">
              <PersistedAssistPanel
                assistMode="decision"
                buttonLabel="Translate this call"
                title="How to read the current call"
                summary="Use this when you understand the business context but need the macro terms converted into operating language."
              >
                <div className="flex flex-wrap gap-1.5">
                  <span className={assistChipClass}>Tightness = harder long-payback commitments</span>
                  <span className={assistChipClass}>Risk appetite = markets fund faster expansion</span>
                  <span className={assistChipClass}>Action / Pause / Change course = move, stop line, reopen line</span>
                </div>
                <p>
                  Need the fuller glossary?{" "}
                  <Link href={glossaryHref as Route} className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                    Open plain-English help
                  </Link>
                  .
                </p>
              </PersistedAssistPanel>
              <PersistedAssistPanel
                assistMode="trust"
                buttonLabel="Translate trust status"
                title="How to use the trust state"
                summary="Use this when you want to know whether this week’s call is safe to rely on now or should be treated cautiously."
              >
                <div className="flex flex-wrap gap-1.5">
                  <span className={assistChipClass}>Confidence = distance from the nearest flip line</span>
                  <span className={assistChipClass}>Freshness = recency of core inputs</span>
                  <span className={assistChipClass}>Ready to use = standard approvals okay; Use caution = keep commitments reversible</span>
                </div>
              </PersistedAssistPanel>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
            <article className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">Changed vs last week</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-amber-50">{changedThisWeekDetail}</p>
            </article>
            <article className={`rounded-xl border px-3 py-3 ${revisitToneClass}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Revisit decisions?</p>
              <p className="mt-1 text-sm font-semibold leading-6">{revisitLabel}</p>
              {revisitDetail ? <p className="mt-1 text-xs leading-5 text-slate-200">{revisitDetail}</p> : null}
            </article>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,0.92fr))]">
            <article className="rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-3 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Action now</p>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${inlineTrustToneClass}`}>{inlineTrustLabel}</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-emerald-50">{actionNowDetail}</p>
            </article>
            <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-200">Threshold / pause if</p>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${inlineTrustToneClass}`}>{inlineTrustLabel}</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-rose-50">{snapshotGuardrail}</p>
            </article>
            <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">Reversal / change course if</p>
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${inlineTrustToneClass}`}>{inlineTrustLabel}</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-sky-50">{snapshotWatch}</p>
            </article>
          </div>
          <div className={`mt-3 rounded-xl border px-3 py-2.5 ${compactTrustToneClass}`}>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/45 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Decision use</p>
                <p className={`mt-1 text-xs font-semibold ${needsTrustWarning ? "text-amber-100" : "text-emerald-100"}`}>
                  {needsTrustWarning ? "Use caution" : "Ready to use"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/45 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trust state</p>
                <p className="mt-1 text-xs font-semibold text-slate-100">{trustStateLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-200">{trustStateDetail}</p>
          </div>
        </article>

        <details className={`${detailDisclosureBase} mt-3`}>
          <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            More context
          </summary>
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Why this is the hold line</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{guardrailPolicyDetails.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {guardrailPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-700/60 bg-slate-950/65 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Variant</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{selectedModeLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{stabilityRule}</p>
            </article>

            <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">What would change the call</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{flipPolicyDetails.summary}</p>
              {flipSupport.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {flipSupport.map((label) => (
                    <span key={label} className="rounded-full border border-sky-400/25 bg-sky-500/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-100">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flipPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </article>
          </div>
        </details>

        {(whyItMattersLine || trustReason || activeRoleTranslation) ? (
          <details className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-3">
            <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Supporting rationale
            </summary>
            {whyItMattersLine ? <p className="mt-2 text-xs leading-5 text-slate-300">{whyItMattersLine}</p> : null}
            {trustReason ? <p className="mt-2 text-[11px] leading-5 text-slate-400">Reason: {trustReason}</p> : null}
            {compactDecisionBullets.length > 0 ? (
              <ul className="mt-3 grid gap-2 md:grid-cols-3">
                {compactDecisionBullets.map((item) => (
                  <li key={item.label} className="rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">{item.label}</p>
                    <p className="mt-1 leading-5">{item.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {activeRoleTranslation ? (
              <div className="mt-3 border-t border-slate-800/70 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Role translation</p>
                  <div className="flex flex-wrap gap-2">
                    {roleTranslations.map((role) => {
                      const active = role.id === activeRole;
                      return (
                        <Link
                          key={role.id}
                          href={roleHrefs[role.id] as Route}
                          className={active
                            ? "min-h-[44px] rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100"
                            : "min-h-[44px] rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"}
                          aria-current={active ? "page" : undefined}
                        >
                          {role.label}
                        </Link>
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
              </div>
            ) : null}
          </details>
        ) : null}
      </article>
    </>
  );
}
