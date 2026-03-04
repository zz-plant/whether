"use client";

import { usePathname } from "next/navigation";
import { GlobalHeader } from "./globalHeader";

const reportShellRoutes = new Set([
  "/",
  "/signals",
  "/evidence",
  "/operations",
]);

export function GlobalHeaderGate() {
  const pathname = usePathname();
  if (pathname && reportShellRoutes.has(pathname)) {
    return null;
  }
  return <GlobalHeader />;
}
