import Link from "next/link";
import { Suspense } from "react";
import type { Route } from "../../../lib/navigation/routeType";
import { homeScrollPlan } from "../../../lib/navigation/scrollPlans";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { PageFlowNav } from "../pageFlowNav";
import { HistoricalReplayDatePicker } from "../../signals/components/historicalReplayDatePicker";
import {
  ArrowRightIcon,
  AuditIcon,
  BoltIcon,
  CheckIcon,
  DocumentIcon,
  HistoryIcon,
  LayoutGridIcon,
  ShieldIcon,
  TrendUpIcon,
} from "../uiIcons";
import type { ReactNode } from "react";

type HomeWorkspaceBandsProps = {
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
};

const HistoricalReplayDatePickerFallback = ({
  initialDate,
  submitLabel,
}: {
  initialDate: string;
  submitLabel: string;
}) => (
  <form className="flex flex-wrap items-end gap-3" aria-busy="true">
    <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
      Replay date
      <input
        type="date"
        value={initialDate}
        readOnly={true}
        disabled={true}
        className="weather-control rounded-md border-slate-700 bg-slate-900 opacity-80"
      />
    </label>
    <button
      type="button"
      disabled={true}
      className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em] opacity-80"
    >
      {submitLabel}
    </button>
  </form>
);

const HomeBandGlyph = ({ children, toneClass }: { children: ReactNode; toneClass: string }) => (
  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-950/70 ${toneClass}`}>
    {children}
  </span>
);

const HomeBandSignal = ({ toneClass }: { toneClass: string }) => (
  <span className="inline-flex items-end gap-1" aria-hidden="true">
    <span className={`h-2 w-1.5 rounded-full ${toneClass} opacity-65`} />
    <span className={`h-3.5 w-1.5 rounded-full ${toneClass} opacity-85`} />
    <span className={`h-5 w-1.5 rounded-full ${toneClass}`} />
  </span>
);

const HomeBandHeader = ({
  step,
  kicker,
  title,
  description,
  icon,
  toneClass,
  actions,
}: {
  step: string;
  kicker: string;
  title: string;
  description: string;
  icon: ReactNode;
  toneClass: string;
  actions?: ReactNode;
}) => (
  <div className="home-band-shell__header flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <HomeBandGlyph toneClass={toneClass}>{icon}</HomeBandGlyph>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="home-band-step">{step}</span>
          <p className="home-band-kicker">{kicker}</p>
          <HomeBandSignal toneClass={toneClass.split(" ")[0] ?? toneClass} />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <p className="max-w-3xl text-sm text-slate-300">{description}</p>
      </div>
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

const CardEyebrow = ({ icon, label, accentClass }: { icon: ReactNode; label: string; accentClass: string }) => (
  <p className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${accentClass}`}>
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/20 bg-slate-950/60">
      {icon}
    </span>
    <span>{label}</span>
  </p>
);

