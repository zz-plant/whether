import { RouteLoadingShell } from "../components/routeLoadingShell";

export default function Loading() {
  return (
    <RouteLoadingShell
      currentPath="/trust"
      pageTitle="Can we trust this week's guidance?"
    />
  );
}
