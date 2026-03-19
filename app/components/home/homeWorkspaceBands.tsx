import Link from "next/link";
import { Suspense } from "react";
import type { Route } from "../../../lib/navigation/routeType";
import { homeScrollPlan } from "../../../lib/navigation/scrollPlans";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { CanonicalTrustModule } from "../canonicalTrustModule";
import { PageFlowNav } from "../pageFlowNav";
import { HistoricalReplayDatePicker } from "../../signals/components/historicalReplayDatePicker";
import {
  ArrowRightIcon,
  AuditIcon,
  BoltIcon,
  CheckIcon,
  CircleTargetIcon,
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

  return (
    <div className="home-band-stack">
      <PageFlowNav
        eyebrow={homeScrollPlan.eyebrow}
        title={homeScrollPlan.title}
        description={homeScrollPlan.description}
        items={homeScrollPlan.items}
        className="home-band home-band--flow"
        compact={true}
        actions={(
          <>
            <Link href={workspaceModel.workspaceActions.auditHref as Route} className="weather-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              <AuditIcon className="h-3.5 w-3.5" />
              <span>See why this call changed</span>
            </Link>
            <Link href={workspaceModel.workspaceActions.operationsHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Open execution guardrails</span>
            </Link>
          </>
        )}
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
            <>
              <Link href={"/signals" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                <TrendUpIcon className="h-3.5 w-3.5" />
                <span>Review full evidence</span>
              </Link>
              <Link href={"/method" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                <ShieldIcon className="h-3.5 w-3.5" />
                <span>Open trust details</span>
              </Link>
              <Link href={"/sources" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                <DocumentIcon className="h-3.5 w-3.5" />
                <span>Open sources</span>
              </Link>
            </>
          )}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <CanonicalTrustModule
            tone={workspaceModel.audit.trustStatusTone}
            label={workspaceModel.audit.trustStatusLabel}
            detail={workspaceModel.audit.trustStatusDetail}
            action={workspaceModel.audit.trustStatusAction}
            sourceDetails={(
              <div className="space-y-2 text-xs text-slate-200">
                <p><span className="font-semibold text-slate-100">Freshness:</span> {workspaceModel.audit.freshnessSummary}</p>
                <p><span className="font-semibold text-slate-100">Source coverage:</span> {workspaceModel.audit.sourceCoverageLine}</p>
                {workspaceModel.audit.sourceRows.length > 0 ? (
                  <div className="space-y-1">
                    {workspaceModel.audit.sourceRows.map((row) => (
                      <p key={row.sourceName}>
                        <span className="font-semibold text-slate-100">{row.sourceName}:</span> {row.modeLabel} · {row.freshnessStatus}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>No per-source freshness rows are available for this refresh.</p>
                )}
              </div>
            )}
          />

          <div className="weather-list-stagger grid gap-3">
            <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
              <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="What changed in the decision" accentClass="text-sky-200" />
              <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
              <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.revisitDetail}</p>
            </article>
            <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
              <CardEyebrow icon={<CircleTargetIcon className="h-3.5 w-3.5" />} label="What would change this call" accentClass="text-amber-200" />
              <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.flipHeadline}</p>
              <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.flipDetail}</p>
            </article>
          </div>
        </div>

        <div className="weather-list-stagger grid gap-3 md:grid-cols-3">
          {workspaceModel.audit.evidenceMovers.length > 0 ? (
            workspaceModel.audit.evidenceMovers.map((item, index) => (
              <article key={item.key} className="home-band-card weather-surface weather-delta-card rounded-xl p-3" data-emphasis={index === 0 ? "true" : undefined}>
                <CardEyebrow icon={<TrendUpIcon className="h-3.5 w-3.5" />} label={`Mover ${index + 1}`} accentClass="text-emerald-200" />
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </article>
            ))
          ) : (
            <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3 md:col-span-3">
              <CardEyebrow icon={<TrendUpIcon className="h-3.5 w-3.5" />} label="Evidence movers" accentClass="text-emerald-200" />
              <p className="mt-2 text-sm text-slate-300">No major evidence movers were recorded for this refresh. Hold the current weekly baseline unless a trust warning or flip condition fires.</p>
            </article>
          )}
        </div>
      </section>

      <section id="historical-replay-workspace" className="home-band home-band--history home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="historical-replay-workspace-title">
        <HomeBandHeader
          step="02"
          kicker="Historical replay"
          title="Compare this week's live call with a prior baseline before you lock the plan."
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

      <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
        <HomeBandHeader
          step="03"
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
            <CardEyebrow icon={<DocumentIcon className="h-3.5 w-3.5" />} label="Export handoff" accentClass="text-sky-200" />
            <p className="mt-2 text-sm font-semibold text-slate-100">Share the aligned brief only after the plan and finance posture are set.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaceModel.operations.exportActions.map((action) => (
                <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                  <DocumentIcon className="h-3.5 w-3.5" />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Top guardrails" accentClass="text-amber-200" />
            <ul className="mt-3 space-y-2">
              {workspaceModel.operations.topGuardrails.map((item) => (
                <li key={item.key} className="home-band-list-item rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <CardEyebrow icon={<TrendUpIcon className="h-3.5 w-3.5" />} label="Finance snapshot" accentClass="text-sky-200" />
            <ul className="mt-3 space-y-2">
              {workspaceModel.operations.financeSnapshot.map((item) => (
                <li key={item.key} className="home-band-list-item rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.actionNow}</p>
                  <p className="mt-1 text-xs text-slate-400">Reverse: {item.reversalCondition}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="translate-or-run-tool" className="home-band home-band--translate home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="translate-or-run-tool-title">
        <HomeBandHeader
          step="04"
          kicker="Translate or run a tool"
          title="Choose the role view, situation view, or runnable tool that sharpens this week&apos;s decision."
          description="Start with the route most likely to translate the weekly call into action. Open broader discovery only if the first path does not resolve the decision."
          icon={<LayoutGridIcon className="h-5 w-5 text-amber-100" />}
          toneClass="border-amber-400/40 text-amber-200"
        />

        <div className="weather-list-stagger grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Link href={workspaceModel.translate.rolePath.href as Route} className="home-band-link-card home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3 text-slate-100" data-emphasis="true">
            <CardEyebrow icon={<CheckIcon className="h-3.5 w-3.5" />} label="Recommended role path" accentClass="text-amber-200" />
            <h3 className="mt-2 text-base font-semibold">{workspaceModel.translate.rolePath.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.translate.rolePath.detail}</p>
          </Link>
          <Link href={workspaceModel.translate.situationPath.href as Route} className="home-band-link-card home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
            <CardEyebrow icon={<CircleTargetIcon className="h-3.5 w-3.5" />} label="Recommended situation path" accentClass="text-sky-200" />
            <h3 className="mt-2 text-base font-semibold">{workspaceModel.translate.situationPath.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.translate.situationPath.detail}</p>
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
            <CardEyebrow icon={<LayoutGridIcon className="h-3.5 w-3.5" />} label="Runnable toolkits" accentClass="text-slate-300" />
            <div className="mt-3 grid gap-2">
              {workspaceModel.translate.toolkitShortcuts.map((toolkit) => (
                <Link key={toolkit.href} href={toolkit.href as Route} className="home-band-link-card rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-3 text-slate-100">
                  <p className="text-xs font-semibold text-slate-100">{toolkit.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{toolkit.detail}</p>
                </Link>
              ))}
            </div>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
            <CardEyebrow icon={<CircleTargetIcon className="h-3.5 w-3.5" />} label="Decision utilities" accentClass="text-sky-200" />
            <div className="mt-3 grid gap-2">
              {workspaceModel.translate.decisionUtilities.map((action) => (
                <Link key={action.href} href={action.href as Route} className="home-band-link-card rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-3 text-slate-100">
                  <p className="text-xs font-semibold text-slate-100">{action.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{action.detail}</p>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaceModel.translate.browseActions.map((action) => (
                <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
