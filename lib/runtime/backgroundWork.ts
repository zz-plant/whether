/**
 * Detached background work for Cloudflare Workers. The worker entry installs the
 * active request's `ctx.waitUntil` here so library code can keep work alive past
 * the response without importing worker types. Outside Workers (bun tests, node
 * scripts, dev server) the work simply runs detached in-process.
 */
type WaitUntil = (promise: Promise<unknown>) => void;

const WAIT_UNTIL_GLOBAL = "WHETHER_WAIT_UNTIL";

export const installWaitUntil = (waitUntil: WaitUntil) => {
  Reflect.set(globalThis, WAIT_UNTIL_GLOBAL, waitUntil);
};

export const runInBackground = (label: string, work: () => Promise<unknown>) => {
  const task = Promise.resolve()
    .then(work)
    .catch((error) => {
      console.error(`[background] ${label} failed`, error);
    });
  const waitUntil: unknown = Reflect.get(globalThis, WAIT_UNTIL_GLOBAL);
  if (typeof waitUntil === "function") {
    Reflect.apply(waitUntil, globalThis, [task]);
  }
  return task;
};
