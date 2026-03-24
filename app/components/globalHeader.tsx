import Link from "next/link";
import { navigationGroupLabels, primaryNavigationLayers } from "../../lib/navigation/informationArchitecture";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderRouteGate } from "./globalHeaderRouteGate";
import { GlobalHeaderTaglineClient } from "./globalHeaderTaglineClient";
import { ThemeToggleButton } from "./themeToggleButton";

export async function GlobalHeader() {
  return (
    <GlobalHeaderRouteGate>
      <header className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="weather-appbar px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0 space-y-3">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
              >
                Whether
              </Link>
              <GlobalHeaderTaglineClient />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
              <Link
                href="/search"
                className="weather-button inline-flex min-h-[44px] w-full items-center justify-center px-3 text-xs font-semibold tracking-[0.02em] sm:w-auto"
                aria-label="Open global search"
              >
                Search
              </Link>
              <ThemeToggleButton />
            </div>
          </div>

          <nav aria-label="Global navigation" className="mt-5">
            <GlobalHeaderNavClient
              navigationLinks={primaryNavigationLayers}
              groupLabels={navigationGroupLabels}
            />
          </nav>
        </div>
      </header>
    </GlobalHeaderRouteGate>
  );
}
