"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  hasVisibleActiveNavLink,
  normalizePathname,
  resolveGlobalHeaderRouteLabel,
} from "../../lib/navigation/globalHeader";
import { useHydrated } from "./browserSource";
import { GlobalHeaderActionsClient } from "./globalHeaderActionsClient";
import { GlobalHeaderNavClient } from "./globalHeaderNavClient";
import { GlobalHeaderScrollWrapper } from "./globalHeaderScrollWrapper";
import { RunwayServerSync } from "./RunwayServerSync";

type GlobalHeaderRouteGateProps = {
  initialPathname?: string;
};

/**
 * One header band on every route: wordmark · group tabs · utility links · actions.
 *
 * Report routes used to get a second shape — a title row carrying a `Weekly
 * Brief` button and a route label, then the six tabs on a row of their own.
 * The button pointed where the `Brief` tab 40px below it already pointed, the
 * label named the route the active tab already named, and the second row
 * existed to hold them. (Reverses the 2026-08-11 "report sub-routes keep the
 * two-band layout" note in docs/one-screen-weekly-brief-spec.md.) The slot
 * beside that button, a `Toolkits` pill, only ever resolved for `/`, which
 * rendered the other shape — it never showed.
 *
 * What still varies by route is small. The sublabel under the wordmark is the
 * route name: shown at every width where no group tab marks the route
 * (`/about`, `/share`, the legal pages), and below `md` everywhere
 * else, because the bottom bar names the group rather than the page. The home
 * brief carries the present-mode toggle, and below `sm` no actions at all; the
 * cadence control that used to sit here belongs to the brief and renders
 * inside the page.
 */
export function GlobalHeaderRouteGate({ initialPathname = "/" }: GlobalHeaderRouteGateProps) {
  const currentPathname = normalizePathname(usePathname() ?? initialPathname);
  /* The server is handed the route it rendered and the router knows the live one,
     and through hydration the two have to agree or React discards the markup. This
     was a `useState(initialPathname)` plus an effect that assigned the router's
     answer on mount; `useHydrated` is the same two renders, stated once. */
  const pathname = useHydrated() ? currentPathname : normalizePathname(initialPathname);

  const isHomeBrief = pathname === "/";
  // Only where the nav row will not mark the route itself. Below `md` the
  // bottom bar names the group, not the page, so the sublabel stays on phones.
  const fallbackRouteLabel = hasVisibleActiveNavLink(pathname)
    ? null
    : resolveGlobalHeaderRouteLabel(pathname);
  const sublabel = fallbackRouteLabel ?? resolveGlobalHeaderRouteLabel(pathname);

  return (
    <GlobalHeaderScrollWrapper>
      {/* Every route has the header, so the runway band's one re-render
          listener lives here rather than beside any one control. */}
      <RunwayServerSync />
      <div className="border-b border-[color:var(--border-subtle)] bg-[var(--bg-body)] md:rounded-b-md">
        {/* px-4 below `md` puts the wordmark on the page's own 16px gutter, under
            the running head's mark and over the content's left edge. */}
        {/* One row at every width. Under 360px it wrapped, which put the share
            and theme cells on a second full-width row and made the header 106px
            of a 640px screen: the wrap dates from the stage and runway pills,
            which left the header on 2026-10-31. The wordmark gives way instead,
            truncating its route name. */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 sm:gap-3 md:px-3">
          {/* `weather-hit-box`: the wordmark and route name are 35px tall, so
              the tap area grows past them to 44px without moving the band. */}
          <Link href="/" className="weather-hit-box flex min-w-0 items-center gap-2.5 no-underline">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 shrink-0">
              <path d="M2 14c3-5 6-5 9 0s6 5 9 0" />
              <circle cx="5" cy="11" r="1.5" fill="currentColor" />
              <circle cx="19" cy="11" r="1.5" fill="currentColor" />
            </svg>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-[family-name:var(--font-display)] text-[1.0625rem] font-extrabold leading-none tracking-[-0.01em] text-white">Whether</span>
              <span className={`truncate text-fluid-nano font-medium text-slate-400 ${fallbackRouteLabel ? "" : "md:hidden"}`}>
                {sublabel}
              </span>
            </div>
          </Link>
          <GlobalHeaderNavClient pathname={pathname} />
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-sky-400">
            {/* The stage and runway pills left the phone header (2026-10-31).
                They existed because the inline calibration was `hidden sm:block`,
                so a phone had no way to answer. The calibration is visible at
                every width now, so the header is brand, nav and search again. */}
            <div className={isHomeBrief ? "hidden sm:block" : undefined}>
              <GlobalHeaderActionsClient showPresentMode={isHomeBrief} />
            </div>
          </div>
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
