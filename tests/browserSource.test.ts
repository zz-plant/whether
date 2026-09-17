import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createBrowserSource } from "../app/components/browserSource";

/**
 * The properties a `useSyncExternalStore` source has to hold, pinned without a DOM.
 *
 * Converting nineteen mount effects into external stores moves the risk rather
 * than removing it. The effect version's worst case was an extra render; a
 * store's worst case is an infinite one, because React calls `getSnapshot` on
 * every render and re-renders whenever the reference differs. A snapshot that
 * allocates — `JSON.parse(...)`, `{ ...stored }` — never settles.
 *
 * Nothing in this suite exercises a client effect, and adding a DOM to find
 * that out is a far larger change than the fix. So the dangerous part is a pure
 * module and this file is the proof; what is left at each call site is one hook
 * call whose correctness a reader can see.
 */
describe("browser source snapshots", () => {
  it("returns the identical reference until something asks it to re-read", () => {
    let reads = 0;
    const source = createBrowserSource<{ id: string }>({
      // A fresh object every call: the shape that loops if the store does not cache.
      read: () => {
        reads += 1;
        return { id: "stable" };
      },
      serverValue: { id: "server" },
    });

    const first = source.getSnapshot();
    assert.equal(source.getSnapshot(), first, "a second render allocated a new snapshot");
    assert.equal(source.getSnapshot(), first);
    assert.equal(reads, 1, "the source was read once per render rather than once per change");
  });

  it("does not read the browser until a snapshot is asked for", () => {
    let reads = 0;
    const source = createBrowserSource({ read: () => ++reads, serverValue: 0 });

    assert.equal(reads, 0, "module load touched the browser");
    assert.equal(source.getServerSnapshot(), 0);
    assert.equal(reads, 0, "the server snapshot read the browser");

    source.getSnapshot();
    assert.equal(reads, 1);
  });

  it("renders the server's value through hydration, whatever the browser says", () => {
    const source = createBrowserSource({ read: () => "browser", serverValue: "server" });

    // React renders getServerSnapshot on the server and again for the hydrating
    // render, which is the whole reason the old code read in an effect.
    assert.equal(source.getServerSnapshot(), "server");
    assert.equal(source.getSnapshot(), "browser");
    assert.equal(source.getServerSnapshot(), "server", "the server snapshot drifted once the browser was read");
  });

  it("notifies subscribers when a refresh moves the value, and not when it does not", () => {
    let stored = "a";
    const source = createBrowserSource({ read: () => stored, serverValue: "" });
    let notifications = 0;
    const unsubscribe = source.subscribe(() => {
      notifications += 1;
    });

    source.getSnapshot();
    source.refresh();
    assert.equal(notifications, 0, "an unchanged source still re-rendered every consumer");

    stored = "b";
    source.refresh();
    assert.equal(notifications, 1);
    assert.equal(source.getSnapshot(), "b");

    unsubscribe();
    stored = "c";
    source.refresh();
    assert.equal(notifications, 1, "an unmounted consumer was still being notified");
  });

  /*
   * A source is a module singleton, so its cache outlives the tree that filled
   * it — which is wrong for anything the page owns rather than the tab. The
   * effects this replaces ran on every mount, so a DOM island read on one route
   * was read again on the next; a cache that never re-read would serve the
   * previous route's brief.
   */
  it("re-reads for a new tree when the source belongs to the page, not the tab", () => {
    let island = "route-a";
    const source = createBrowserSource({ read: () => island, serverValue: "", refreshOnSubscribe: true });

    const mounted = source.subscribe(() => {});
    assert.equal(source.getSnapshot(), "route-a");
    mounted();

    island = "route-b";
    const remounted = source.subscribe(() => {});
    assert.equal(source.getSnapshot(), "route-b", "a second tree was served the first one's cached value");
    remounted();
  });

  it("leaves a tab-lifetime source cached across trees", () => {
    let reads = 0;
    const source = createBrowserSource({ read: () => ++reads, serverValue: 0 });

    const mounted = source.subscribe(() => {});
    source.getSnapshot();
    mounted();
    source.subscribe(() => {})();

    assert.equal(reads, 1, "a value the tab owns was regenerated for a second consumer");
  });

  it("compares by value when asked, so an equal object keeps its reference", () => {
    let version = 0;
    const source = createBrowserSource<{ version: number }>({
      read: () => ({ version }),
      serverValue: { version: -1 },
      isEqual: (a, b) => a.version === b.version,
    });

    const first = source.getSnapshot();
    source.refresh();
    assert.equal(source.getSnapshot(), first, "a re-read of an unchanged source replaced the snapshot");

    version = 1;
    source.refresh();
    assert.notEqual(source.getSnapshot(), first);
    assert.deepEqual(source.getSnapshot(), { version: 1 });
  });

  it("watches only while something is subscribed", () => {
    let watching = 0;
    const source = createBrowserSource({
      read: () => "value",
      serverValue: "",
      watch: () => {
        watching += 1;
        return () => {
          watching -= 1;
        };
      },
    });

    assert.equal(watching, 0, "a source nothing renders installed a listener");
    const first = source.subscribe(() => {});
    const second = source.subscribe(() => {});
    assert.equal(watching, 1, "each consumer installed its own listener on the same source");

    // Unmounting the first consumer must not deafen the second. An earlier version
    // handed the teardown to whoever subscribed first, so it did exactly that.
    first();
    assert.equal(watching, 1, "the first consumer's unmount stopped watching for everyone else");

    second();
    assert.equal(watching, 0, "the listener outlived the tree that wanted it");

    // And a later consumer re-installs it rather than finding a dead source.
    const third = source.subscribe(() => {});
    assert.equal(watching, 1);
    third();
  });
});
