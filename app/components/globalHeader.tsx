import Link from "next/link";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderRouteGate } from "./globalHeaderRouteGate";
import { GlobalHeaderTaglineClient } from "./globalHeaderTaglineClient";
import { ThemeToggleButton } from "./themeToggleButton";
import { GLOBAL_HEADER_BRAND_LINK_CLASSNAME } from "./globalHeaderShared";
import { GlobalHeaderSearchForm } from "./globalHeaderSearchForm";

export async function GlobalHeader() {
  return (
    <GlobalHeaderRouteGate
      defaultHeader={(
        <header className="mx-auto w-full max-w-[88rem] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="weather-appbar weather-topbar px-4 py-4 sm:px-6 sm:py-5">
            <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)] xl:items-start">
              <div className="min-w-0 space-y-3.5">
                <Link
                  href="/"
                  className={GLOBAL_HEADER_BRAND_LINK_CLASSNAME}
                >
                  Whether
                </Link>
                <div className="max-w-2xl">
                  <GlobalHeaderTaglineClient />
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <GlobalHeaderSearchForm className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,16rem)_auto] sm:items-center" />
                <ThemeToggleButton />
              </div>
            </div>

            <nav aria-label="Global navigation" className="relative mt-5">
              <GlobalHeaderNavClient />
            </nav>
          </div>
        </header>
      )}
    />
  );
}