export async function HomeWorkspaceBands({
  workspaceModelPromise,
}: HomeWorkspaceBandsProps) {
  const workspaceModel = await workspaceModelPromise;
  const trustMarkerToneClass = workspaceModel.audit.trustMarkerTone === "stable"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : workspaceModel.audit.trustMarkerTone === "historical"
      ? "border-violet-400/35 bg-violet-500/10 text-violet-100"
      : "border-amber-400/35 bg-amber-500/10 text-amber-100";

  return (
    <div className="home-band-stack">
      <PageFlowNav
        eyebrow={homeScrollPlan.eyebrow}
        title={homeScrollPlan.title}
        description={homeScrollPlan.description}
        items={homeScrollPlan.items}
        className="home-band home-band--flow"
        compact={true}
      />

      <section id="audit-this-call" className="home-band home-band--audit home-band-shell weather-panel weather-section-stage weather-section-stage--short scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="audit-this-call-title">
        <HomeBandHeader
          step="01"
          kicker="Why this call"
          title="See what changed, then pressure-test the call with trust and evidence."
          description="Start with the weekly delta and reversal cue, then inspect freshness, source coverage, and evidence movers before you change pace."
          icon={<AuditIcon className="h-5 w-5 text-sky-100" />}
          toneClass="border-sky-400/40 text-sky-200"
          actions={(
            <Link href={"/signals" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
              <TrendUpIcon className="h-3.5 w-3.5" />
              <span>Review full evidence</span>
            </Link>
          )}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
            <CardEyebrow icon={<AuditIcon className="h-3.5 w-3.5" />} label="Trust summary" accentClass="text-sky-200" />
            <p className="mt-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustMarkerToneClass}`}>
                {workspaceModel.audit.trustMarkerLabel}
              </span>
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {workspaceModel.audit.trustStatusLabel} — {workspaceModel.audit.trustStatusDetail}
            </p>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.trustStatusAction}</p>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p><span className="font-semibold text-slate-100">Freshness:</span> {workspaceModel.audit.freshnessSummary}</p>
              <p><span className="font-semibold text-slate-100">Coverage:</span> {workspaceModel.audit.sourceCoverageLine}</p>
            </div>
            <details className="mt-3 rounded-lg border border-slate-800/60 bg-slate-950/55 px-3 py-2">
              <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Source trust detail
              </summary>
              <p className="mt-2 text-xs text-slate-300">{workspaceModel.audit.trustMarkerDetail}</p>
              {workspaceModel.audit.sourceDegraded ? (
                <p className="mt-1 text-xs font-semibold text-amber-200">Degraded state: keep decisions reversible until one verified live refresh.</p>
              ) : null}
              <ul className="mt-2 grid gap-1.5 text-xs text-slate-300">
                {workspaceModel.audit.sourceRows.map((row) => (
                  <li key={row.sourceName} className="rounded-md border border-slate-800/70 bg-slate-950/55 px-2 py-1.5">
                    <span className="font-semibold text-slate-100">{row.sourceName}:</span> {row.modeLabel} · {row.freshnessStatus}
                  </li>
                ))}
              </ul>
            </details>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Decision pressure test" accentClass="text-amber-200" />
            <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.revisitDetail}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Flip line</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{workspaceModel.audit.flipHeadline}</p>
            <p className="mt-1 text-sm text-slate-300">{workspaceModel.audit.flipDetail}</p>
            {workspaceModel.audit.evidenceMovers[0] ? (
              <p className="mt-3 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">Top mover:</span> {workspaceModel.audit.evidenceMovers[0].title} — {workspaceModel.audit.evidenceMovers[0].detail}
              </p>
            ) : null}
          </article>
        </div>
      </section>

      <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
        <HomeBandHeader
          step="02"
          kicker="Execution guardrails"
          title="Lock the operating summary here, then open Operations only for execution detail."
          description="This band compresses the weekly do now, top guardrails, finance posture, and share handoff after you review the call."
          icon={<CheckIcon className="h-5 w-5 text-emerald-100" />}
          toneClass="border-emerald-400/40 text-emerald-200"
          actions={(
            <Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Continue in Operations</span>
            </Link>
          )}
        />

        <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
            <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Weekly operating action" accentClass="text-emerald-200" />
            <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.approvalHeadline}</p>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.approvalDetail}</p>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Hold this line" accentClass="text-amber-200" />
            {workspaceModel.operations.topGuardrails[0] ? (
              <>
                <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.topGuardrails[0].label}</p>
                <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.topGuardrails[0].detail}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-300">Keep this week&apos;s guardrails in force until a flip condition clears.</p>
            )}
            {workspaceModel.operations.financeSnapshot[0] ? (
              <p className="mt-3 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">Finance:</span> {workspaceModel.operations.financeSnapshot[0].actionNow}
              </p>
            ) : null}
          </article>
        </div>
        <div className="flex flex-wrap gap-2">
          {workspaceModel.operations.exportActions.map((action) => (
            <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
              <DocumentIcon className="h-3.5 w-3.5" />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="historical-replay-workspace" className="home-band home-band--history home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="historical-replay-workspace-title">
        <HomeBandHeader
          step="03"
          kicker="Historical replay"
          title="Compare this week's live call with a prior baseline after you lock the plan."
          description="Use replay as continuity for the weekly ritual: check what changed, what held, and whether today's approvals are tighter or looser than the earlier read."
          icon={<HistoryIcon className="h-5 w-5 text-violet-100" />}
          toneClass="border-violet-400/40 text-violet-200"
        />

        <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<HistoryIcon className="h-3.5 w-3.5" />} label="Replay a prior monthly snapshot" accentClass="text-violet-200" />
            <div className="mt-3">
              <Suspense
                fallback={(
                  <HistoricalReplayDatePickerFallback
                    initialDate={workspaceModel.replay.initialDate}
                    submitLabel="Replay on home"
                  />
                )}
              >
                <HistoricalReplayDatePicker
                  initialDate={workspaceModel.replay.initialDate}
                  forceAdvanced={false}
                  submitHash="#historical-replay-workspace"
                  submitLabel="Replay on home"
                />
              </Suspense>
            </div>
            <p className="mt-3 text-sm text-slate-300">{workspaceModel.replay.summary}</p>
            <div className="mt-3">
              <Link href={workspaceModel.replay.openFullHref as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>Open full time machine</span>
              </Link>
            </div>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<ArrowRightIcon className="h-3.5 w-3.5" />} label="What this looked like then" accentClass="text-slate-300" />
            <ul className="mt-3 space-y-2">
              {workspaceModel.replay.preview.map((entry) => (
                <li key={entry.key} className="home-band-list-item rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-100">{entry.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{entry.summary}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="home-band weather-panel weather-section-stage weather-section-stage--short space-y-4 px-4 py-4 sm:px-5" aria-label="Deeper decision paths">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="home-band-kicker">Need deeper translation?</p>
            <h2 className="text-lg font-semibold text-slate-100">Keep Weekly Brief as the source of truth, then open one deeper path only if the call still needs context.</h2>
            <p className="max-w-3xl text-sm text-slate-300">
              Use role paths, situation paths, or runnable instruments only after the weekly call and plan are already clear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/decide" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Open Decide
            </Link>
            <Link href="/toolkits" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold text-slate-100">
              Browse toolkits
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Link href={workspaceModel.translate.rolePath.href as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Recommended role path</p>
            <p className="mt-2 text-sm font-semibold">{workspaceModel.translate.rolePath.title}</p>
            <p className="mt-1 text-xs text-slate-300">{workspaceModel.translate.rolePath.detail}</p>
          </Link>

          <Link href={workspaceModel.translate.situationPath.href as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Recommended situation path</p>
            <p className="mt-2 text-sm font-semibold">{workspaceModel.translate.situationPath.title}</p>
            <p className="mt-1 text-xs text-slate-300">{workspaceModel.translate.situationPath.detail}</p>
          </Link>

          <Link href={workspaceModel.translate.decisionUtilities[0]?.href as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Bounded validation</p>
            <p className="mt-2 text-sm font-semibold">{workspaceModel.translate.decisionUtilities[0]?.title}</p>
            <p className="mt-1 text-xs text-slate-300">{workspaceModel.translate.decisionUtilities[0]?.detail}</p>
          </Link>
        </div>

        {workspaceModel.translate.toolkitShortcuts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {workspaceModel.translate.toolkitShortcuts.map((toolkit) => (
              <Link key={toolkit.href} href={toolkit.href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>{toolkit.title}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
