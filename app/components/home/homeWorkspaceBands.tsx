import { homeScrollPlan } from "../../../lib/navigation/scrollPlans";
import type { HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { PageFlowNav } from "../pageFlowNav";
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
    </div>
  );
}
