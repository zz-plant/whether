import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import {
  describePlanLineCrossing,
  evaluatePlanLineCrossings,
  parsePlanLines,
  type PlanLines,
} from "../lib/alert/planLines";
import { deliverAlerts } from "../lib/alert/alertDelivery";
import { publishedScoreLines, evaluateAlert } from "../lib/alert/alertEvaluator";
import { describeSubscription } from "../lib/email/subscriptionFlow";
import { resetSubscriberStore, type SubscriberStore } from "../lib/email/subscriberStore";
import type { KvNamespace } from "../lib/runtime/kv";

/*
 * A plan's own lines (2026-10-01). The guidance moves a few times a year, so the
 * use that fits is lines agreed when a plan is made and an email the day one is
 * crossed. These pin the three promises the /operate step makes: the lines are
 * judged the way a published rule is (any pause condition, every resume
 * condition), they take effect only once the address confirms, and the email
 * goes out on the day one starts to hold, once.
 */

const HIRING: PlanLines = {
  area: "hiring",
  pause: [
    { metric: "tightness", operator: ">", value: 72 },
    { metric: "riskAppetite", operator: "<", value: 40 },
  ],
  resume: [
    { metric: "tightness", operator: "<", value: 60 },
    { metric: "riskAppetite", operator: ">", value: 55 },
  ],
};

describe("parsing plan lines", () => {
  it("accepts a rule-shaped set and refuses anything a reader could believe is watched and is not", () => {
    assert.deepEqual(parsePlanLines([HIRING]), [HIRING]);
    assert.deepEqual(parsePlanLines([]), [], "an empty list clears the lines");
    assert.equal(parsePlanLines([HIRING, HIRING]), null, "one entry per area");
    assert.equal(parsePlanLines([{ ...HIRING, area: "marketing" }]), null);
    assert.equal(parsePlanLines([{ ...HIRING, pause: [{ metric: "tightness", operator: ">", value: 140 }] }]), null);
    assert.equal(parsePlanLines([{ ...HIRING, resume: [] }]), null);
    assert.equal(parsePlanLines("hiring"), null);
  });
});

describe("judging plan lines", () => {
  it("fires when the pause starts holding on any of its conditions", () => {
    const crossings = evaluatePlanLineCrossings([HIRING], { tightness: 74, riskAppetite: 50 }, { tightness: 70, riskAppetite: 50 });
    assert.deepEqual(crossings.map((crossing) => crossing.side), ["pause"]);
  });

  it("stays quiet while a pause that already held still holds, and without a previous reading", () => {
    assert.deepEqual(evaluatePlanLineCrossings([HIRING], { tightness: 80, riskAppetite: 50 }, { tightness: 74, riskAppetite: 50 }), []);
    assert.deepEqual(evaluatePlanLineCrossings([HIRING], { tightness: 80, riskAppetite: 50 }, null), []);
  });

  it("fires the resume only when every resume condition holds", () => {
    assert.deepEqual(
      evaluatePlanLineCrossings([HIRING], { tightness: 58, riskAppetite: 50 }, { tightness: 62, riskAppetite: 50 }),
      [],
      "funding pressure alone is half the resume",
    );
    const both = evaluatePlanLineCrossings([HIRING], { tightness: 58, riskAppetite: 57 }, { tightness: 58, riskAppetite: 50 });
    assert.deepEqual(both.map((crossing) => crossing.side), ["resume"]);
  });

  it("writes the email in the reader's terms: their area, their line, today's scores", () => {
    const [crossing] = evaluatePlanLineCrossings([HIRING], { tightness: 74, riskAppetite: 50 }, { tightness: 70, riskAppetite: 50 });
    const { headline, body } = describePlanLineCrossing(crossing, { tightness: 74, riskAppetite: 50 });
    assert.equal(headline, "Hiring: your pause line was crossed");
    assert.match(body, /pause if Funding pressure > 72 or Risk appetite < 40/);
    assert.match(body, /Funding pressure is 74 and risk appetite 50 today/);
  });
});

describe("a crossing at the reader's own runway", () => {
  /* Every company on the published lines is emailed the same day. The lines are
     shared on purpose; what a company does about a crossing is not, so the email
     says what it means at the band the reader set, and dates the band. */
  const [crossing] = evaluatePlanLineCrossings([HIRING], { tightness: 74, riskAppetite: 50 }, { tightness: 70, riskAppetite: 50 });
  const today = { tightness: 74, riskAppetite: 50 };

  it("adds the note this guidance carries for the area at that band", () => {
    const { body } = describePlanLineCrossing(crossing, today, {
      regime: "DEFENSIVE",
      runway: { band: "critical", setOn: "2026-10-01T12:00:00.000Z" },
    });
    assert.match(body, /With less than 6 months of runway, the hiring pause is what protects the runway/);
    assert.match(body, /\(Your runway band, set on Oct 1, 2026\.\)$/);
  });

  it("falls back to the band's own stance where the band has no note for the area", () => {
    const { body } = describePlanLineCrossing(crossing, today, {
      regime: "DEFENSIVE",
      runway: { band: "balanced", setOn: "2026-10-01T12:00:00.000Z" },
    });
    assert.match(body, /With 12–24 months of runway, the band you set on Oct 1, 2026: follow the guidance\.$/);
  });

  it("says nothing about runway to a reader who set none", () => {
    const { body } = describePlanLineCrossing(crossing, today, { regime: "DEFENSIVE" });
    assert.doesNotMatch(body, /runway/);
  });
});

