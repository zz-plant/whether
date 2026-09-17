"use client";

import { useSyncExternalStore } from "react";

/**
 * Values that only exist in a browser, read through React's own store protocol.
 *
 * Nineteen client components used to read localStorage, a cookie, a DOM island
 * or "am I hydrated yet" by calling `setState` from a mount effect. That is the
 * shape `react/set-state-in-effect` names, and the reason it was written that
 * way is real: reading the browser during render makes the server's markup and
 * the client's first render disagree. `useSyncExternalStore` is the API for
 * exactly this — it renders `getServerSnapshot` on the server *and* through
 * hydration, then switches to `getSnapshot`, so the markup still matches and
 * React owns the second render instead of an effect starting it.
 *
 * The hazard the conversion introduces is not the cascading render, it is
 * `getSnapshot`: React calls it on every render and re-renders whenever the
 * reference differs, so a snapshot that builds a fresh object each call spins
 * forever. Every source here caches its last value and returns the identical
 * reference until something asks it to re-read. That property is the whole
 * reason this is a module rather than a hook per call site — it is pure, so
 * `tests/browserSource.test.ts` can pin it in a suite that has no DOM.
 */
export type BrowserSource<TValue> = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => TValue;
  getServerSnapshot: () => TValue;
  /**
   * Re-read the underlying source and notify subscribers if it moved. For the
   * writer's side of a read/write pair — the control that sets the cookie calls
   * this, so every consumer of the same source agrees without polling.
   */
  refresh: () => void;
};

export const createBrowserSource = <TValue>({
  read,
  serverValue,
  watch,
  refreshOnSubscribe = false,
  isEqual = Object.is,
}: {
  /** Reads the browser. Called lazily, never on the server, never during hydration. */
  read: () => TValue;
  /** What the server rendered, and what hydration renders so the two match. */
  serverValue: TValue;
  /** Subscribes to whatever changes the source out from under us. Optional: many sources never move. */
  watch?: (onChange: () => void) => () => void;
  /**
   * Re-read when the first consumer appears, instead of trusting the cache.
   *
   * A source is a module singleton, so its cache outlives the tree that filled
   * it. That is right for something the tab owns — a client id is the same id
   * all session — and wrong for anything the *page* owns, such as a DOM island
   * the next route renders differently. Those want the mount effect's timing:
   * read again whenever something starts rendering them.
   */
  refreshOnSubscribe?: boolean;
  /** Reference stability for sources that read a fresh object each time. */
  isEqual?: (a: TValue, b: TValue) => boolean;
}): BrowserSource<TValue> => {
  let cached: TValue = serverValue;
  let hasRead = false;
  let stopWatching: (() => void) | undefined;
  const listeners = new Set<() => void>();

  const refresh = () => {
    const next = read();
    if (hasRead && isEqual(cached, next)) return;
    cached = next;
    hasRead = true;
    for (const listener of listeners) listener();
  };

  return {
    subscribe: (onStoreChange) => {
      listeners.add(onStoreChange);
      /* One listener on `window` per source, not per consumer, and none at all
         while nothing renders. Counted on the set rather than handed to the
         first subscriber: that version stopped watching when the first consumer
         unmounted, leaving every later one deaf to changes. */
      if (listeners.size === 1) {
        stopWatching = watch?.(refresh);
        if (refreshOnSubscribe) refresh();
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
          stopWatching?.();
          stopWatching = undefined;
        }
      };
    },
    getSnapshot: () => {
      if (!hasRead) {
        cached = read();
        hasRead = true;
      }
      return cached;
    },
    getServerSnapshot: () => serverValue,
    refresh,
  };
};

export const useBrowserSource = <TValue>(source: BrowserSource<TValue>): TValue =>
  useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot);

/**
 * "Has this tree hydrated yet" — false through the server render and the first
 * client render, true afterwards. Several controls need it to keep rendering
 * the server's answer until the browser's is safe to read; they used to spell
 * it `useState(false)` plus `useEffect(() => setMounted(true), [])`.
 */
const hydratedSource = createBrowserSource<boolean>({ read: () => true, serverValue: false });

export const useHydrated = (): boolean => useBrowserSource(hydratedSource);
