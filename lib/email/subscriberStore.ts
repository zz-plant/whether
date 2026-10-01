import { readKvValues, type KvNamespace } from "../runtime/kv";
import { parsePlanLines, parsePlanRunway, type PlanLines, type PlanRunway } from "../alert/planLines";
import type { RunwayBand } from "../report/operatorRunway";
/**
 * Subscriber storage using Cloudflare KV.
 * Stores individual subscriber records keyed by email
 * and verification/unsubscribe tokens for one-click links.
 *
 * Follows the same KV binding pattern as lib/storage/alertPreferenceRepository.ts.
 */

export type Subscriber = {
  email: string;
  verified: boolean;
  subscribedAt: string;
  token: string;
  active: boolean;
  /**
   * Opt-in to regime-change alert mail, separate from the weekly brief.
   *
   * It lives here rather than in a device-keyed `alert-pref:` record because that
   * keyspace could never route: the browser keys those on a random client UUID, and
   * `resolveRecipientEmail` only accepted a subscriber token — a value that reaches
   * nobody but the subscriber's own inbox. Every record written from the panel was
   * therefore skipped at delivery. Consent belongs where the verified address does.
   *
   * Absent on records written before 2026-09-07; `hydrateSubscriber` reads those as
   * false, so nobody is enrolled by the migration.
   */
  alerts: boolean;
  /**
   * Receives the Monday brief. False only for someone who asked for alert mail and
   * nothing else — the "tell me when this changes" signup, for a reader who wants
   * the one email that matters rather than a weekly one.
   *
   * Absent on every record written before 2026-09-23, and every one of those
   * subscribed to the weekly brief, so `hydrateSubscriber` reads absent as true.
   */
  weekly: boolean;
  /**
   * The lines this subscriber set for their own plan on /operate, alerted the day
   * one starts to hold (`evaluatePlanLineCrossings`). Empty for everyone else.
   */
  planLines: PlanLines[];
  /**
   * Lines a subscribe request asked for, not yet confirmed. A request can name any
   * address, so a set of lines takes effect only when the confirmation link in that
   * inbox is clicked (`verifyEmail`); until then the standing lines are untouched.
   */
  pendingPlanLines?: PlanLines[];
  /**
   * The runway band the reader had chosen when they set `planLines`, and the day
   * (`PlanRunway`): a crossing email says what the crossing means at that band, so
   * one line crossed reads differently at six months of runway than at two years.
   * The band only. It arrives with the lines, waits with them for the inbox, and
   * is replaced or cleared with them.
   */
  planRunway?: PlanRunway;
  /** The band sent with `pendingPlanLines`. Absent beside pending lines means they carry none. */
  pendingPlanRunway?: PlanRunway;
  /**
   * Choices a request made for an address that has already confirmed: alert mail,
   * the Monday brief, or reactivating a record that unsubscribed. Applied by
   * `verifyEmail`. Before 2026-10-01 they took effect on the request, so anyone who
   * knew an address could switch off its Monday brief or re-enroll someone who had
   * left; consent for a change now comes from the inbox, as it does for the first
   * subscription.
   */
  pendingFlags?: PendingFlags;
  /**
   * The link that confirms the pending change, or for an address that never
   * confirmed, the subscription itself. Issued fresh by every request, so a newer
   * request retires an older email's link, and good for `CONFIRM_TTL_MS`.
   *
   * Until 2026-10-02 the confirmation link carried `token`, which every Monday
   * brief and alert footer also carries for unsubscribing and which never
   * changes: anyone holding one forwarded email could request a change for its
   * reader and then confirm it themselves.
   */
  confirmToken?: string;
  /** When `confirmToken` was issued. */
  confirmRequestedAt?: string;
  /**
   * When this address was last sent a confirmation email (or a "nothing to
   * confirm" note), within the last day. Bounds how much mail a stranger can
   * point at an inbox: the IP rate limit alone let anyone rotating addresses
   * send one inbox a confirmation every few seconds.
   */
  confirmMailSentAt?: string[];
};

