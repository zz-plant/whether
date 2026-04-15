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
  const deeperPaths = [
    {
      href: workspaceModel.translate.primaryPath.href as Route,
      kicker: "Resolve one question",
      title: "Open the most concrete path first",
      detail: "Use this only after the weekly call is clear.",
      icon: <LayoutGridIcon className="h-3.5 w-3.5" />,
      toneClass: "text-amber-200",
      hoverClass: "hover:border-amber-300/35",
    },
    {
      href: workspaceModel.replay.openFullHref as Route,
      kicker: "Review a past week",
      title: replayPreview?.label ?? "Replay the baseline",
      detail: replayPreview?.summary ?? workspaceModel.replay.summary,
      icon: <HistoryIcon className="h-3.5 w-3.5" />,
      toneClass: "text-violet-200",
      hoverClass: "hover:border-violet-300/35",
    },
    {
      href: (toolkitShortcut?.href ?? workspaceModel.translate.fallbackUtility.href) as Route,
      kicker: "Use a tool",
      title: toolkitShortcut?.title ?? workspaceModel.translate.fallbackUtility.title,
      detail: toolkitShortcut?.detail ?? workspaceModel.translate.fallbackUtility.detail,
      icon: <LayoutGridIcon className="h-3.5 w-3.5" />,
      toneClass: "text-slate-300",
      hoverClass: "hover:border-slate-500/55",
    },
  ] as const;

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
        </div>

        <article className="weather-ritual-card px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-200">
                <CheckIcon className="h-3.5 w-3.5" />
                <span>Primary approval lane</span>
              </div>
              <p className="text-base font-semibold leading-7 text-slate-100">
                {workspaceModel.operations.approvalHeadline}
              </p>
              <p className="text-sm leading-6 text-slate-300">
                {workspaceModel.operations.approvalDetail}
              </p>
            </div>

            <Link
              href={workspaceModel.operations.continueHref as Route}
              className="weather-button-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[0.95rem] px-5 py-2.5 text-sm font-semibold tracking-[0.04em]"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Make the plan</span>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
          </div>
          <details
            id="audit-this-call"
            className="weather-auto-chevron mt-4 rounded-[1rem] border border-slate-800/60 bg-slate-950/28 px-4 py-3"
          >
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-left">
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-sky-200">Only if challenged</span>
                <span className="mt-1 block text-sm font-semibold text-slate-100">Challenge the call with one check.</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">Open one proof path, not a second dashboard.</span>
              </span>
              <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Optional
              </span>
            </summary>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Link
                href={"/signals#decision-summary" as Route}
                className="rounded-[0.95rem] border border-slate-800/60 bg-slate-950/38 px-3 py-3 text-slate-100 transition-colors hover:border-sky-400/45 hover:bg-slate-950/55"
              >
                <div className="flex items-center gap-2 text-[11px] font-medium text-sky-200">
                  <TrendUpIcon className="h-3.5 w-3.5" />
                  <span>See what changed</span>
                </div>
                <p className="mt-2 text-sm font-semibold">Why the read moved</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  {workspaceModel.audit.evidenceMovers[0]?.detail ?? "See drivers, thresholds, and replay when you need to challenge the call."}
                </p>
              </Link>

              <Link
                href={"/method#trust-snapshot" as Route}
                className="rounded-[0.95rem] border border-slate-800/60 bg-slate-950/38 px-3 py-3 text-slate-100 transition-colors hover:border-amber-400/45 hover:bg-slate-950/55"
              >
                <div className="flex items-center gap-2 text-[11px] font-medium text-amber-200">
                  <AuditIcon className="h-3.5 w-3.5" />
                  <span>Check trust</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{workspaceModel.audit.trustStatusAction}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  {workspaceModel.audit.trustMarkerDetail}
                </p>
              </Link>
            </div>

            <details
              id="historical-replay-workspace"
              className="weather-auto-chevron mt-3 rounded-[1rem] border border-slate-800/60 bg-slate-950/28 px-4 py-3"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-left">
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-violet-200">More paths</span>
                  <span className="mt-1 block text-sm font-semibold text-slate-100">Open a deeper path only if the weekly call is already clear.</span>
                </span>
                <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Optional
                </span>
              </summary>

              <div className="mt-3 space-y-2">
                {deeperPaths.map((path) => (
                  <Link
                    key={`${path.kicker}-${path.href}`}
                    href={path.href}
                    className={`flex items-start justify-between gap-3 rounded-[0.95rem] border border-slate-800/55 bg-slate-950/32 px-3 py-3 text-slate-100 transition-colors ${path.hoverClass}`}
                  >
                    <div className="min-w-0">
                      <div className={`flex items-center gap-2 text-[11px] font-medium ${path.toneClass}`}>
                        {path.icon}
                        <span>{path.kicker}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{path.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{path.detail}</p>
                    </div>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          </details>
        </article>
      </section>
    </div>
  );
}
