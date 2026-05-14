import type { ReactNode } from "react";
import { PremiumFunnelTracker } from "../components/premiumFunnelTracker";
import { ToastProviderRoot } from "../components/toastProviderRoot";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProviderRoot>
      <PremiumFunnelTracker />
      {children}
    </ToastProviderRoot>
  );
}