class FakeKv implements KvNamespace {
  readonly entries = new Map<string, string>();
  async get(key: string) {
    return this.entries.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.entries.set(key, value);
  }
  async delete(key: string) {
    this.entries.delete(key);
  }
  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix ?? "";
    return { keys: [...this.entries.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
  }
}

let store: SubscriberStore;
let kv: FakeKv;

beforeEach(() => {
  kv = new FakeKv();
  Object.assign(globalThis, { WHETHER_DURABLE_KV: kv });
  store = resetSubscriberStore();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
});

describe("storing plan lines", () => {
  it("holds requested lines until the address confirms, so nobody sets lines on someone else's inbox", async () => {
    const first = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING] });
    assert.deepEqual(first.planLines, []);
    assert.deepEqual(first.pendingPlanLines, [HIRING]);
    assert.equal(first.weekly, false, "a record made only to watch lines asked for no Monday email");
    assert.match(describeSubscription(first), /lines you set is crossed \(hiring pauses if Funding pressure > 72 or Risk appetite < 40 and resumes when/);

    await store.verifyEmail(first.confirmToken ?? "");
    const confirmed = await store.getSubscriberByEmail("ops@example.com");
    assert.deepEqual(confirmed?.planLines, [HIRING]);
    assert.equal(confirmed?.pendingPlanLines, undefined);

    const moved: PlanLines = { ...HIRING, pause: [{ metric: "tightness", operator: ">", value: 90 }] };
    await store.subscribe("ops@example.com", { planLines: [moved] });
    const unconfirmed = await store.getSubscriberByEmail("ops@example.com");
    assert.deepEqual(unconfirmed?.planLines, [HIRING], "a second request does not replace confirmed lines");
    assert.deepEqual(unconfirmed?.pendingPlanLines, [moved]);
  });
});

describe("storing the runway band beside the lines", () => {
  it("holds the band with the lines until the inbox confirms, and names it in the promise", async () => {
    const first = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING], runwayBand: "tight" });
    assert.equal(first.planRunway, undefined);
    assert.equal(first.pendingPlanRunway?.band, "tight");
    assert.match(describeSubscription({ ...first, pendingPlanLines: first.pendingPlanLines, planRunway: first.pendingPlanRunway }), /with what it means at 6–12 months of runway/);

    await store.verifyEmail(first.confirmToken ?? "");
    const confirmed = await store.getSubscriberByEmail("ops@example.com");
    assert.equal(confirmed?.planRunway?.band, "tight");
    assert.equal(confirmed?.pendingPlanRunway, undefined);
  });

  it("replaces the band with the lines, and clears it when new lines come without one", async () => {
    const first = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING], runwayBand: "tight" });
    await store.verifyEmail(first.confirmToken ?? "");
    const again = await store.subscribe("ops@example.com", { planLines: [HIRING] });
    assert.equal((await store.getSubscriberByEmail("ops@example.com"))?.planRunway?.band, "tight", "unconfirmed, nothing changes");
    await store.verifyEmail(again.confirmToken ?? "");
    assert.equal((await store.getSubscriberByEmail("ops@example.com"))?.planRunway, undefined, "the old band described the old lines");
  });

  it("asks to confirm the same lines with a new band, and nothing for the same lines and band", async () => {
    const first = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING], runwayBand: "tight" });
    await store.verifyEmail(first.confirmToken ?? "");
    const same = await store.subscribe("ops@example.com", { planLines: [HIRING], runwayBand: "tight" });
    assert.equal(same.pendingPlanLines, undefined, "nothing to confirm");
    const newBand = await store.subscribe("ops@example.com", { planLines: [HIRING], runwayBand: "critical" });
    assert.equal(newBand.pendingPlanRunway?.band, "critical", "a different band is a change to what the email says");
  });

  it("keeps no band without lines, and reads a stored band it does not know as none", async () => {
    const bare = await store.subscribe("ops@example.com", { alerts: true, runwayBand: "critical" });
    assert.equal(bare.pendingPlanRunway, undefined);
    const raw = JSON.parse(kv.entries.get("email:sub:ops@example.com") ?? "{}");
    kv.entries.set("email:sub:ops@example.com", JSON.stringify({ ...raw, planRunway: { band: "18 months", setOn: "2026-10-01" } }));
    assert.equal((await store.getSubscriberByEmail("ops@example.com"))?.planRunway, undefined);
  });
});

