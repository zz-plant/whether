import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      label="Loading answers"
      description="Loading the answers with this week's guidance."
      currentPath="/answers"
      pageTitle="Answers"
    />
  );
}
