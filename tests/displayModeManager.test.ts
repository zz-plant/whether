import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { initializeDisplayMode } from "../app/components/displayModeManager";

type MockWindow = {
  location: { href: string; search: string };
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  history: {
    replaceState: (state: unknown, unused: string, url?: string | URL | null) => void;
  };
  matchMedia: (query: string) => {
    matches: boolean;
    addEventListener: () => void;
    removeEventListener: () => void;
  };
};

const STORAGE_KEY = "whether-display-mode";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

const installEnvironment = ({
  href,
  persistedMode,
  coarse,
  wide,
  renderedMode,
}: {
  href: string;
  persistedMode: "auto" | "tv" | null;
  coarse: boolean;
  wide: boolean;
  renderedMode?: "auto" | "tv";
}) => {
  let storedMode = persistedMode;
  let setItemCalls = 0;
  let replaceStateCalls = 0;
  let displayModeWrites = 0;

  let internalRenderedMode = renderedMode;
  const dataset = {} as Record<string, string | undefined>;
  Object.defineProperty(dataset, "displayMode", {
    get: () => internalRenderedMode,
    set: (value: string | undefined) => {
      displayModeWrites += 1;
      internalRenderedMode = value as "auto" | "tv" | undefined;
    },
    enumerable: true,
    configurable: true,
  });

  const location = new URL(href);
  const win: MockWindow = {
    location: {
      href: location.href,
      search: location.search,
    },
    localStorage: {
      getItem: (key) => (key === STORAGE_KEY ? storedMode : null),
      setItem: (key, value) => {
        if (key === STORAGE_KEY) {
          setItemCalls += 1;
          storedMode = value as "auto" | "tv";
        }
      },
    },
    history: {
      replaceState: (_state, _unused, url) => {
        replaceStateCalls += 1;
        const next = new URL(String(url), location.href);
        win.location.href = next.href;
        win.location.search = next.search;
      },
    },
    matchMedia: (query) => ({
      matches: query.includes("1280px") ? coarse : wide,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };

  Object.defineProperty(globalThis, "window", {
    value: win,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: { documentElement: { dataset } },
    writable: true,
    configurable: true,
  });

  return {
    getSetItemCalls: () => setItemCalls,
    getReplaceStateCalls: () => replaceStateCalls,
    getDisplayModeWrites: () => displayModeWrites,
    getRenderedMode: () => internalRenderedMode,
    getHref: () => win.location.href,
  };
};

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: originalDocument,
    writable: true,
    configurable: true,
  });
});

describe("initializeDisplayMode", () => {
  it("uses URL override and avoids no-op storage/history/document writes", () => {
    const env = installEnvironment({
      href: "https://whether.work/?display=tv",
      persistedMode: "tv",
      coarse: false,
      wide: false,
      renderedMode: "tv",
    });

    const mode = initializeDisplayMode();

    assert.equal(mode, "tv");
    assert.equal(env.getSetItemCalls(), 0);
    assert.equal(env.getReplaceStateCalls(), 0);
    assert.equal(env.getDisplayModeWrites(), 0);
  });

  it("uses persisted mode when URL is unset and only mutates URL when needed", () => {
    const env = installEnvironment({
      href: "https://whether.work/",
      persistedMode: "tv",
      coarse: false,
      wide: false,
      renderedMode: "tv",
    });

    const mode = initializeDisplayMode();

    assert.equal(mode, "tv");
    assert.equal(env.getSetItemCalls(), 0);
    assert.equal(env.getReplaceStateCalls(), 1);
    assert.match(env.getHref(), /\?display=tv$/);
    assert.equal(env.getDisplayModeWrites(), 0);
  });

  it("defaults to auto without mutating storage/history when already canonical", () => {
    const env = installEnvironment({
      href: "https://whether.work/",
      persistedMode: "auto",
      coarse: false,
      wide: false,
      renderedMode: "auto",
    });

    const mode = initializeDisplayMode();

    assert.equal(mode, "auto");
    assert.equal(env.getSetItemCalls(), 0);
    assert.equal(env.getReplaceStateCalls(), 0);
    assert.equal(env.getDisplayModeWrites(), 0);
  });
});
