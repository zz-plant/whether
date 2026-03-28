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
      <AuditBandSection workspaceModel={workspaceModel} />
      <CadenceBandSection workspaceModel={workspaceModel} />
    </div>
  );
}
