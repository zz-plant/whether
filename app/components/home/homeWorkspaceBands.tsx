import Link from "next/link";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import type { Route } from "../../../lib/navigation/routeType";
import {
  AuditIcon,
  CheckIcon,
  HistoryIcon,
  LayoutGridIcon,
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
    <div className="space-y-5">
      <section
        id="approve-this-weeks-plan"
        className="weather-panel scroll-mt-28 space-y-4 px-4 py-4 sm:px-5 sm:py-5"
        aria-labelledby="approve-this-weeks-plan-title"
      >
        <div className="weather-panel-header">
          <div className="weather-panel-header-copy">
            <p className="text-[11px] font-medium text-emerald-200">Next step</p>
            <h2 id="approve-this-weeks-plan-title" className="weather-panel-header-title text-lg font-semibold text-slate-100">
              Turn the call into this week&apos;s plan
            </h2>
            <p className="weather-panel-header-description text-sm text-slate-300">
              Use this only after the weekly call is settled. Keep the rest of the page in support mode.
            </p>
          </div>
          <div className="weather-panel-header-aside">
            <Link
              href={workspaceModel.operations.continueHref as Route}
              className="weather-button-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.04em]"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Make the plan</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <article className="weather-ritual-card px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-200">
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>Approval packet</span>
                </div>
                <p className="text-[11px] leading-5 text-slate-300">
                  Treat the weekly call as the operating boundary, then approve one plan against it.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-200">
                <CheckIcon className="h-3.5 w-3.5" />
                <span>Approve now</span>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                Primary
              </span>
            </div>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-100">
              {workspaceModel.operations.approvalHeadline}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {workspaceModel.operations.approvalDetail}
            </p>
            <div className="mt-4 grid gap-2 lg:grid-cols-3">
              <div className="weather-transmission-segment px-3 py-3">
                <p className="text-[11px] font-medium text-amber-200">Stop line</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {primaryGuardrail?.label ?? "Hold the current baseline"}
                </p>
              </div>
              <div className="weather-transmission-segment px-3 py-3">
                <p className="text-[11px] font-medium text-sky-200">Share next</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {primaryExportAction?.label ?? "Open share brief"}
                </p>
              </div>
              <div className="weather-transmission-segment px-3 py-3">
                <p className="text-[11px] font-medium text-emerald-200">Weekly rhythm</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Approve only the moves this week can support.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="audit-this-call"
        className="scroll-mt-28 space-y-4 rounded-[1rem] border border-slate-800/60 bg-slate-950/18 px-4 py-4 sm:px-5 sm:py-5"
        aria-labelledby="audit-this-call-title"
      >
        <div className="weather-panel-header">
          <div className="weather-panel-header-copy">
            <p className="text-[11px] font-medium text-sky-200">Only if challenged</p>
            <h2 id="audit-this-call-title" className="weather-panel-header-title text-lg font-semibold text-slate-100">
              Need proof or another path?
            </h2>
            <p className="weather-panel-header-description text-sm text-slate-300">
              Keep this row subordinate to the weekly call. Open only when someone still needs proof, trust, or a deeper tool.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href={"/signals#decision-summary" as Route}
            className="weather-route-card weather-route-card-proof group min-h-[44px] rounded-[1rem] border border-slate-800/65 px-4 py-4 text-slate-100"
          >
            <div className="flex items-center gap-2 text-[11px] font-medium text-sky-200">
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
            className="weather-route-card weather-route-card-trust group min-h-[44px] rounded-[1rem] border border-slate-800/65 px-4 py-4 text-slate-100"
          >
            <div className="flex items-center gap-2 text-[11px] font-medium text-amber-200">
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-violet-200">
              One deeper path
            </p>
            <p className="text-[11px] text-slate-400">Open only when the weekly call is already clear.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Link
              href={workspaceModel.translate.primaryPath.href as Route}
              className="weather-route-card weather-route-card-proof group min-h-[44px] rounded-[1rem] border border-slate-800/55 px-4 py-4 text-slate-100 transition-colors hover:border-amber-300/35"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium text-amber-200">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>Resolve one question</span>
              </div>
              <p className="mt-3 text-sm font-semibold group-hover:text-amber-100">Open the most concrete path first</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Use this only after the weekly call is clear.</p>
            </Link>

            <Link
              href={workspaceModel.replay.openFullHref as Route}
              className="weather-route-card weather-route-card-replay group min-h-[44px] rounded-[1rem] border border-slate-800/55 px-4 py-4 text-slate-100 transition-colors hover:border-violet-300/35"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium text-violet-200">
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
              className="weather-route-card weather-route-card-utility group min-h-[44px] rounded-[1rem] border border-slate-800/55 px-4 py-4 text-slate-100 transition-colors hover:border-slate-500/55"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
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
