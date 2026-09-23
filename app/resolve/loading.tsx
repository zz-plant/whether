import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading answers"
      description="Resolving this week’s bounded guidance for each decision area."
      currentPath="/resolve"
      pageTitle="Resolve"
    />
  );
}
