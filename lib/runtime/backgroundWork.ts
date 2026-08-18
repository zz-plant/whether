/**
 * Detached background work for Cloudflare Workers. The worker entry installs the
 * active request's `ctx.waitUntil` here so library code can keep work alive past
 * the response without importing worker types. Outside Workers (bun tests, node
 * scripts, dev server) the work simply runs detached in-process.
 */
type WaitUntil = (promise: Promise<unknown>) => void;

const globalScope = globalThis as { WHETHER_WAIT_UNTIL?: WaitUntil };

export const installWaitUntil = (waitUntil: WaitUntil) => {
  globalScope.WHETHER_WAIT_UNTIL = waitUntil;
};

export const runInBackground = (label: string, work: () => Promise<unknown>) => {
  const task = Promise.resolve()
    .then(work)
    .catch((error) => {
      console.error(`[background] ${label} failed`, error);
    });
  globalScope.WHETHER_WAIT_UNTIL?.(task);
  return task;
};
