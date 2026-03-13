import Link from "next/link";
import { headers } from "next/headers";
import { navigationGroupLabels, navigationLayers } from "../../lib/navigation/informationArchitecture";
import { reportShellCorePaths } from "../../lib/report/reportNavigation";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderTaglineClient } from "./globalHeaderTaglineClient";
import { ThemeToggleButton } from "./themeToggleButton";

function normalizePathname(pathname: string) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export async function GlobalHeader() {
  const requestHeaders = await headers();
  const pathname = normalizePathname(requestHeaders.get("x-whether-pathname") ?? "/");
  const isReportShellRoute = reportShellCorePaths.some((route) => route === pathname);

  if (isReportShellRoute) {
    return null;
  }

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="weather-appbar px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
            >
              Whether
            </Link>
            <GlobalHeaderTaglineClient />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.08em]"
              aria-label="Open global search"
            >
              Search
            </Link>
            <ThemeToggleButton />
          </div>
        </div>

        <nav aria-label="Global navigation" className="mt-4">
          <GlobalHeaderNavClient
            navigationLinks={navigationLayers}
            groupLabels={navigationGroupLabels}
          />
        </nav>
      </div>
    </header>
  );
}
