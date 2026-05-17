import Link from "next/link";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import type { Route } from "../../../lib/navigation/routeType";
import { CheckIcon } from "../uiIcons";

type HomeWorkspaceBandsProps = {
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
};

export async function HomeWorkspaceBands({
  workspaceModelPromise,
}: HomeWorkspaceBandsProps) {
  const workspaceModel = await workspaceModelPromise;
  const primaryGuardrail = workspaceModel.operations.topGuardrails[0];
  const primaryExportAction = workspaceModel.operations.exportActions[0];

  return (
    <div className="space-y-5">
      <details
        id="approve-this-weeks-plan"
        className="weather-surface-secondary scroll-mt-28 px-4 py-4 sm:px-5 sm:py-5 [&>summary]:flex [&>summary]:items-center [&>summary]:justify-between [&>summary]:cursor-pointer sm:[&>summary]:cursor-default sm:[&>summary]:list-none"
        aria-labelledby="approve-this-weeks-plan-title"
        open={true}
      >
      <summary className="sm:hidden text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
        <span>Workspace tools</span>
        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-fluid-micro text-slate-500 sm:hidden" aria-hidden="true">▾</span>
      </summary>
      <div className="space-y-4">
        <div className="weather-panel-header">
          <div className="weather-panel-header-copy">
            <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Next step</p>
            <h2 id="approve-this-weeks-plan-title" className="weather-panel-header-title text-lg font-semibold text-slate-100">
              Turn this read into this week&apos;s plan
            </h2>
            <p className="weather-panel-header-description text-sm text-slate-300">
              Open Planning to turn the weekly call into approvals and share-ready decisions.
            </p>
          </div>
        </div>

        <article className="weather-ritual-card px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="max-w-3xl space-y-2">
                <div className="flex items-center gap-2 text-fluid-xs font-medium text-sky-200">
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>Main planning path</span>
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
              className="weather-button-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold tracking-[0.04em]"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              <span>Open weekly plan</span>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="weather-transmission-segment px-3 py-3">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Pause first</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {primaryGuardrail?.label ?? "Hold the current baseline"}
              </p>
            </div>
            <div className="weather-transmission-segment px-3 py-3">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Send next</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {primaryExportAction?.label ?? "Open share brief"}
              </p>
            </div>
          </div>
        </article>
      </div>
    </details>
    </div>
  );
}