type PendingFlags = { alerts?: boolean; weekly?: boolean; reactivate?: boolean };

export type SubscribeOptions = {
  /** Omitted leaves an existing subscriber's choice alone; a new record defaults to false. */
  alerts?: boolean;
  /**
   * Omitted leaves an existing subscriber's choice alone; a new record defaults to true,
   * except one created only to watch plan lines, which asked for those emails and no Monday one.
   */
  weekly?: boolean;
  /** Held as `pendingPlanLines` until the address confirms; an empty list clears the lines. */
  planLines?: PlanLines[];
  /** The reader's runway band, sent with `planLines`; kept only beside a non-empty set of lines. */
  runwayBand?: RunwayBand;
};

/**
 * Whether a request's lines would change what the record watches: different
 * lines, or the same lines with a different runway band beside them. Asking for
 * exactly what is already set issues no link, since there is nothing to confirm.
 */
const planLinesRequestChanges = (existing: Subscriber, planLines: PlanLines[], runwayBand: RunwayBand | undefined) => {
  if (JSON.stringify(planLines) !== JSON.stringify(existing.planLines)) return true;
  const requestedBand = planLines.length > 0 ? runwayBand : undefined;
  return requestedBand !== existing.planRunway?.band;
};

/** The band to hold beside a request's lines, dated today, or nothing. */
const pendingRunwayFor = (options: SubscribeOptions | undefined, now: Date): Pick<Subscriber, "pendingPlanRunway"> =>
  options?.planLines && options.planLines.length > 0 && options.runwayBand
    ? { pendingPlanRunway: { band: options.runwayBand, setOn: now.toISOString() } }
    : {};

type KvNamespaceLike = Omit<KvNamespace, "list"> & { list?: KvNamespace["list"] };

export interface SubscriberStore {
  subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber>;
  unsubscribe(token: string): Promise<boolean>;
  /**
   * The record a confirmation link would change, while the link still works.
   * Changes nothing: a link scanner fetching the link must not confirm it.
   */
  getPendingConfirmation(token: string): Promise<Subscriber | null>;
  /** Applies what the link confirms and returns the record as it now stands, or null for a dead link. */
  verifyEmail(token: string): Promise<Subscriber | null>;
  /** Notes that a confirmation email went to this address at `at`. */
  recordConfirmationMail(email: string, at: Date): Promise<void>;
  getActiveSubscriptions(): Promise<string[]>;
  /** Active, verified subscribers. Carries the token, which the unsubscribe link needs. */
  listActiveSubscribers(): Promise<Subscriber[]>;
  /** The subset of those who opted into alert mail. */
  listAlertSubscribers(): Promise<Subscriber[]>;
  /** The subset of those who receive the Monday brief. */
  listWeeklySubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | null>;
  getSubscriberByToken(token: string): Promise<Subscriber | null>;
  backendStatus(): "durable" | "local-fallback";
}

const SUB_PREFIX = "email:sub:";
const TOKEN_PREFIX = "email:token:";
const ACTIVE_PREFIX = "email:active:";
const CONFIRM_PREFIX = "email:confirm:";

/** How long a confirmation link works. A held change nobody confirms in a week was not wanted. */
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/* A reader fixing a typo sends two or three in a row; a day's worth covers a
   reader who changes their mind twice. Past that it is someone else's mail. */
const CONFIRM_MAILS_PER_HOUR = 3;
const CONFIRM_MAILS_PER_DAY = 6;

const recentConfirmMails = (sub: Pick<Subscriber, "confirmMailSentAt">, now: Date) =>
  (sub.confirmMailSentAt ?? []).filter((at) => {
    const sent = Date.parse(at);
    return Number.isFinite(sent) && now.getTime() - sent < DAY_MS;
  });

/**
 * Whether this address has had as much confirmation mail as it gets for now.
 * A request over the cap changes nothing and sends nothing, and the caller is
 * answered exactly as if it had, so the cap says nothing about the address.
 * The cost: someone can spend an address's allowance and hold its own changes
 * for a day. Its unsubscribe link is not limited.
 */
