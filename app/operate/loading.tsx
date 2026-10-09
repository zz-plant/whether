import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading the plan"
      description="Turning this week's guidance into rules for hiring, spend and the roadmap."
      currentPath="/operate"
      pageTitle="Decide"
    />
  );
}
