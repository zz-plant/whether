"use client";

import { usePathname } from "next/navigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

export function GlobalHeaderTaglineClient() {
  const pathname = usePathname();
  const isHome = pathMatchesLink("/", pathname);

  if (isHome) {
    return (
      <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
        Startup market weather: weekly posture for hiring, fundraising, and runway.
      </p>
    );
  }

  return (
    <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">
      Operating posture navigation
    </p>
  );
}
