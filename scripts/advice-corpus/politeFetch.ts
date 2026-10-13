/**
 * The corpus's only way onto the network: robots.txt first, one host at a time, at most
 * one request a second per host, a descriptive User-Agent, and a disk cache so a resumed
 * run never asks a host for the same page twice.
 *
 * Responses are cached gzipped under `.cache/advice-corpus/http/<host>/` (gitignored), so an
 * extractor fix re-reads the cache instead of the site.
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";

import { CACHE, MIN_SECONDS_BETWEEN_REQUESTS, USER_AGENT } from "./paths";

type RobotsRule = { allow: boolean; pattern: string };
export type RobotsPolicy = { rules: RobotsRule[]; crawlDelaySeconds: number | null };

/**
 * RFC 9309, the parts a polite reader needs: the group naming this agent's product token if
 * there is one, else `*`; the longest matching rule wins; `*` and a trailing `$` are honoured;
 * an allow wins a tie.
 */
export function parseRobots(source: string, productToken: string): RobotsPolicy {
  type Group = { agents: string[]; rules: RobotsRule[]; crawlDelaySeconds: number | null };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelaySeconds: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      if (value === "") continue;
      current.rules.push({ allow: field === "allow", pattern: value });
    } else if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelaySeconds = seconds;
    }
  }
  const token = productToken.toLowerCase();
  const named = groups.filter((group) => group.agents.some((agent) => agent !== "*" && token.includes(agent)));
  const chosen = named.length > 0 ? named : groups.filter((group) => group.agents.includes("*"));
  return {
    rules: chosen.flatMap((group) => group.rules),
    crawlDelaySeconds: chosen.reduce<number | null>(
      (max, group) => (group.crawlDelaySeconds === null ? max : Math.max(max ?? 0, group.crawlDelaySeconds)),
      null,
    ),
  };
}

const patternToRegExp = (pattern: string) => {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
};

/** Whether `pathWithQuery` may be fetched under `policy`. No matching rule means allowed. */
export function isAllowedByRobots(policy: RobotsPolicy, pathWithQuery: string): boolean {
  let best: RobotsRule | null = null;
  for (const rule of policy.rules) {
    if (!patternToRegExp(rule.pattern).test(pathWithQuery)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

const CachedResponseSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  status: z.number(),
  contentType: z.string(),
  fetchedAt: z.string(),
  body: z.string(),
});
export type CachedResponse = z.infer<typeof CachedResponseSchema>;

const cachePathFor = (url: string) => {
  const host = new URL(url).host;
  const hash = createHash("sha1").update(url).digest("hex");
  return join(CACHE.http, host, `${hash}.json.gz`);
};

const readCache = (url: string): CachedResponse | null => {
  const path = cachePathFor(url);
  if (!existsSync(path)) return null;
  try {
    const parsed = CachedResponseSchema.safeParse(JSON.parse(gunzipSync(readFileSync(path)).toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const writeCache = (response: CachedResponse) => {
  const path = cachePathFor(response.url);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, gzipSync(JSON.stringify(response)));
};

export const logFailure = (entry: Record<string, unknown>) => {
  mkdirSync(dirname(CACHE.failures), { recursive: true });
  appendFileSync(CACHE.failures, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One queue per host, so requests to a host never overlap and never come faster than the floor. */
class HostQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private lastStart = 0;
  constructor(private readonly minGapMs: () => number) {}
  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => {
      const wait = this.lastStart + this.minGapMs() - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastStart = Date.now();
      return task();
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
}

const queues = new Map<string, HostQueue>();
const robotsByHost = new Map<string, Promise<RobotsPolicy>>();
let networkRequests = 0;

export const networkRequestCount = () => networkRequests;

const queueFor = (host: string) => {
  let queue = queues.get(host);
  if (!queue) {
    queue = new HostQueue(() => {
      const delay = robotsDelays.get(host) ?? 0;
      return Math.max(MIN_SECONDS_BETWEEN_REQUESTS, delay) * 1000;
    });
    queues.set(host, queue);
  }
  return queue;
};
const robotsDelays = new Map<string, number>();

async function rawFetch(url: string): Promise<CachedResponse> {
  networkRequests += 1;
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(45_000),
  });
  return {
    url,
    finalUrl: response.url || url,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    fetchedAt: new Date().toISOString(),
    body: await response.text(),
  };
}

const robotsFor = (origin: string): Promise<RobotsPolicy> => {
  const host = new URL(origin).host;
  let policy = robotsByHost.get(host);
  if (!policy) {
    policy = (async () => {
      const robotsUrl = `${new URL(origin).origin}/robots.txt`;
      const cached = readCache(robotsUrl);
      const response = cached ?? (await queueFor(host).run(() => rawFetch(robotsUrl)));
      if (!cached && response.status < 500) writeCache(response);
      // RFC 9309: an unavailable robots.txt (4xx) means no restrictions; a server error means assume full disallow.
      if (response.status >= 500) return { rules: [{ allow: false, pattern: "/" }], crawlDelaySeconds: null };
      if (response.status >= 400) return { rules: [], crawlDelaySeconds: null };
      const parsed = parseRobots(response.body, "WhetherAdviceCorpus");
      if (parsed.crawlDelaySeconds !== null) robotsDelays.set(host, parsed.crawlDelaySeconds);
      return parsed;
    })();
    robotsByHost.set(host, policy);
  }
  return policy;
};

export class RobotsDisallowedError extends Error {}

/**
 * Fetch `url` politely: from the cache when it is there, otherwise through the host's queue
 * after checking robots.txt. Retries a 429 or 5xx twice with a growing pause. Throws on a
 * disallowed path; returns non-2xx responses for the caller to judge (and caches only 2xx/404).
 */
export async function politeFetch(url: string, options: { refresh?: boolean } = {}): Promise<CachedResponse> {
  if (!options.refresh) {
    const cached = readCache(url);
    if (cached) return cached;
  }
  const parsed = new URL(url);
  const policy = await robotsFor(url);
  if (!isAllowedByRobots(policy, `${parsed.pathname}${parsed.search}`)) {
    throw new RobotsDisallowedError(`robots.txt disallows ${url}`);
  }
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      const response = await queueFor(parsed.host).run(() => rawFetch(url));
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(attempt * 15_000);
        continue;
      }
      if ((response.status >= 200 && response.status < 300) || response.status === 404 || response.status === 410) writeCache(response);
      return response;
    } catch (error) {
      if (attempt >= 3) throw error;
      await sleep(attempt * 10_000);
    }
  }
}
