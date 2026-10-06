/**
 * A store chosen by the binding it is built over, re-checked on every call.
 *
 * Each repository used to pick KV or its in-memory fallback the first time it was asked and keep
 * that store for the isolate's life, so one call that ran before the binding was installed left
 * every later request writing to memory. `getDefaultIngestionStore` stopped memoizing for good on
 * the same grounds (AGENTS.md, "re-checks binding"); this is that approach, shared. The store is
 * rebuilt only when the binding it was built over is no longer the one installed, so a stable
 * binding keeps one store — and its write queue — for the isolate's life.
 */
export const selectStoreByBinding = <Binding, Store>(
  resolve: () => Binding | null,
  build: (binding: Binding | null) => Store,
) => {
  let current: { store: Store; binding: Binding | null; held: boolean } | null = null;

  const rebuild = (): Store => {
    const binding = resolve();
    const store = build(binding);
    current = { store, binding, held: false };
    return store;
  };

  return {
    get: (): Store => {
      if (current && (current.held || current.binding === resolve())) return current.store;
      return rebuild();
    },
    /**
     * Test hook. With no argument, rebuilds from the binding as it is now. Given a store, holds
     * it whatever the binding does until the next reset — the suite's "start from an empty
     * in-memory store", which is what those resets always meant.
     */
    reset: (store?: Store): Store => {
      if (store === undefined) return rebuild();
      current = { store, binding: null, held: true };
      return store;
    },
  };
};
