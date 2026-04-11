"use client";

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