export const confirmationMailCapped = (sub: Pick<Subscriber, "confirmMailSentAt">, now: Date): boolean => {
  const recent = recentConfirmMails(sub, now);
  const lastHour = recent.filter((at) => now.getTime() - Date.parse(at) < HOUR_MS);
  return recent.length >= CONFIRM_MAILS_PER_DAY || lastHour.length >= CONFIRM_MAILS_PER_HOUR;
};

const withConfirmationMail = (sub: Subscriber, at: Date): Subscriber => ({
  ...sub,
  confirmMailSentAt: [...recentConfirmMails(sub, at), at.toISOString()],
});

const generateToken = (): string => crypto.randomUUID();

const readStoredString = (source: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
};

/** `=== true`, so a missing or non-boolean field reads as false rather than as consent. */
const readStoredFlag = (source: object, key: string): boolean => Reflect.get(source, key) === true;

/** `!== false`, for a field whose absence predates it and meant yes. */
const readStoredFlagDefaultOn = (source: object, key: string): boolean => Reflect.get(source, key) !== false;

const readPendingFlags = (raw: object): Pick<Subscriber, "pendingFlags"> => {
  const stored: unknown = Reflect.get(raw, "pendingFlags");
  if (typeof stored !== "object" || stored === null) return {};
  const flag = (key: keyof PendingFlags) => {
    const value: unknown = Reflect.get(stored, key);
    return typeof value === "boolean" ? { [key]: value } : {};
  };
  const pending: PendingFlags = { ...flag("alerts"), ...flag("weekly"), ...flag("reactivate") };
  return Object.keys(pending).length > 0 ? { pendingFlags: pending } : {};
};

/** The record with no change waiting on its inbox. */
const withoutPending = (sub: Subscriber): Subscriber => {
  const {
    pendingFlags: _flags,
    pendingPlanLines: _lines,
    pendingPlanRunway: _runway,
    confirmToken: _token,
    confirmRequestedAt: _at,
    ...rest
  } = sub;
  return rest;
};

const issueConfirmation = (now: Date): Pick<Subscriber, "confirmToken" | "confirmRequestedAt"> => ({
  confirmToken: generateToken(),
  confirmRequestedAt: now.toISOString(),
});

/**
 * What a request asks of a record that already exists, held until the inbox says
 * yes: the endpoint takes any address, so no request changes a record on arrival,
 * confirmed or not. Each request replaces whatever an earlier one left waiting,
 * with a new link, so the link in an older email stops working rather than
 * confirming a change it never described.
 */
const applySubscribeRequest = (existing: Subscriber, options: SubscribeOptions | undefined, now: Date): Subscriber => {
  const pendingFlags: PendingFlags = {};
  for (const key of ["alerts", "weekly"] as const) {
    const requested = options?.[key];
    if (requested !== undefined && requested !== existing[key]) pendingFlags[key] = requested;
  }
  if (!existing.active) pendingFlags.reactivate = true;
  const change: Pick<Subscriber, "pendingFlags" | "pendingPlanLines" | "pendingPlanRunway"> = {
    ...(Object.keys(pendingFlags).length > 0 ? { pendingFlags } : {}),
    ...(options?.planLines && planLinesRequestChanges(existing, options.planLines, options.runwayBand)
      ? { pendingPlanLines: options.planLines, ...pendingRunwayFor(options, now) }
      : {}),
  };
  /* A confirmed address asking for what it already has gets no link: there is
     nothing for one to confirm. */
  const needsConfirmation = !existing.verified || Object.keys(change).length > 0;
  return { ...withoutPending(existing), ...change, ...(needsConfirmation ? issueConfirmation(now) : {}) };
};

/**
 * Whether `token` confirms `sub` at `now`: its current link, inside a week. A
 * record from before confirmation links existed was mailed its permanent `token`
 * instead, which still confirms it only if it never confirmed: once it has, that
 * token is in the footer of every email it receives.
 */
