import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";
import { homeScrollPlan } from "../../../lib/navigation/scrollPlans";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { HistoricalReplayDatePicker } from "../../signals/components/historicalReplayDatePicker";
import { CanonicalTrustModule } from "../canonicalTrustModule";
import { PageFlowNav } from "../pageFlowNav";

type HomeWorkspaceBandsProps = {
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
};

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
            <a href={workspaceModel.workspaceActions.auditHref} className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              See why this call changed
            </a>
            <a href={workspaceModel.workspaceActions.operationsHref} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Open execution guardrails
            </a>
          </>
        )}
      />

      <section id="audit-this-call" className="home-band home-band--audit home-band-shell weather-panel weather-section-stage weather-section-stage--short scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="audit-this-call-title">
        <div className="home-band-shell__header flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="home-band-step">01</span>
              <p className="home-band-kicker">Why this call</p>
            </div>
            <h2 id="audit-this-call-title" className="text-xl font-semibold text-slate-100">See what changed, then pressure-test the call with trust and evidence.</h2>
            <p className="max-w-3xl text-sm text-slate-300">Start with the weekly delta and reversal cue, then inspect freshness, source coverage, and evidence movers before you change pace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={"/signals" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              Review full evidence
            </Link>
            <Link href={"/method" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open trust details
            </Link>
            <Link href={"/sources" as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open sources
            </Link>
          </div>
        </div>

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
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">What changed in the decision</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
              <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.revisitDetail}</p>
            </article>
            <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">What would change this call</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.flipHeadline}</p>
              <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.flipDetail}</p>
            </article>
          </div>
        </div>

        <div className="weather-list-stagger grid gap-3 md:grid-cols-3">
          {workspaceModel.audit.evidenceMovers.length > 0 ? (
            workspaceModel.audit.evidenceMovers.map((item, index) => (
              <article key={item.key} className="home-band-card weather-surface weather-delta-card rounded-xl p-3" data-emphasis={index === 0 ? "true" : undefined}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Mover {index + 1}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </article>
            ))
          ) : (
            <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3 md:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Evidence movers</p>
              <p className="mt-2 text-sm text-slate-300">No major evidence movers were recorded for this refresh. Hold the current weekly baseline unless a trust warning or flip condition fires.</p>
            </article>
          )}
        </div>
      </section>

      <section id="approve-this-weeks-plan" className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="approve-this-weeks-plan-title">
        <div className="home-band-shell__header flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="home-band-step">02</span>
              <p className="home-band-kicker">Execution guardrails</p>
            </div>
            <h2 id="approve-this-weeks-plan-title" className="text-xl font-semibold text-slate-100">Lock the operating summary here, then open Operations only for execution detail.</h2>
            <p className="max-w-3xl text-sm text-slate-300">This band compresses the weekly do now, top guardrails, finance posture, and share handoff after you review the call.</p>
          </div>
          <Link href={workspaceModel.operations.continueHref as Route} className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Continue in Operations
          </Link>
        </div>

        <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Weekly operating action</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.operations.approvalHeadline}</p>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.operations.approvalDetail}</p>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Export handoff</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">Share the aligned brief only after the plan and finance posture are set.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaceModel.operations.exportActions.map((action) => (
                <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Top guardrails</p>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Finance snapshot</p>
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

      <section id="historical-replay-workspace" className="home-band home-band--history home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="historical-replay-workspace-title">
        <div className="home-band-shell__header space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="home-band-step">03</span>
            <p className="home-band-kicker">Historical replay</p>
          </div>
          <h2 id="historical-replay-workspace-title" className="text-xl font-semibold text-slate-100">Replay any prior month after you lock this week&apos;s live call.</h2>
          <p className="max-w-3xl text-sm text-slate-300">Use the same replay pattern as Signals when you want context, retrospectives, or a quick comparison to prior conditions.</p>
        </div>

        <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Replay a prior monthly snapshot</p>
            <div className="mt-3">
              <HistoricalReplayDatePicker
                initialDate={workspaceModel.replay.initialDate}
                forceAdvanced={false}
                submitHash="#historical-replay-workspace"
                submitLabel="Replay on home"
              />
            </div>
            <p className="mt-3 text-sm text-slate-300">{workspaceModel.replay.summary}</p>
            <div className="mt-3">
              <Link href={workspaceModel.replay.openFullHref as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
                Open full time machine
              </Link>
            </div>
          </article>

          <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">What this looked like then</p>
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

      <section id="translate-or-run-tool" className="home-band home-band--translate home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="translate-or-run-tool-title">
        <div className="home-band-shell__header space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="home-band-step">04</span>
            <p className="home-band-kicker">Translate or run a tool</p>
          </div>
          <h2 id="translate-or-run-tool-title" className="text-xl font-semibold text-slate-100">Go straight to a role path, situation path, or runnable utility.</h2>
          <p className="max-w-3xl text-sm text-slate-300">Use fast paths first. Browse role and situation hubs only when you need fuller discovery.</p>
        </div>

        <div className="weather-list-stagger grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Link href={workspaceModel.translate.rolePath.href as Route} className="home-band-link-card home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3 text-slate-100" data-emphasis="true">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recommended role path</p>
            <h3 className="mt-2 text-base font-semibold">{workspaceModel.translate.rolePath.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.translate.rolePath.detail}</p>
          </Link>
          <Link href={workspaceModel.translate.situationPath.href as Route} className="home-band-link-card home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recommended situation path</p>
            <h3 className="mt-2 text-base font-semibold">{workspaceModel.translate.situationPath.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{workspaceModel.translate.situationPath.detail}</p>
          </Link>
        </div>

        <div className="weather-list-stagger grid gap-3 md:grid-cols-3">
          {workspaceModel.translate.toolkitShortcuts.map((toolkit) => (
            <Link key={toolkit.href} href={toolkit.href as Route} className="home-band-link-card home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Toolkit shortcut</p>
              <h3 className="mt-2 text-base font-semibold">{toolkit.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{toolkit.detail}</p>
            </Link>
          ))}
        </div>

        <div className="weather-list-stagger grid gap-3 md:grid-cols-2">
          {workspaceModel.translate.decisionUtilities.map((utility) => (
            <Link key={utility.href} href={utility.href as Route} className="home-band-link-card home-band-card weather-surface weather-delta-card rounded-xl p-3 text-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Decision utility</p>
              <h3 className="mt-2 text-base font-semibold">{utility.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{utility.detail}</p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {workspaceModel.translate.browseActions.map((action) => (
            <Link key={action.href} href={action.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
