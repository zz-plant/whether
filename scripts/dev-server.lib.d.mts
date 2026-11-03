import type { ChildProcess } from "node:child_process";

/** What a readiness probe reports about `baseUrl`. */
export type DevServerProbe = { ok: boolean; status?: number; error?: string };

/** The server `withDevServer` started, handed to the work as its second argument. */
export type StartedDevServer = { child: ChildProcess; logPath: string };

/**
 * Runs `body` against a ready server: reuses a remote target as it answers, then this
 * checkout's own dev server from vinext's lock file, then a server already listening at
 * `baseUrl` only when the caller named it explicitly, otherwise starts `bun run <devScript>`
 * (on a nearby port if the requested one is held), waits for `probe`, and stops only a
 * server it started — even when `body` throws. `started` is undefined when an existing
 * server was reused.
 */
export function withDevServer<T>(options: {
  baseUrl: string;
  outDir: string;
  devScript?: string;
  logName?: string;
  timeoutMs?: number;
  probe: (baseUrl: string) => Promise<DevServerProbe>;
  onStatus?: (message: string) => void;
  body: (baseUrl: string, started?: StartedDevServer) => Promise<T> | T;
  /** Fresh starts to try before readiness counts as failed; the work itself is never retried. */
  startAttempts?: number;
  /** vinext's lock file for this checkout; a live server named there is reused. */
  lockfilePath?: string;
  /** The caller named this base URL on the command line, so it is audited as given. */
  explicitBaseUrl?: boolean;
}): Promise<T>;

/**
 * The dev server vinext's lock file names for this checkout, or null when the file is
 * missing, unreadable, or its process is gone. Exported for the landmark audit, which
 * asks the same question before deciding whether it must build the worker bundle.
 */
export function readCheckoutDevServer(lockfilePath?: string): string | null;
