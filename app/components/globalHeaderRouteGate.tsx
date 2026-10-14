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
import { StageDropdownPill } from "./StageDropdownPill";
import { RunwayDropdownPill } from "./RunwayDropdownPill";
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
 * brief carries the phone-only stage pill and the present-mode toggle; the
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
      <div className="rounded-b-md border-b border-white/[0.10] bg-[var(--bg-body)]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 max-[360px]:flex-wrap sm:gap-3">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 no-underline">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400 shrink-0">
              <path d="M2 14c3-5 6-5 9 0s6 5 9 0" />
              <circle cx="5" cy="11" r="1.5" fill="currentColor" />
              <circle cx="19" cy="11" r="1.5" fill="currentColor" />
            </svg>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-white">Whether</span>
              <span className={`truncate text-fluid-nano font-medium text-slate-400 ${fallbackRouteLabel ? "" : "md:hidden"}`}>
                {sublabel}
              </span>
            </div>
          </Link>
          <GlobalHeaderNavClient pathname={pathname} />
          <div className="flex shrink-0 items-center justify-end gap-1.5 max-[360px]:w-full sm:gap-2 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-sky-400 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-sky-400">
            {/* Hidden on a first visit to the folded brief (app/styles/home-flow.css):
                at 375px the two pills wrapped their own labels and truncated the
                name of the page, to offer a stage and a runway the reader had not
                given. Above `sm` the same choices sit in a section the first visit
                folds, so this keeps the two widths alike; "Show the full brief"
                brings both back. */}
            {isHomeBrief ? (
              <div data-first-visit-header-choices="true" className="flex flex-wrap items-center justify-end gap-1 sm:hidden">
                <StageDropdownPill />
                <RunwayDropdownPill />
              </div>
            ) : null}
            <div className={isHomeBrief ? "hidden sm:block" : undefined}>
              <GlobalHeaderActionsClient showPresentMode={isHomeBrief} />
            </div>
          </div>
        </div>
      </div>
    </GlobalHeaderScrollWrapper>
  );
}
