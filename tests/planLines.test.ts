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
    assert.match(describeSubscription(first), /lines you set for hiring is crossed/);

    await store.verifyEmail(first.token);
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

describe("delivering plan-line alerts", () => {
  it("mails a subscriber the day their own line is crossed, on a day no published line was, and once", async () => {
    const subscriber = await store.subscribe("ops@example.com", { alerts: true, planLines: [HIRING] });
    await store.verifyEmail(subscriber.token);
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
