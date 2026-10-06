import type { ChildProcess } from "node:child_process";

/** What a readiness probe reports about `baseUrl`. */
export type DevServerProbe = { ok: boolean; status?: number; error?: string };

/** The server `withDevServer` started, handed to the work as its second argument. */
export type StartedDevServer = { child: ChildProcess; logPath: string };

/**
 * Runs `body` against a ready server: reuses one already answering at `baseUrl`, otherwise
 * starts `bun run <devScript>` (on a nearby port if the requested one is held), waits for
 * `probe`, and stops only a server it started — even when `body` throws. `started` is
 * undefined when an existing server was reused.
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
}): Promise<T>;
