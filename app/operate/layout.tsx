import type { ReactNode } from "react";

/* PremiumFunnelTracker used to mount here, which scoped funnel telemetry to /operate and
   left the acquisition surface (/) unmeasured. It now mounts once in app/layout.tsx —
   mounting it in both places would attach two document listeners and double-count every
   click under this route. */
export default function OperationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