const confirms = (sub: Subscriber, token: string, now: number): boolean => {
  if (sub.confirmToken) {
    if (sub.confirmToken !== token) return false;
    const issued = Date.parse(sub.confirmRequestedAt ?? "");
    return Number.isFinite(issued) && now - issued < CONFIRM_TTL_MS;
  }
  return !sub.verified && sub.token === token;
};

/** The record once its inbox has said yes. */
const confirmedRecord = (sub: Subscriber): Subscriber => ({ ...withoutPending(withPendingApplied(sub)), verified: true });

/** The record as it will read once the address confirms: what a confirmation email promises. */
export const withPendingApplied = (sub: Subscriber): Subscriber => {
  const { pendingFlags, ...rest } = promotePendingPlanLines(sub);
  if (!pendingFlags) return { ...rest };
  return {
    ...rest,
    alerts: pendingFlags.alerts ?? rest.alerts,
    weekly: pendingFlags.weekly ?? rest.weekly,
    active: pendingFlags.reactivate ? true : rest.active,
  };
};

const readConfirmMails = (raw: object): Pick<Subscriber, "confirmMailSentAt"> => {
  const stored: unknown = Reflect.get(raw, "confirmMailSentAt");
  if (!Array.isArray(stored)) return {};
  const times = stored.filter((value): value is string => typeof value === "string");
  return times.length > 0 ? { confirmMailSentAt: times } : {};
};

const readConfirmation = (raw: object): Pick<Subscriber, "confirmToken" | "confirmRequestedAt"> => {
  const confirmToken = readStoredString(raw, "confirmToken");
  const confirmRequestedAt = readStoredString(raw, "confirmRequestedAt");
  return confirmToken && confirmRequestedAt ? { confirmToken, confirmRequestedAt } : {};
};

const readPendingPlanLines = (raw: object): Pick<Subscriber, "pendingPlanLines" | "pendingPlanRunway"> => {
  const pending = parsePlanLines(Reflect.get(raw, "pendingPlanLines"));
  if (!pending) return {};
  const runway = parsePlanRunway(Reflect.get(raw, "pendingPlanRunway"));
  return { pendingPlanLines: pending, ...(runway ? { pendingPlanRunway: runway } : {}) };
};

/**
 * A confirmed address takes the lines it asked for, and the band that came with
 * them; the pending copies are consumed. A set of lines sent without a band
 * clears the old one, which described the company when the old lines were set.
 */
const promotePendingPlanLines = (sub: Subscriber): Subscriber => {
  if (!sub.pendingPlanLines) return sub;
  const { pendingPlanLines, pendingPlanRunway, planRunway: _replaced, ...rest } = sub;
  return { ...rest, planLines: pendingPlanLines, ...(pendingPlanRunway ? { planRunway: pendingPlanRunway } : {}) };
};

const readPlanRunway = (raw: object): Pick<Subscriber, "planRunway"> => {
  const runway = parsePlanRunway(Reflect.get(raw, "planRunway"));
  return runway ? { planRunway: runway } : {};
};

/**
 * Builds a Subscriber out of a stored record, field by field.
 *
 * Stored records predate the `alerts` field, and every one of them reads as opted out —
 * the migration enrolls nobody. Read rather than asserted because this is JSON out of KV:
 * a record missing an email or a token is no record at all, and `verified` and `active`
 * default to false, so a malformed one cannot become a recipient.
 */
