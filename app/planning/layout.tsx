import type { ReactNode } from "react";
import { PremiumFunnelTracker } from "../components/premiumFunnelTracker";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PremiumFunnelTracker />
      {children}
    </>
  );
}
