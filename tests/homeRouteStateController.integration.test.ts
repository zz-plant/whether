import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildHomeRouteUiHref,
  defaultHomeRouteUiState,
  determineHistoryIntent,
  resolveHomeRouteUiState,
  type HomeRouteUiState,
} from "../app/components/home/homeRouteStateController";

const parseStateFromHref = (href: string) => {
  const url = new URL(href, "https://whether.test");
  return resolveHomeRouteUiState(url.searchParams).state;
};

describe("home route URL-state integration", () => {
  it("loads deep links into a non-default tab", () => {
    const state = parseStateFromHref("/?tab=workspace&focus=risk&detail=full");

    assert.equal(state.tab, "workspace");
    assert.equal(state.focus, "risk");
    assert.equal(state.detail, "full");
    assert.equal(state.modal, "none");
  });

  it("persists state across refresh by rebuilding from URL", () => {
    const persistedHref = buildHomeRouteUiHref("/", {
      tab: "revisit",
      focus: "decision",
      detail: "full",
      modal: "share",
    });

    const firstLoad = parseStateFromHref(persistedHref);
    const refreshedLoad = parseStateFromHref(persistedHref);

    assert.deepEqual(refreshedLoad, firstLoad);
  });

  it("supports multi-step back/forward-style navigation", () => {
    const timeline: string[] = [buildHomeRouteUiHref("/", defaultHomeRouteUiState)];
    const stateTimeline: HomeRouteUiState[] = [defaultHomeRouteUiState];

    const transitions: HomeRouteUiState[] = [
      { ...defaultHomeRouteUiState, tab: "workspace" },
      { ...defaultHomeRouteUiState, tab: "workspace", focus: "risk" },
      { ...defaultHomeRouteUiState, tab: "workspace", focus: "risk", modal: "share" },
    ];

    for (const next of transitions) {
      const current = stateTimeline[stateTimeline.length - 1];
      const intent = determineHistoryIntent(current, next);
      const href = buildHomeRouteUiHref("/", next);

      if (intent === "replace") {
        timeline[timeline.length - 1] = href;
        stateTimeline[stateTimeline.length - 1] = next;
      } else if (intent === "push") {
        timeline.push(href);
        stateTimeline.push(next);
      }
    }

    const backOnce = parseStateFromHref(timeline[timeline.length - 2]);
    const backTwice = parseStateFromHref(timeline[timeline.length - 3]);
    const forwardOnce = parseStateFromHref(timeline[timeline.length - 2]);

    assert.equal(backOnce.modal, "none");
    assert.equal(backOnce.focus, "risk");
    assert.equal(backTwice.focus, "all");
    assert.equal(backTwice.tab, "workspace");
    assert.equal(forwardOnce.focus, "risk");
  });

  it("normalizes invalid params to deterministic defaults", () => {
    const invalid = resolveHomeRouteUiState(new URLSearchParams("tab=unknown&focus=oops&detail=max&modal=sheet"));

    assert.equal(invalid.normalized, true);
    assert.deepEqual(invalid.state, defaultHomeRouteUiState);
    assert.equal(buildHomeRouteUiHref("/", invalid.state), "/");
  });
});