const hydrateSubscriber = (raw: unknown): Subscriber | null => {
  if (typeof raw !== "object" || raw === null) return null;

  const email = readStoredString(raw, "email");
  const token = readStoredString(raw, "token");
  if (!email || !token) return null;

  return {
    email,
    token,
    verified: readStoredFlag(raw, "verified"),
    active: readStoredFlag(raw, "active"),
    subscribedAt: readStoredString(raw, "subscribedAt") ?? new Date().toISOString(),
    alerts: readStoredFlag(raw, "alerts"),
    weekly: readStoredFlagDefaultOn(raw, "weekly"),
    planLines: parsePlanLines(Reflect.get(raw, "planLines")) ?? [],
    ...readPlanRunway(raw),
    ...readPendingPlanLines(raw),
    ...readPendingFlags(raw),
    ...readConfirmation(raw),
    ...readConfirmMails(raw),
  };
};

/** A first request for an address: nothing is sent to it until the link this issues is clicked. */
const newSubscriber = (email: string, options: SubscribeOptions | undefined, now: Date): Subscriber => ({
  email,
  verified: false,
  subscribedAt: now.toISOString(),
  token: generateToken(),
  active: true,
  alerts: options?.alerts === true,
  weekly: options?.weekly ?? !options?.planLines,
  planLines: [],
  ...(options?.planLines ? { pendingPlanLines: options.planLines, ...pendingRunwayFor(options, now) } : {}),
  ...issueConfirmation(now),
});

const normalizeEmail = (raw: string): string | null => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.includes("@") || trimmed.length < 5 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;
  return trimmed;
};

class KvSubscriberStore implements SubscriberStore {
  private readonly fallback = new InMemorySubscriberStore();

  constructor(private readonly kv: KvNamespaceLike) {}

