import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading trust status"
      description="Checking when each source last updated and how sure the reading is."
      currentPath="/trust"
      pageTitle="Trust"
    />
  );
}
