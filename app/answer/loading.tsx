import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading answers"
      description="Resolving this week’s bounded calls for each decision area."
      currentPath="/answer"
      pageTitle="Resolve"
    />
  );
}
