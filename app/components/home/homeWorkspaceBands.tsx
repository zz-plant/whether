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
        className="weather-panel scroll-mt-28 space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6"
        aria-labelledby="approve-this-weeks-plan-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Step 2</p>
            <h2 id="approve-this-weeks-plan-title" className="text-lg font-semibold text-slate-100">
              Turn the call into this week&apos;s plan
            </h2>
            <p className="max-w-2xl text-sm text-slate-300">
              Approve or hold the week&apos;s hiring, spend, and roadmap moves here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={workspaceModel.operations.continueHref as Route}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Make the plan</span>
            </Link>
            {primaryExportAction ? (
              <Link
                href={primaryExportAction.href as Route}
                className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                <span>{primaryExportAction.label}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[1.25rem] border border-slate-800/80 bg-slate-800/80 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.72fr)]">
          <article className="bg-emerald-500/8 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Carry this forward</span>
            </div>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-100">
              {workspaceModel.operations.approvalHeadline}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {workspaceModel.operations.approvalDetail}
            </p>
          </article>

          <article className="bg-slate-950/55 px-4 py-4">
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
        </div>
      </section>

      <section
        id="audit-this-call"
        className="scroll-mt-28 space-y-4 border-t border-slate-800/80 pt-5"
        aria-labelledby="audit-this-call-title"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Step 3</p>
          <h2 id="audit-this-call-title" className="text-lg font-semibold text-slate-100">
            Check the proof only if needed
          </h2>
          <p className="max-w-2xl text-sm text-slate-300">
            Use this when someone needs the drivers, thresholds, or trust check before they approve a move.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[1.15rem] border border-slate-800/80 bg-slate-800/80 lg:grid-cols-2">
          <Link
            href={"/signals" as Route}
            className="group min-h-[44px] bg-slate-950/25 px-4 py-4 text-slate-100 transition hover:bg-slate-950/45"
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
            href={"/method" as Route}
            className="group min-h-[44px] bg-slate-950/25 px-4 py-4 text-slate-100 transition hover:bg-slate-950/45"
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
      </section>

      <section
        id="historical-replay-workspace"
        className="scroll-mt-28 space-y-4 border-t border-slate-800/80 pt-5"
        aria-labelledby="historical-replay-workspace-title"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">Step 4</p>
          <h2 id="historical-replay-workspace-title" className="text-lg font-semibold text-slate-100">
            Open one deeper path
          </h2>
          <p className="max-w-2xl text-sm text-slate-300">
            Use this only when one decision still needs a tighter answer.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[1.15rem] border border-slate-800/80 bg-slate-800/80 lg:grid-cols-3">
          <Link
            href={workspaceModel.translate.primaryPath.href as Route}
            className="group min-h-[44px] bg-slate-950/20 px-4 py-4 text-slate-100 transition hover:bg-slate-950/40"
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
            className="group min-h-[44px] bg-slate-950/20 px-4 py-4 text-slate-100 transition hover:bg-slate-950/40"
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
            className="group min-h-[44px] bg-slate-950/20 px-4 py-4 text-slate-100 transition hover:bg-slate-950/40"
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
      </section>
    </div>
  );
}
