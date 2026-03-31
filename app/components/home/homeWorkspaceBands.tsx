import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
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
      <OperationsBandSection workspaceModel={workspaceModel} />
      <section className="space-y-4 lg:hidden" aria-label="Follow-on surfaces">
        <details className="weather-auto-chevron rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3">
          <summary className="cursor-pointer text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Proof
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-100">
              Open Evidence or Trust only for exceptions.
            </span>
          </summary>
          <div className="mt-4">
            <AuditBandSection workspaceModel={workspaceModel} />
          </div>
        </details>

        <details className="weather-auto-chevron rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3">
          <summary className="cursor-pointer text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Follow-up
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-100">
              Open one follow-on surface only if needed.
            </span>
          </summary>
          <div className="mt-4">
            <CadenceBandSection workspaceModel={workspaceModel} />
          </div>
        </details>
      </section>

      <div className="hidden lg:contents">
        <AuditBandSection workspaceModel={workspaceModel} />
        <CadenceBandSection workspaceModel={workspaceModel} />
      </div>
    </div>
  );
}