  async subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new Error("Invalid email address");
    }

    const existing = await this.getSubscriberByEmail(normalized);
    if (existing) {
      // An omitted option keeps the standing choice: re-subscribing from a form that
      // does not ask about alerts must not silently switch them off.
      const updated: Subscriber = {
        ...applySubscribeRequest(existing, options, new Date()),
        subscribedAt: existing.subscribedAt || new Date().toISOString(),
      };
      await this.kv.put(SUB_PREFIX + normalized, JSON.stringify(updated)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
      await this.kv.put(TOKEN_PREFIX + updated.token, normalized).catch(() => { /* non-fatal: token index repaired when KV is available */ });
      if (existing.confirmToken) {
        await this.kv.delete?.(CONFIRM_PREFIX + existing.confirmToken).catch(() => undefined);
      }
      await this.indexConfirmation(updated);
      if (updated.verified && updated.active) {
        await this.kv.put(ACTIVE_PREFIX + normalized, normalized).catch(() => { /* non-fatal: active index repaired when KV is available */ });
      }
      this.fallback.saveToMemory(updated);
      return updated;
    }

    const subscriber = newSubscriber(normalized, options, new Date());
    await this.kv.put(SUB_PREFIX + normalized, JSON.stringify(subscriber)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.kv.put(TOKEN_PREFIX + subscriber.token, normalized).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.indexConfirmation(subscriber);
    this.fallback.saveToMemory(subscriber);

    return subscriber;
  }

  /** The confirm link's index entry, which KV drops on its own once the link has expired. */
  private async indexConfirmation(sub: Subscriber): Promise<void> {
    if (!sub.confirmToken) return;
    await this.kv
      .put(CONFIRM_PREFIX + sub.confirmToken, sub.email, { expirationTtl: CONFIRM_TTL_MS / 1000 })
      .catch(() => { /* non-fatal: in-memory fallback already saved */ });
  }

  async unsubscribe(token: string): Promise<boolean> {
    const email = await this.kv.get(TOKEN_PREFIX + token);
    if (!email) return false;

    const raw = await this.kv.get(SUB_PREFIX + email);
    if (!raw) return false;

    const stored = hydrateSubscriber(JSON.parse(raw));
    if (!stored) return false;
    // Leaving also drops anything waiting on the inbox, so no older link can undo it.
    const sub: Subscriber = { ...withoutPending(stored), active: false };
    await this.kv.put(SUB_PREFIX + email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.kv.delete?.(ACTIVE_PREFIX + email).catch(() => undefined);
    if (stored.confirmToken) {
      await this.kv.delete?.(CONFIRM_PREFIX + stored.confirmToken).catch(() => undefined);
    }
    this.fallback.saveToMemory(sub);
    return true;
  }

  /*
   * From KV only, never the in-memory copy. That copy is this isolate's last sight
   * of the record, which can predate the newer request that retired a link or the
   * unsubscribe that dropped it; confirming against it wrote the stale record back
   * over the real one, so an old link could re-enroll a reader who had left.
   */
  async getPendingConfirmation(token: string): Promise<Subscriber | null> {
    const email = (await this.kv.get(CONFIRM_PREFIX + token)) ?? (await this.kv.get(TOKEN_PREFIX + token));
    if (!email) return null;
    const raw = await this.kv.get(SUB_PREFIX + email);
    if (!raw) return null;
    let sub: Subscriber | null = null;
    try {
      sub = hydrateSubscriber(JSON.parse(raw));
    } catch {
      return null;
    }
    return sub && confirms(sub, token, Date.now()) ? sub : null;
  }

  async verifyEmail(token: string): Promise<Subscriber | null> {
    const pending = await this.getPendingConfirmation(token);
    if (!pending) return null;

    const sub = confirmedRecord(pending);
    await this.kv.put(SUB_PREFIX + sub.email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    await this.kv.delete?.(CONFIRM_PREFIX + token).catch(() => undefined);
    if (sub.active) {
      await this.kv.put(ACTIVE_PREFIX + sub.email, sub.email).catch(() => undefined);
    }
    this.fallback.saveToMemory(sub);
    return sub;
  }

  async recordConfirmationMail(email: string, at: Date): Promise<void> {
    const current = await this.getSubscriberByEmail(email);
    if (!current) return;
    const sub = withConfirmationMail(current, at);
    await this.kv.put(SUB_PREFIX + sub.email, JSON.stringify(sub)).catch(() => { /* non-fatal: in-memory fallback already saved */ });
    this.fallback.saveToMemory(sub);
  }

  async getActiveSubscriptions(): Promise<string[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.map((sub) => sub.email);
  }

  async listAlertSubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.alerts);
  }

  async listWeeklySubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.weekly);
  }

  async listActiveSubscribers(): Promise<Subscriber[]> {
    if (!this.kv.list) {
      return this.fallback.listActiveSubscribers();
    }

    const subscribers: Subscriber[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: ACTIVE_PREFIX, cursor, limit: 1000 });
      const candidateEmails = page.keys
        .map((key) => key.name.slice(ACTIVE_PREFIX.length))
        .filter(Boolean);

      /* One bulk read per hundred records. The per-email read this replaced also rewrote
         each subscriber's token and active index keys on every listing — a repair that
         belongs to the single-record read, not to the weekly fan-out. */
      const raws = await readKvValues(this.kv, candidateEmails.map((email) => SUB_PREFIX + email));

      for (const raw of raws) {
        if (!raw) continue;
        let sub: Subscriber | null = null;
        try {
          sub = hydrateSubscriber(JSON.parse(raw));
        } catch {
          continue;
        }
        if (sub?.active && sub.verified) {
          this.fallback.saveToMemory(sub);
          subscribers.push(sub);
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    return subscribers;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const raw = await this.kv.get(SUB_PREFIX + normalized);
    if (raw) {
      const sub = hydrateSubscriber(JSON.parse(raw));
      // A record with no email or token is unusable; fall through to the in-memory copy
      // rather than reindexing junk into the token and active keyspaces.
      if (!sub) return this.fallback.getByEmail(normalized);
      await this.kv.put(TOKEN_PREFIX + sub.token, normalized).catch(() => undefined);
      if (sub.active && sub.verified) {
        await this.kv.put(ACTIVE_PREFIX + normalized, normalized).catch(() => undefined);
      }
      this.fallback.saveToMemory(sub);
      return sub;
    }
    return this.fallback.getByEmail(normalized);
  }

  async getSubscriberByToken(token: string): Promise<Subscriber | null> {
    const email = await this.kv.get(TOKEN_PREFIX + token);
    if (!email) return this.fallback.getByToken(token);
    return this.getSubscriberByEmail(email);
  }

  backendStatus(): "durable" {
    return "durable";
  }
}