describe("delivering plan-line alerts", () => {
  it("mails a subscriber the day their own line is crossed, on a day no published line was, and once", async () => {
    const subscriber = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING] });
    await store.verifyEmail(subscriber.confirmToken ?? "");
    // The published state already sits at today's scores, so nothing published fires.
    kv.entries.set("alert:state", JSON.stringify({ regime: "VOLATILE", tightness: 74, riskAppetite: 50, lastSentAt: "2026-01-01T00:00:00.000Z" }));
    const conditions = {
      regime: "VOLATILE",
      tightness: 74,
      riskAppetite: 50,
      posture: "Hold irreversible moves.",
      recordDate: "2026-09-29",
      previousScores: { tightness: 70, riskAppetite: 50 },
    };

    const first = await deliverAlerts(conditions);
    assert.equal(first.alerts.length, 0, "no published line was crossed");
    assert.equal(first.sent, 1, "the subscriber's own pause line was");

    const second = await deliverAlerts(conditions);
    assert.equal(second.sent, 0);
    assert.equal(second.skipped, 1, "one email per area and side a week");
  });
  it("tells a subscriber what the crossing means at the runway band they set", async () => {
    const subscriber = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING], runwayBand: "critical" });
    await store.verifyEmail(subscriber.confirmToken ?? "");
    kv.entries.set("alert:state", JSON.stringify({ regime: "DEFENSIVE", tightness: 74, riskAppetite: 50, lastSentAt: "2026-01-01T00:00:00.000Z" }));
    const sentBodies: string[] = [];
    Object.assign(globalThis, { EMAIL: { send: async (message: { text: string }) => { sentBodies.push(message.text); } } });
    try {
      await deliverAlerts({
        regime: "DEFENSIVE",
        tightness: 74,
        riskAppetite: 50,
        posture: "Hold irreversible moves.",
        recordDate: "2026-09-29",
        previousScores: { tightness: 70, riskAppetite: 50 },
      });
    } finally {
      Reflect.deleteProperty(globalThis, "EMAIL");
    }
    assert.equal(sentBodies.length, 1);
    assert.match(sentBodies[0], /With less than 6 months of runway, the hiring pause is what protects the runway/);
  });
});

describe("published-line alerts", () => {
  it("watch the lines the rules use, not fixed marks, and name one line per score per move", () => {
    const values = publishedScoreLines().map((line) => `${line.metric}:${line.kind}:${line.value}`);
    assert.deepEqual(values, [
      "tightness:pause:76",
      "tightness:change:70",
      "tightness:resume:66",
      "riskAppetite:pause:44",
      "riskAppetite:change:50",
      "riskAppetite:resume:54",
    ]);

    // 63 → 90 passes 66, 70 and 76: one letter, about the pause line.
    const decisions = evaluateAlert(
      { regime: "SCARCITY", tightness: 90, riskAppetite: 56, posture: "", recordDate: "2026-09-29" },
      { regime: "SCARCITY", tightness: 63, riskAppetite: 56, lastSentAt: "2026-01-01T00:00:00.000Z" },
    ).filter((decision) => decision.type === "threshold");
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].line?.kind, "pause");
    assert.equal(decisions[0].line?.value, 76);

    // 75 is no longer a line: a move from 74 to 75.5 says nothing.
    const quiet = evaluateAlert(
      { regime: "SCARCITY", tightness: 75.5, riskAppetite: 56, posture: "", recordDate: "2026-09-29" },
      { regime: "SCARCITY", tightness: 74, riskAppetite: 56, lastSentAt: "2026-01-01T00:00:00.000Z" },
    ).filter((decision) => decision.type === "threshold");
    assert.deepEqual(quiet, []);
  });
});

describe("the /operate step", () => {
  it("starts from the published lines, so an unmoved form watches what the guidance prints", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { PlanLinesForm } = await import("../app/operate/components/planLinesForm");
    const { buildCanonicalBoundedDecisionRules } = await import("../lib/report/boundedDecisionRules");
    const { planLinesFromRules } = await import("../lib/alert/planLines");

    const defaults = planLinesFromRules(buildCanonicalBoundedDecisionRules({
      regime: "SCARCITY",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: { tightness: 90, riskAppetite: 44 },
    }));
    assert.equal(defaults.length, 5, "every area has numeric lines to start from");
    const hiring = defaults.find((line) => line.area === "hiring");
    assert.deepEqual(hiring?.pause.map((condition) => `${condition.metric}${condition.operator}${condition.value}`), ["tightness>76", "riskAppetite<44"]);

    const html = renderToStaticMarkup(createElement(PlanLinesForm, { defaults }));
    for (const label of ["Hiring", "Roadmap", "Fundraising", "Spending", "New bets"]) {
      assert.ok(html.includes(label), `${label} missing from the form`);
    }
    assert.ok(html.includes('value="76"'), "the published pause line is the starting value");
    assert.match(html, /Email me when a line is crossed/);
  });

  it("refuses malformed lines whole rather than storing part of them", async () => {
    const { POST } = await import("../app/api/email/subscribe/route");
    const response = await POST(new Request("https://whether.test/api/email/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ops@example.com", planLines: [{ area: "hiring", pause: [], resume: [] }] }),
    }));
    assert.equal(response.status, 400);
    assert.equal(await store.getSubscriberByEmail("ops@example.com"), null, "nothing was stored");
  });
});
