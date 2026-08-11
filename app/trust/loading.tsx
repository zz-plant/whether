import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading trust status"
      description="Checking source freshness, confidence, and fallback state."
      currentPath="/trust"
      pageTitle="Trust"
    />
  );
}
