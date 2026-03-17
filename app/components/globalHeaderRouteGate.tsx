"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";

const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export function GlobalHeaderRouteGate({ children }: { children: ReactNode }) {
  const pathname = normalizePathname(usePathname() ?? "/");

  if (reportShellCorePaths.some((route) => route === pathname)) {
    return null;
  }

  return <>{children}</>;
}
