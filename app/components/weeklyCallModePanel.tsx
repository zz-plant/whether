import Link from "next/link";
import type { Route } from "next";
import type { DecisionReadinessState } from "../../lib/report/trustStatus";
import type { RevisitQueueItem, StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { CompactDisclosure } from "./compactDisclosure";

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
  snapshotGuardrail: string;
  snapshotWatch: string;
  revisitDecisions: boolean;
  revisitQueue: RevisitQueueItem[];
  decisionReadiness: DecisionReadinessState;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  needsTrustWarning?: boolean;
  trustStateDetail: string;
  trustReason?: string;
  inlineTrustLabel: string;
  inlineTrustTone: "stable" | "warning" | "historical";
  commitmentReviewLabel: "Decision ready" | "Review before commitment";
  stabilityRule: string;
  weeklyLeadershipSummary: {
    boldnessScore: number;
    boldnessDelta: number;
    notchShiftLabel: string;
    shorthandLine: string;
    hiringWindow: string;
    expansionWindow: string;
    raiseWindow: string;
    netDeltaLabel: string;
  };
  decisionBullets: Array<{ label: string; detail: string }>;
  guardrailPolicyDetails: PolicyDetails;
  flipPolicyDetails: PolicyDetails;
  roleTranslations: RoleTranslation[];
  activeRole: RoleTranslation["id"];
  roleHrefs: Record<RoleTranslation["id"], string>;
  glossaryHref?: string;
};

const compactChangedThisWeekDetail = (detail: string) => {
  const lead = detail.split(/\b(?:Do now|Action|Flip):/i)[0]?.trim();
  return lead && lead.length > 0 ? lead : detail;
};

