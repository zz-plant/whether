import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildHomeRouteUiHref,
  defaultHomeRouteUiState,
  resolveHomeRouteUiState,
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
    assert.equal(state.panel, "none");
  });

  it("persists state across refresh by rebuilding from URL", () => {
    const persistedHref = buildHomeRouteUiHref("/", {
      tab: "revisit",
      focus: "decision",
      detail: "full",
      panel: "share",
    });

    const firstLoad = parseStateFromHref(persistedHref);
    const refreshedLoad = parseStateFromHref(persistedHref);

    assert.deepEqual(refreshedLoad, firstLoad);
  });

  it("normalizes invalid params to deterministic defaults", () => {
    const invalid = resolveHomeRouteUiState(new URLSearchParams("tab=unknown&focus=oops&detail=max&panel=sheet"));

    assert.equal(invalid.normalized, true);
    assert.deepEqual(invalid.state, defaultHomeRouteUiState);
    assert.equal(buildHomeRouteUiHref("/", invalid.state), "/");
  });

  it("preserves share help state in the URL when toggled on", () => {
    const href = buildHomeRouteUiHref("/", {
      ...defaultHomeRouteUiState,
      panel: "share",
    });

    assert.equal(href, "/?panel=share");
  });
});