class InMemorySubscriberStore implements SubscriberStore {
  private readonly byEmail = new Map<string, Subscriber>();
  private readonly byToken = new Map<string, string>();
  /* Never pruned: `confirms` checks the record's current link, so an entry for a
     retired one finds the record and is refused. */
  private readonly byConfirmToken = new Map<string, string>();

  saveToMemory(sub: Subscriber): void {
    this.byEmail.set(sub.email, sub);
    this.byToken.set(sub.token, sub.email);
    if (sub.confirmToken) this.byConfirmToken.set(sub.confirmToken, sub.email);
  }

  /** A record by its confirm link or its permanent token. */
  getByAnyToken(token: string): Subscriber | null {
    const email = this.byConfirmToken.get(token) ?? this.byToken.get(token);
    return email ? this.byEmail.get(email) ?? null : null;
  }

  getByEmail(email: string): Subscriber | null {
    return this.byEmail.get(email) ?? null;
  }

  getByToken(token: string): Subscriber | null {
    const email = this.byToken.get(token);
    if (!email) return null;
    return this.byEmail.get(email) ?? null;
  }

  async listActiveSubscribers(): Promise<Subscriber[]> {
    const subscribers: Subscriber[] = [];
    for (const sub of this.byEmail.values()) {
      if (sub.active && sub.verified) subscribers.push(sub);
    }
    return subscribers;
  }

  async listAlertSubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.alerts);
  }

  async listWeeklySubscribers(): Promise<Subscriber[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.filter((sub) => sub.weekly);
  }

  async subscribe(email: string, options?: SubscribeOptions): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error("Invalid email address");

    const existing = this.byEmail.get(normalized);
    const sub = existing ? applySubscribeRequest(existing, options, new Date()) : newSubscriber(normalized, options, new Date());
    this.saveToMemory(sub);
    return sub;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const email = this.byToken.get(token);
    if (!email) return false;
    const sub = this.byEmail.get(email);
    if (!sub) return false;
    this.saveToMemory({ ...withoutPending(sub), active: false });
    return true;
  }

  async getPendingConfirmation(token: string): Promise<Subscriber | null> {
    const sub = this.getByAnyToken(token);
    return sub && confirms(sub, token, Date.now()) ? sub : null;
  }

  async verifyEmail(token: string): Promise<Subscriber | null> {
    const pending = await this.getPendingConfirmation(token);
    if (!pending) return null;
    const sub = confirmedRecord(pending);
    this.saveToMemory(sub);
    return sub;
  }

  async recordConfirmationMail(email: string, at: Date): Promise<void> {
    const current = this.byEmail.get(email);
    if (current) this.saveToMemory(withConfirmationMail(current, at));
  }

  async getActiveSubscriptions(): Promise<string[]> {
    const subscribers = await this.listActiveSubscribers();
    return subscribers.map((sub) => sub.email);
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    return this.getByEmail(email);
  }

  async getSubscriberByToken(token: string): Promise<Subscriber | null> {
    return this.getByToken(token);
  }

  backendStatus(): "local-fallback" {
    return "local-fallback";
  }
}

const getKvBinding = (): KvNamespaceLike | null => {
  const binding =
    (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function") {
    return null;
  }
  return binding;
};

let sharedStore: SubscriberStore | null = null;

export const getSubscriberStore = (): SubscriberStore => {
  if (!sharedStore) {
    const kv = getKvBinding();
    sharedStore = kv ? new KvSubscriberStore(kv) : new InMemorySubscriberStore();
  }
  return sharedStore;
};

export const resetSubscriberStore = (): SubscriberStore => {
  const kv = getKvBinding();
  sharedStore = kv ? new KvSubscriberStore(kv) : new InMemorySubscriberStore();
  return sharedStore;
};
