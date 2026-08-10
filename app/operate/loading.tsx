import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading planning"
      description="Preparing this week’s operating brief and decision tools."
      currentPath="/operate"
      pageTitle="Planning"
    />
  );
}
