import type { ReactNode } from "react";
import { ToastProviderRoot } from "../components/toastProviderRoot";

export default function SignalsLayout({ children }: { children: ReactNode }) {
  return <ToastProviderRoot>{children}</ToastProviderRoot>;
}
