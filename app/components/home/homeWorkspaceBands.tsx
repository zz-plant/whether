import Link from "next/link";
import type { Route } from "../../../lib/navigation/routeType";
import { homeScrollPlan } from "../../../lib/navigation/scrollPlans";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { PageFlowNav } from "../pageFlowNav";
import { LayoutGridIcon } from "../uiIcons";
import { AuditBandSection } from "./workspace-bands/auditBandSection";
import { CadenceBandSection } from "./workspace-bands/cadenceBandSection";
import { OperationsBandSection } from "./workspace-bands/operationsBandSection";

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
      />

      <AuditBandSection workspaceModel={workspaceModel} />
      <OperationsBandSection workspaceModel={workspaceModel} />
      <CadenceBandSection workspaceModel={workspaceModel} />

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
            <ButtonLink href="/decide" variant="ghost">
              Open Decide
            </ButtonLink>
            <ActionLink href="/toolkits" className="justify-center px-4 tracking-[0.12em]">
              Browse toolkits
            </ActionLink>
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

          {workspaceModel.translate.decisionUtilities[0] ? (
            <Link href={workspaceModel.translate.decisionUtilities[0].href as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Bounded validation</p>
              <p className="mt-2 text-sm font-semibold">{workspaceModel.translate.decisionUtilities[0].title}</p>
              <p className="mt-1 text-xs text-slate-300">{workspaceModel.translate.decisionUtilities[0].detail}</p>
            </Link>
          ) : null}
        </div>

        {workspaceModel.translate.toolkitShortcuts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {workspaceModel.translate.toolkitShortcuts.map((toolkit) => (
              <ActionLink key={toolkit.href} href={toolkit.href as Route} className="gap-2 text-xs font-semibold tracking-normal">
                <LayoutGridIcon className="h-3.5 w-3.5" />
                <span>{toolkit.title}</span>
              </ActionLink>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