export function WeeklyCallModePanel({
  startupVariantPolicy,
  postureLabel,
  operatingCall,
  snapshotGuardrail,
  snapshotWatch,
  revisitDecisions,
  revisitQueue,
  decisionReadiness,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  whyItMattersLine,
  needsTrustWarning = false,
  trustStateDetail,
  trustReason,
  inlineTrustLabel,
  inlineTrustTone,
  commitmentReviewLabel,
  stabilityRule,
  weeklyLeadershipSummary,
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
  const changedThisWeekDetail = compactChangedThisWeekDetail(
    decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.",
  );
  const actionNowDetail = decisionBullets.find((item) => item.label === "What that changes")?.detail ?? operatingCall;
  const revisitLabel = revisitDecisions ? "Yes. Last week's decisions need another look." : "No. Last week's decisions still hold.";
  const revisitDetail = revisitDecisions
    ? "Recheck last week's approvals before adding fixed cost."
    : "";
  const revisitToneClass = revisitDecisions
    ? "border-amber-400/25 bg-amber-500/8 text-amber-50"
    : "border-emerald-400/25 bg-emerald-500/8 text-emerald-50";
  const compactTrustToneClass = needsTrustWarning
    ? "border-amber-400/25 bg-amber-500/8"
    : "border-emerald-400/25 bg-emerald-500/8";
  const signedBoldnessDelta = `${weeklyLeadershipSummary.boldnessDelta >= 0 ? "+" : ""}${weeklyLeadershipSummary.boldnessDelta}`;
  const readinessToneClass = decisionReadiness.tone === "stable"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : decisionReadiness.tone === "historical"
      ? "border-violet-400/30 bg-violet-500/10 text-violet-100"
      : "border-amber-400/30 bg-amber-500/10 text-amber-100";

  return (
    <>
      <article className={`rounded-[1.2rem] border border-slate-700/75 bg-slate-950/92 p-3 sm:p-3.5 ${sectionSpacingClassName}`} aria-label="Weekly brief">
        <article id="weekly-call-core" className={`${tierOnePanelClassName} mt-3 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className={tierOneHeadingClassName}>This week</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">{postureLabel}</span>
              {trustReason ? (
                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-violet-100">
                  FALLBACK SNAPSHOT
                </span>
              ) : null}
              <span className={`rounded-full border px-2.5 py-1 ${inlineTrustToneClass}`}>{inlineTrustLabel}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-violet-400/25 bg-violet-500/8 px-3 py-1.5 text-[11px] font-semibold text-violet-100">
              Boldness {weeklyLeadershipSummary.boldnessScore}/100 <span className="ml-1 text-violet-200">{signedBoldnessDelta}</span>
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Hiring {weeklyLeadershipSummary.hiringWindow}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Expansion {weeklyLeadershipSummary.expansionWindow}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Raise {weeklyLeadershipSummary.raiseWindow}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">{weeklyLeadershipSummary.shorthandLine} {weeklyLeadershipSummary.netDeltaLabel}</p>
          <p className="sr-only">Weekly decision strip: what to do now, what should make you slow down, and what should make you reopen the decision.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.28fr)_minmax(18rem,0.9fr)]">
            <article className="rounded-[1.1rem] border border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.09),rgba(2,6,23,0.2))] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Do this now</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">{commitmentReviewLabel}</p>
              <p className="mt-2 text-lg font-semibold leading-7 text-emerald-50 sm:text-xl">{actionNowDetail}</p>
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-slate-950/55 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">What changed</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-amber-50">{changedThisWeekDetail}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-200">Slow down if</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-rose-50">{snapshotGuardrail}</p>
                </article>
                <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">Lean back in if</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-sky-50">{snapshotWatch}</p>
                </article>
              </div>
            </article>

            <aside className="space-y-3">
              <article className={`rounded-[1.1rem] border px-3 py-3 ${revisitToneClass}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Revisit now</p>
                <p className="mt-1 text-base font-semibold leading-6">{revisitLabel}</p>
                {revisitDetail ? <p className="mt-1 text-xs leading-5 text-slate-200">{revisitDetail}</p> : null}

                {revisitQueue.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">Revisit queue</p>
                      <span className="rounded-full border border-amber-400/25 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100">
                        {revisitQueue.length} decisions
                      </span>
                    </div>
                    {revisitQueue.map((item) => (
                      <article key={item.id} className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                            Re-open
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-200">{item.action}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.reason}</p>
                        <p className="mt-1 text-[11px] leading-5 text-sky-100">Flip back in if {item.flipCondition}.</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>

              <article className={`rounded-[1.1rem] border px-3 py-3 ${compactTrustToneClass}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${readinessToneClass}`}>
                    Readiness: {decisionReadiness.label}
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-950/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                    This week&apos;s call
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-100">{decisionReadiness.detail}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-300">{trustStateDetail}</p>
                {trustReason ? (
                  <p className="mt-1 text-[11px] leading-5 text-slate-300">Using the last clean snapshot because {trustReason}</p>
                ) : null}
              </article>
            </aside>
          </div>
        </article>

        <CompactDisclosure
          queryKey="moreContext"
          summary="Why this week points here"
          className={`group ${detailDisclosureBase} weather-auto-chevron mt-3`}
          summaryClassName="min-h-[44px] cursor-pointer list-none pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300"
        >
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <article className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">Why the read points here</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{guardrailPolicyDetails.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {guardrailPolicyDetails.chips.map((chip) => (
                  <span key={chip} className={compactInsetClassName}>{chip}</span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-700/60 bg-slate-950/65 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Who this matters most for</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{selectedModeLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{stabilityRule}</p>
            </article>

            <article className="rounded-xl border border-sky-400/25 bg-sky-500/8 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">This likely changes if</p>
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
        </CompactDisclosure>

      {(whyItMattersLine || trustReason || activeRoleTranslation) ? (
          <CompactDisclosure
            queryKey="supportingRationale"
            summary="How this lands across the company"
            className="group weather-auto-chevron mt-3 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-3"
            summaryClassName="min-h-[44px] cursor-pointer list-none pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300"
          >
            {glossaryHref ? (
              <p className="mt-2 text-[11px] leading-5 text-slate-300">
                Need plain-language definitions?{" "}
                <Link href={glossaryHref as Route} className="font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
                  Open the glossary
                </Link>
                .
              </p>
            ) : null}
            {whyItMattersLine ? <p className="mt-2 text-xs leading-5 text-slate-300">{whyItMattersLine}</p> : null}
            {trustReason ? (
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Using the last clean weekly read because {trustReason}
              </p>
            ) : null}
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
          </CompactDisclosure>
        ) : null}
      </article>
    </>
  );
}
