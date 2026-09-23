import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading evidence"
      description="Checking what changed and why conditions moved."
      currentPath="/signals"
      pageTitle="Evidence"
    />
  );
}
