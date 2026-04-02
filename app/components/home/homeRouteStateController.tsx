"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabValues = ["brief", "revisit", "workspace"] as const;
const focusValues = ["all", "decision", "risk"] as const;
const detailValues = ["compact", "full"] as const;
const modalValues = ["none", "share"] as const;

export type HomeRouteTab = (typeof tabValues)[number];
export type HomeRouteFocus = (typeof focusValues)[number];
export type HomeRouteDetail = (typeof detailValues)[number];
export type HomeRouteModal = (typeof modalValues)[number];

export type HomeRouteUiState = {
  tab: HomeRouteTab;
  focus: HomeRouteFocus;
  detail: HomeRouteDetail;
  modal: HomeRouteModal;
};

export const defaultHomeRouteUiState: HomeRouteUiState = {
  tab: "brief",
  focus: "all",
  detail: "compact",
  modal: "none",
};

const isOneOf = <T extends readonly string[]>(value: string | null, options: T): value is T[number] =>
  Boolean(value) && options.includes(value as T[number]);

export const resolveHomeRouteUiState = (searchParams: URLSearchParams): { state: HomeRouteUiState; normalized: boolean } => {
  const requestedTab = searchParams.get("tab");
  const requestedFocus = searchParams.get("focus");
  const requestedDetail = searchParams.get("detail");
  const requestedModal = searchParams.get("modal");

  const state: HomeRouteUiState = {
    tab: isOneOf(requestedTab, tabValues) ? requestedTab : defaultHomeRouteUiState.tab,
    focus: isOneOf(requestedFocus, focusValues) ? requestedFocus : defaultHomeRouteUiState.focus,
    detail: isOneOf(requestedDetail, detailValues) ? requestedDetail : defaultHomeRouteUiState.detail,
    modal: isOneOf(requestedModal, modalValues) ? requestedModal : defaultHomeRouteUiState.modal,
  };

  const normalized =
    (requestedTab !== null && requestedTab !== state.tab)
    || (requestedFocus !== null && requestedFocus !== state.focus)
    || (requestedDetail !== null && requestedDetail !== state.detail)
    || (requestedModal !== null && requestedModal !== state.modal);

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
  if (state.modal !== defaultHomeRouteUiState.modal) {
    params.set("modal", state.modal);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const determineHistoryIntent = (current: HomeRouteUiState, next: HomeRouteUiState) => {
  if (
    current.tab === next.tab
    && current.focus === next.focus
    && current.detail === next.detail
    && current.modal === next.modal
  ) {
    return "none" as const;
  }

  if (current.detail !== next.detail && current.tab === next.tab && current.focus === next.focus && current.modal === next.modal) {
    return "replace" as const;
  }

  return "push" as const;
};

type HomeRouteStateControllerProps = {
  whatChangedSection: ReactNode;
  revisitFlipSection: ReactNode;
  workspaceSection: ReactNode;
  faqSection: ReactNode;
};

export function HomeRouteStateController({
  whatChangedSection,
  revisitFlipSection,
  workspaceSection,
  faqSection,
}: HomeRouteStateControllerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFromUrl = useMemo(() => resolveHomeRouteUiState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [uiState, setUiState] = useState<HomeRouteUiState>(parsedFromUrl.state);

  useEffect(() => {
    setUiState(parsedFromUrl.state);

    if (!parsedFromUrl.normalized) {
      return;
    }

    router.replace(buildHomeRouteUiHref(pathname, parsedFromUrl.state), { scroll: false });
  }, [parsedFromUrl, pathname, router]);

  const commitState = (next: HomeRouteUiState) => {
    setUiState(next);
    const href = buildHomeRouteUiHref(pathname, next);
    const intent = determineHistoryIntent(uiState, next);

    if (intent === "none") {
      return;
    }

    if (intent === "replace") {
      router.replace(href, { scroll: false });
      return;
    }

    router.push(href, { scroll: false });
  };

  return (
    <>
      <section className="weather-panel space-y-3 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-label="Brief controls">
        <div className="flex flex-wrap gap-2" aria-label="Brief tab">
          {tabValues.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${uiState.tab === tab ? "border-sky-300/80 text-slate-100" : "text-slate-300"}`}
              aria-pressed={uiState.tab === tab}
              onClick={() => commitState({ ...uiState, tab, modal: "none" })}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Decision focus filter">
          {focusValues.map((focus) => (
            <button
              key={focus}
              type="button"
              className={`weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${uiState.focus === focus ? "border-cyan-300/80 text-slate-100" : "text-slate-300"}`}
              aria-pressed={uiState.focus === focus}
              onClick={() => commitState({ ...uiState, focus })}
            >
              Focus: {focus}
            </button>
          ))}
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300"
            onClick={() => commitState({ ...uiState, detail: uiState.detail === "compact" ? "full" : "compact" })}
          >
            Detail: {uiState.detail}
          </button>
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300"
            onClick={() => commitState({ ...uiState, modal: uiState.modal === "share" ? "none" : "share" })}
          >
            {uiState.modal === "share" ? "Close share modal" : "Open share modal"}
          </button>
        </div>
      </section>

      {uiState.tab === "brief" ? whatChangedSection : null}
      {uiState.tab === "revisit" ? revisitFlipSection : null}
      {uiState.tab === "workspace" ? workspaceSection : null}
      {uiState.detail === "full" ? faqSection : null}

      {uiState.modal === "share" ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Share brief helper"
          className="weather-panel space-y-2 border-sky-400/40 bg-sky-500/10 px-4 py-4 sm:px-5 sm:py-5"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-sky-200">Share helper</p>
          <p className="text-sm text-slate-200">Use the copy actions in the weekly brief to share the current state with this exact URL.</p>
          <button
            type="button"
            className="weather-pill min-h-[44px] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100"
            onClick={() => commitState({ ...uiState, modal: "none" })}
          >
            Done
          </button>
        </section>
      ) : null}
    </>
  );
}
