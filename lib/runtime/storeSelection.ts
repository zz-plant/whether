/**
 * A store chosen by the binding it is built over, re-checked on every call, so a call that
 * ran before the binding was installed does not leave every later request on the fallback.
 * Rebuilt only when the installed binding changes, so a stable binding keeps one store and
 * its write queue. docs/agents/lessons/runtime-helpers.md.
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
     * it whatever the binding does until the next reset.
     */
    reset: (store?: Store): Store => {
      if (store === undefined) return rebuild();
      current = { store, binding: null, held: true };
      return store;
    },
  };
};
