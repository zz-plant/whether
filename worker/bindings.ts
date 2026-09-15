/**
 * Bindings reach library code through globalThis, so they must be installed on every
 * entry point: the fetch and scheduled handlers in worker/index.ts, and any Workflow whose
 * steps call into lib/ (each instance may run in an isolate nothing else has primed).
 * Missing them is silent: the storage repositories fall back to per-isolate in-memory
 * stores and appear to work while persisting nothing.
 */
const NOT_INSTALLED = new Set(["ASSETS", "IMAGES"]);

export const installBindings = (env: object | null | undefined) => {
  if (!env) return;
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && !NOT_INSTALLED.has(key)) {
      Reflect.set(globalThis, key, value);
    }
  }
};
