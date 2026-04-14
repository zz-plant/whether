import Link from "next/link";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import type { Route } from "../../../lib/navigation/routeType";
import {
  AuditIcon,
  CheckIcon,
  HistoryIcon,
  LayoutGridIcon,
  ShieldIcon,
  TrendUpIcon,
} from "../uiIcons";

type HomeWorkspaceBandsProps = {
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
};

export async function HomeWorkspaceBands({
  workspaceModelPromise,
}: HomeWorkspaceBandsProps) {
  const workspaceModel = await workspaceModelPromise;
  const primaryGuardrail = workspaceModel.operations.topGuardrails[0];
  const primaryExportAction = workspaceModel.operations.exportActions[0];
  const replayPreview = workspaceModel.replay.preview[0];
  const toolkitShortcut = workspaceModel.translate.toolkitShortcuts[0];

  return (
    <div className="space-y-6">
      <section
        id="approve-this-weeks-plan"
        className="weather-panel scroll-mt-28 space-y-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
        aria-labelledby="approve-this-weeks-plan-title"
      >
        <div className="weather-panel-header">
          <div className="weather-panel-header-copy">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Next</p>
            <h2 id="approve-this-weeks-plan-title" className="weather-panel-header-title text-lg font-semibold text-slate-100">
              Turn the call into this week&apos;s plan
            </h2>
            <p className="weather-panel-header-description text-sm text-slate-300">
              Approve one plan, keep one stop line visible, and open the share brief only after the week&apos;s call is settled.
            </p>
          </div>
          <div className="weather-panel-header-aside">
            <Link
              href={workspaceModel.operations.continueHref as Route}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Make the plan</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.78fr)]">
          <article className="weather-surface rounded-[1.2rem] border border-emerald-400/20 bg-emerald-500/8 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Approve now</span>
            </div>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-100">
              {workspaceModel.operations.approvalHeadline}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {workspaceModel.operations.approvalDetail}
            </p>
          </article>

          <article className="weather-surface rounded-[1.2rem] border border-amber-400/20 bg-amber-500/8 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              <ShieldIcon className="h-3.5 w-3.5" />
              <span>Stop line</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">
              {primaryGuardrail?.label ?? "Hold the current baseline"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {primaryGuardrail?.detail ?? "Do not loosen until the current stop line clears."}
            </p>
          </article>

          <article className="weather-surface rounded-[1.2rem] border border-sky-400/18 bg-sky-500/8 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Share next</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">
              {primaryExportAction?.label ?? "Open share brief"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Package the approved call only after the week&apos;s plan is settled.
            </p>
            <Link
              href={(primaryExportAction?.href ?? "/operations#ops-export-briefs") as Route}
              className="mt-3 inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-100 underline decoration-sky-400/45 underline-offset-4"
            >
              Open share brief
            </Link>
          </article>
        </div>
      </section>

      <section
        id="audit-this-call"
        className="weather-panel scroll-mt-28 space-y-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
        aria-labelledby="audit-this-call-title"
      >
        <div className="weather-panel-header">
          <div className="weather-panel-header-copy">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Only if challenged</p>
            <h2 id="audit-this-call-title" className="weather-panel-header-title text-lg font-semibold text-slate-100">
              Need proof or another path?
            </h2>
            <p className="weather-panel-header-description text-sm text-slate-300">
              Open these only when someone still needs the drivers, trust check, or one deeper tool after the weekly call is already clear.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Link
            href={"/signals#decision-summary" as Route}
            className="weather-route-card group min-h-[44px] px-4 py-4 text-slate-100"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
              <TrendUpIcon className="h-3.5 w-3.5" />
              <span>See what changed</span>
            </div>
            <p className="mt-3 text-sm font-semibold group-hover:text-sky-100">Why the read moved</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {workspaceModel.audit.evidenceMovers[0]?.detail ?? "See drivers, thresholds, and replay before changing the call."}
            </p>
          </Link>

          <Link
            href={"/method#trust-snapshot" as Route}
            className="weather-route-card group min-h-[44px] px-4 py-4 text-slate-100"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              <AuditIcon className="h-3.5 w-3.5" />
              <span>Check trust</span>
            </div>
            <p className="mt-3 text-sm font-semibold group-hover:text-amber-100">{workspaceModel.audit.trustStatusAction}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {workspaceModel.audit.trustMarkerDetail}
            </p>
          </Link>
        </div>

        <div id="historical-replay-workspace" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">
            One deeper path
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <Link
              href={workspaceModel.translate.primaryPath.href as Route}
              className="weather-route-card group min-h-[44px] px-4 py-4 text-slate-100"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>Resolve one question</span>
              </div>
              <p className="mt-3 text-sm font-semibold group-hover:text-amber-100">Open the most concrete path first</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Use this only after the weekly call is clear.</p>
            </Link>

            <Link
              href={workspaceModel.replay.openFullHref as Route}
              className="weather-route-card group min-h-[44px] px-4 py-4 text-slate-100"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">
                <HistoryIcon className="h-3.5 w-3.5" />
                <span>Review a past week</span>
              </div>
              <p className="mt-3 text-sm font-semibold group-hover:text-violet-100">
                {replayPreview?.label ?? "Replay the baseline"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {replayPreview?.summary ?? workspaceModel.replay.summary}
              </p>
            </Link>

            <Link
              href={(toolkitShortcut?.href ?? workspaceModel.translate.fallbackUtility.href) as Route}
              className="weather-route-card group min-h-[44px] px-4 py-4 text-slate-100"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>Use a tool</span>
              </div>
              <p className="mt-3 text-sm font-semibold group-hover:text-slate-50">
                {toolkitShortcut?.title ?? workspaceModel.translate.fallbackUtility.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {toolkitShortcut?.detail ?? workspaceModel.translate.fallbackUtility.detail}
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
