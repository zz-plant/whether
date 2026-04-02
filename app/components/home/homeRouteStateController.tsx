"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabValues = ["brief", "revisit", "workspace"] as const;
const focusValues = ["all", "decision", "risk"] as const;
const detailValues = ["compact", "full"] as const;
const panelValues = ["none", "share"] as const;

export type HomeRouteTab = (typeof tabValues)[number];
export type HomeRouteFocus = (typeof focusValues)[number];
export type HomeRouteDetail = (typeof detailValues)[number];
export type HomeRoutePanel = (typeof panelValues)[number];

export type HomeRouteUiState = {
  tab: HomeRouteTab;
  focus: HomeRouteFocus;
  detail: HomeRouteDetail;
  panel: HomeRoutePanel;
};

export const defaultHomeRouteUiState: HomeRouteUiState = {
  tab: "brief",
  focus: "all",
  detail: "compact",
  panel: "none",
};

const isOneOf = <T extends readonly string[]>(value: string | null, options: T): value is T[number] =>
  Boolean(value) && options.includes(value as T[number]);

export const resolveHomeRouteUiState = (searchParams: URLSearchParams): { state: HomeRouteUiState; normalized: boolean } => {
  const requestedTab = searchParams.get("tab");
  const requestedFocus = searchParams.get("focus");
  const requestedDetail = searchParams.get("detail");
  const requestedPanel = searchParams.get("panel");

  const state: HomeRouteUiState = {
    tab: isOneOf(requestedTab, tabValues) ? requestedTab : defaultHomeRouteUiState.tab,
    focus: isOneOf(requestedFocus, focusValues) ? requestedFocus : defaultHomeRouteUiState.focus,
    detail: isOneOf(requestedDetail, detailValues) ? requestedDetail : defaultHomeRouteUiState.detail,
    panel: isOneOf(requestedPanel, panelValues) ? requestedPanel : defaultHomeRouteUiState.panel,
  };

  const normalized =
    (requestedTab !== null && requestedTab !== state.tab)
    || (requestedFocus !== null && requestedFocus !== state.focus)
    || (requestedDetail !== null && requestedDetail !== state.detail)
    || (requestedPanel !== null && requestedPanel !== state.panel);

  return { state, normalized };
};

export const buildHomeRouteUiHref = (pathname: string, state: HomeRouteUiState) => {
  const params = new URLSearchParams();

  if (state.tab !== defaultHomeRouteUiState.tab) {
    params.set("tab", state.tab);
  }
  if (state.focus !== defaultHomeRouteUiState.focus) {
    params.set("focus", state.focus);
  }
  if (state.detail !== defaultHomeRouteUiState.detail) {
    params.set("detail", state.detail);
  }
  if (state.panel !== defaultHomeRouteUiState.panel) {
    params.set("panel", state.panel);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const determineHistoryIntent = (current: HomeRouteUiState, next: HomeRouteUiState) => {
  if (
    current.tab === next.tab
    && current.focus === next.focus
    && current.detail === next.detail
    && current.panel === next.panel
  ) {
    return "none" as const;
  }

  if (current.detail !== next.detail && current.tab === next.tab && current.focus === next.focus && current.panel === next.panel) {
    return "replace" as const;
  }

  return "push" as const;
};

type HomeRouteStateControllerProps = {
  whatChangedSection: ReactNode;
  revisitFlipSection: ReactNode;
  workspaceSection: ReactNode;
  faqSection: ReactNode;
  hasRevisitSection: boolean;
};

export function HomeRouteStateController({
  whatChangedSection,
  revisitFlipSection,
  workspaceSection,
  faqSection,
  hasRevisitSection,
}: HomeRouteStateControllerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFromUrl = useMemo(() => resolveHomeRouteUiState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [uiState, setUiState] = useState<HomeRouteUiState>(parsedFromUrl.state);
  const availableTabs = hasRevisitSection ? tabValues : tabValues.filter((tab) => tab !== "revisit");
  const resolvedUiState = useMemo<HomeRouteUiState>(() => {
    if (!hasRevisitSection && parsedFromUrl.state.tab === "revisit") {
      return {
        ...parsedFromUrl.state,
        tab: "brief",
      };
    }

    return parsedFromUrl.state;
  }, [hasRevisitSection, parsedFromUrl.state]);

  useEffect(() => {
    setUiState(resolvedUiState);

    if (!parsedFromUrl.normalized && resolvedUiState === parsedFromUrl.state) {
      return;
    }

    router.replace(buildHomeRouteUiHref(pathname, resolvedUiState), { scroll: false });
  }, [parsedFromUrl.normalized, parsedFromUrl.state, pathname, resolvedUiState, router]);

  const commitState = (next: HomeRouteUiState) => {
    const intent = determineHistoryIntent(uiState, next);
    const href = buildHomeRouteUiHref(pathname, next);

    if (intent === "none") {
      return;
    }

    if (intent === "replace") {
      setUiState(next);
      router.replace(href, { scroll: false });
      return;
    }

    setUiState(next);
    router.push(href, { scroll: false });
  };

  const tabLabels: Record<HomeRouteTab, string> = {
    brief: "Weekly brief",
    revisit: "Revisit decisions",
    workspace: "Workspace",
  };

  const detailLabels: Record<HomeRouteDetail, string> = {
    compact: "Compact",
    full: "Full context",
  };

  return (
    <>
      <section className="weather-panel space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-label="Brief navigator">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workflow navigator</p>
          <h2 className="text-sm font-semibold text-slate-100">Choose the path that matches what you need next.</h2>
          <p className="text-sm text-slate-300">Each control updates the URL so the current view can be shared, refreshed, or revisited without losing state.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Section selector">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold tracking-[0.08em] ${uiState.tab === tab ? "border-sky-300/80 text-slate-100" : "text-slate-300"}`}
              aria-pressed={uiState.tab === tab}
              onClick={() => commitState({ ...uiState, tab, panel: "none" })}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="View controls">
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-300"
            onClick={() => commitState({ ...uiState, detail: uiState.detail === "compact" ? "full" : "compact" })}
          >
            {detailLabels[uiState.detail]}
          </button>
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-300"
            onClick={() => commitState({ ...uiState, panel: uiState.panel === "share" ? "none" : "share" })}
          >
            {uiState.panel === "share" ? "Hide share help" : "Show share help"}
          </button>
        </div>
      </section>

      {uiState.tab === "brief" ? whatChangedSection : null}
      {uiState.tab === "revisit" && hasRevisitSection ? revisitFlipSection : null}
      {uiState.tab === "workspace" ? workspaceSection : null}
      {uiState.detail === "full" ? faqSection : null}

      {uiState.panel === "share" ? (
        <section
          aria-label="Share this view"
          className="weather-panel space-y-2 border-sky-400/40 bg-sky-500/10 px-4 py-4 sm:px-5 sm:py-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Share this view</p>
          <p className="text-sm text-slate-200">The current URL already captures the selected path. Copy it from the browser bar to share this exact navigator state.</p>
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"
            onClick={() => commitState({ ...uiState, panel: "none" })}
          >
            Hide share help
          </button>
        </section>
      ) : null}
    </>
  );
}
